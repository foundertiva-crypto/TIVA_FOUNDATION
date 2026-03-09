import { createHmac } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateReferral } from "@/lib/referral-engine";

/**
 * Razorpay webhook handler.
 * Verifies signature, records deposit, and triggers referral validation.
 */
export async function POST(request: NextRequest) {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    // Verify webhook signature
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !signature) {
        return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
    }

    const expectedSignature = createHmac("sha256", secret)
        .update(body)
        .digest("hex");

    if (expectedSignature !== signature) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Handle payment captured event
    if (event.event === "payment.captured") {
        const payment = event.payload.payment.entity;
        const admin = createAdminClient();

        // Extract user_id from payment notes (must be set when creating order)
        const userId = payment.notes?.user_id;
        if (!userId) {
            return NextResponse.json({ error: "Missing user_id in notes" }, { status: 400 });
        }

        // Record deposit
        const { error: depositError } = await admin
            .from("deposits")
            .upsert({
                user_id: userId,
                razorpay_payment_id: payment.id,
                razorpay_order_id: payment.order_id,
                amount: payment.amount / 100, // Razorpay sends in paise
                currency: payment.currency,
                status: "captured",
            }, {
                onConflict: "razorpay_payment_id",
            });

        if (depositError) {
            console.error("Deposit recording error:", depositError);
            return NextResponse.json({ error: "Failed to record deposit" }, { status: 500 });
        }

        // Trigger referral validation for this user
        await validateReferral(userId);

        return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "ignored" });
}
