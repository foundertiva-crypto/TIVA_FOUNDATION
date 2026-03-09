"use server";

import { createClient } from "@/lib/supabase/server";
import { buildReferralLink } from "@/lib/utils/referral";
import { getReferralStats as getStats } from "@/lib/referral-engine";
import { referralLimiter, checkRateLimit } from "@/lib/rate-limit";
import { cached } from "@/lib/cache";

export async function getReferralLink() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .single();

    if (!profile) return null;

    return {
        code: profile.referral_code,
        link: buildReferralLink(profile.referral_code),
    };
}

export async function registerWithReferral(referralCode: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // Rate limit by user ID
    const { allowed } = await checkRateLimit(referralLimiter, user.id);
    if (!allowed) {
        return { error: "Too many referral attempts. Please try again later." };
    }

    // Find referrer by code
    const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode)
        .single();

    if (!referrer) return { error: "Invalid referral code" };
    if (referrer.id === user.id) return { error: "Cannot refer yourself" };

    // Update profile with referred_by
    await supabase
        .from("profiles")
        .update({ referred_by: referrer.id })
        .eq("id", user.id);

    // Find referrer's active challenge
    const { data: activeChallenge } = await supabase
        .from("user_challenges")
        .select("id")
        .eq("user_id", referrer.id)
        .eq("status", "active")
        .limit(1)
        .single();

    // Create referral record
    const { error } = await supabase
        .from("referrals")
        .insert({
            referrer_id: referrer.id,
            referred_id: user.id,
            challenge_id: activeChallenge?.id ?? null,
            status: "pending",
        });

    if (error) {
        if (error.code === "23505") return { error: "Referral already exists" };
        return { error: error.message };
    }

    return { success: true };
}

export async function getReferralStats() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return cached(`referral-stats:${user.id}`, 30, () => getStats(user.id));
}
