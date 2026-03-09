"use server";

import { createClient } from "@/lib/supabase/server";
import {
    startChallenge as startChallengeEngine,
    getChallengeProgress as getProgressEngine,
    canRestartChallenge as canRestartEngine,
} from "@/lib/challenge-engine";
import { challengeLimiter, checkRateLimit } from "@/lib/rate-limit";

export async function startChallenge() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // Rate limit by user ID
    const { allowed } = await checkRateLimit(challengeLimiter, user.id);
    if (!allowed) {
        return { error: "Too many requests. Please try again later." };
    }

    const challenge = await startChallengeEngine(user.id);
    if (!challenge) return { error: "Cannot start challenge (active challenge or cooldown)" };

    return { success: true, challenge };
}

export async function getChallengeProgress() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    return getProgressEngine(user.id);
}

export async function restartChallenge() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // Rate limit by user ID
    const { allowed } = await checkRateLimit(challengeLimiter, user.id);
    if (!allowed) {
        return { error: "Too many requests. Please try again later." };
    }

    const { canRestart } = await canRestartEngine(user.id);
    if (!canRestart) return { error: "Cooldown period has not ended" };

    const challenge = await startChallengeEngine(user.id);
    if (!challenge) return { error: "Failed to restart challenge" };

    return { success: true, challenge };
}

export async function canRestart() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { canRestart: false, cooldownEndsAt: null };

    return canRestartEngine(user.id);
}
