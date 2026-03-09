"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Referral validation engine.
 * A referral is valid ONLY when the referred user has:
 * 1. OTP verified (authenticated)
 * 2. KYC approved
 * 3. Deposit completed
 * 4. Unique device fingerprint
 */

export async function validateReferral(referredUserId: string): Promise<{
    valid: boolean;
    reasons: string[];
}> {
    const supabase = await createClient();
    const reasons: string[] = [];

    // 1. Check OTP verification (user exists in auth = OTP verified)
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, device_fingerprint")
        .eq("id", referredUserId)
        .single();

    if (!profile) {
        reasons.push("User profile not found");
        return { valid: false, reasons };
    }

    // 2. Check KYC status
    const { data: kyc } = await supabase
        .from("kyc_documents")
        .select("status")
        .eq("user_id", referredUserId)
        .eq("status", "approved")
        .limit(1)
        .single();

    const kycApproved = !!kyc;
    if (!kycApproved) reasons.push("KYC not approved");

    // 3. Check deposit
    const { data: deposit } = await supabase
        .from("deposits")
        .select("id")
        .eq("user_id", referredUserId)
        .limit(1)
        .single();

    const depositCompleted = !!deposit;
    if (!depositCompleted) reasons.push("No deposit completed");

    // 4. Check device uniqueness
    let deviceUnique = true;
    if (profile.device_fingerprint) {
        const { count } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("device_fingerprint", profile.device_fingerprint)
            .neq("id", referredUserId);

        deviceUnique = (count ?? 0) === 0;
        if (!deviceUnique) reasons.push("Duplicate device detected");
    } else {
        reasons.push("Device fingerprint not recorded");
        deviceUnique = false;
    }

    const valid = kycApproved && depositCompleted && deviceUnique;

    // Update referral record
    await supabase
        .from("referrals")
        .update({
            otp_verified: true,
            kyc_approved: kycApproved,
            deposit_completed: depositCompleted,
            device_unique: deviceUnique,
            status: valid ? "valid" : "pending",
        })
        .eq("referred_id", referredUserId);

    // If valid, update the challenge progress for the referrer
    if (valid) {
        const { data: referral } = await supabase
            .from("referrals")
            .select("referrer_id, challenge_id")
            .eq("referred_id", referredUserId)
            .single();

        if (referral?.challenge_id) {
            await supabase.rpc("increment_valid_referrals", {
                p_challenge_id: referral.challenge_id,
            });
        }
    }

    return { valid, reasons };
}

export async function getReferralStats(userId: string) {
    const supabase = await createClient();

    const { data: referrals, error } = await supabase
        .from("referrals")
        .select("id, status, referred_id, otp_verified, kyc_approved, deposit_completed, device_unique, created_at")
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false });

    if (error) throw error;

    const total = referrals?.length ?? 0;
    const valid = referrals?.filter((r) => r.status === "valid").length ?? 0;
    const pending = referrals?.filter((r) => r.status === "pending").length ?? 0;

    return { referrals: referrals ?? [], total, valid, pending };
}
