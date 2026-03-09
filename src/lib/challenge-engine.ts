"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserChallenge } from "@/types/database";

/**
 * Challenge engine — manages 24-hour challenge lifecycle.
 */

export async function startChallenge(userId: string): Promise<UserChallenge | null> {
    const supabase = await createClient();

    // Get the active challenge template
    const { data: challenge } = await supabase
        .from("challenges")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .single();

    if (!challenge) return null;

    // Check if user has an active challenge
    const { data: existing } = await supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .single();

    if (existing) return existing as UserChallenge;

    // Check cooldown
    const { data: lastChallenge } = await supabase
        .from("user_challenges")
        .select("ends_at")
        .eq("user_id", userId)
        .in("status", ["completed", "expired"])
        .order("ends_at", { ascending: false })
        .limit(1)
        .single();

    if (lastChallenge) {
        const cooldownEnd = new Date(lastChallenge.ends_at);
        cooldownEnd.setHours(cooldownEnd.getHours() + challenge.cooldown_hours);
        if (new Date() < cooldownEnd) {
            return null; // Still in cooldown
        }
    }

    // Create new challenge instance
    const now = new Date();
    const endsAt = new Date(now.getTime() + challenge.duration_hours * 60 * 60 * 1000);

    const { data: newChallenge, error } = await supabase
        .from("user_challenges")
        .insert({
            user_id: userId,
            challenge_id: challenge.id,
            started_at: now.toISOString(),
            ends_at: endsAt.toISOString(),
            valid_referrals: 0,
            status: "active",
        })
        .select()
        .single();

    if (error) throw error;
    return newChallenge as UserChallenge;
}

export async function getChallengeProgress(userId: string): Promise<UserChallenge | null> {
    const supabase = await createClient();

    // First, check for expired active challenges and finalize them
    const { data: active } = await supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .single();

    if (active) {
        const endsAt = new Date(active.ends_at);
        if (new Date() > endsAt) {
            // Challenge has expired — finalize
            const finalStatus = active.valid_referrals >= 100 ? "completed" : "expired";
            await supabase
                .from("user_challenges")
                .update({ status: finalStatus })
                .eq("id", active.id);

            return { ...active, status: finalStatus } as UserChallenge;
        }
        return active as UserChallenge;
    }

    // Return the most recent challenge
    const { data: latest } = await supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    return (latest as UserChallenge) ?? null;
}

export async function canRestartChallenge(userId: string): Promise<{
    canRestart: boolean;
    cooldownEndsAt: string | null;
}> {
    const supabase = await createClient();

    const { data: challenge } = await supabase
        .from("challenges")
        .select("cooldown_hours")
        .eq("is_active", true)
        .limit(1)
        .single();

    if (!challenge) return { canRestart: false, cooldownEndsAt: null };

    const { data: lastChallenge } = await supabase
        .from("user_challenges")
        .select("ends_at, status")
        .eq("user_id", userId)
        .in("status", ["completed", "expired"])
        .order("ends_at", { ascending: false })
        .limit(1)
        .single();

    if (!lastChallenge) return { canRestart: true, cooldownEndsAt: null };

    // Check if still in active challenge
    const { data: activeChallenge } = await supabase
        .from("user_challenges")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1)
        .single();

    if (activeChallenge) return { canRestart: false, cooldownEndsAt: null };

    const cooldownEnd = new Date(lastChallenge.ends_at);
    cooldownEnd.setHours(cooldownEnd.getHours() + challenge.cooldown_hours);

    return {
        canRestart: new Date() >= cooldownEnd,
        cooldownEndsAt: cooldownEnd.toISOString(),
    };
}
