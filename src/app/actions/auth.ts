"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { authLimiter, verifyLimiter, checkRateLimit } from "@/lib/rate-limit";

async function getClientIp(): Promise<string> {
    const headersList = await headers();
    return (
        headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        headersList.get("x-real-ip") ||
        "unknown"
    );
}

export async function sendOtp(phone: string, turnstileToken?: string) {
    // 1. Verify Turnstile captcha
    if (turnstileToken) {
        const isHuman = await verifyTurnstileToken(turnstileToken);
        if (!isHuman) {
            return { error: "Captcha verification failed. Please try again." };
        }
    }

    // 2. Rate limit by IP
    const ip = await getClientIp();
    const { allowed } = await checkRateLimit(authLimiter, ip);
    if (!allowed) {
        return { error: "Too many requests. Please wait a minute before trying again." };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithOtp({
        phone,
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true };
}

export async function verifyOtp(phone: string, token: string, turnstileToken?: string) {
    // 1. Verify Turnstile captcha
    if (turnstileToken) {
        const isHuman = await verifyTurnstileToken(turnstileToken);
        if (!isHuman) {
            return { error: "Captcha verification failed. Please try again." };
        }
    }

    // 2. Rate limit by IP
    const ip = await getClientIp();
    const { allowed } = await checkRateLimit(verifyLimiter, ip);
    if (!allowed) {
        return { error: "Too many verification attempts. Please wait a minute." };
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
    });

    if (error) {
        return { error: error.message };
    }

    if (data.user) {
        // Check if profile exists, if not create one
        const { data: existingProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("id", data.user.id)
            .single();

        if (!existingProfile) {
            const { error: profileError } = await supabase
                .from("profiles")
                .insert({
                    id: data.user.id,
                    phone,
                });

            if (profileError) {
                return { error: profileError.message };
            }
        }
    }

    return { success: true, user: data.user };
}

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
}

export async function getCurrentUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    return profile;
}
