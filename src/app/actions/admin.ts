"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { cached } from "@/lib/cache";

export async function getUsers(page = 1, pageSize = 20) {
    const admin = createAdminClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await admin
        .from("profiles")
        .select("*, kyc_documents!kyc_documents_user_id_fkey(status)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("getUsers error:", error.message);
        return { users: [], total: 0, page, pageSize };
    }
    return { users: data ?? [], total: count ?? 0, page, pageSize };
}

export async function getPendingKyc() {
    const admin = createAdminClient();

    const { data, error } = await admin
        .from("kyc_documents")
        .select("*, profiles!kyc_documents_user_id_fkey(id, phone, full_name)")
        .eq("status", "pending")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("getPendingKyc error:", error.message);
        return [];
    }
    return data ?? [];
}

export async function flagUser(userId: string, flagged: boolean) {
    const admin = createAdminClient();

    const { error } = await admin
        .from("profiles")
        .update({ is_flagged: flagged })
        .eq("id", userId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function getFlaggedUsers() {
    const admin = createAdminClient();

    const { data, error } = await admin
        .from("profiles")
        .select("*")
        .eq("is_flagged", true)
        .order("updated_at", { ascending: false });

    if (error) throw error;
    return data;
}

export async function getDuplicateDevices() {
    const admin = createAdminClient();

    const { data, error } = await admin
        .rpc("get_duplicate_devices");

    if (error) {
        // Fallback if RPC doesn't exist
        const { data: profiles } = await admin
            .from("profiles")
            .select("device_fingerprint, id, phone, full_name")
            .not("device_fingerprint", "is", null);

        // Group by fingerprint
        type ProfileEntry = { device_fingerprint: string | null; id: string; phone: string; full_name: string | null };
        const groups = new Map<string, ProfileEntry[]>();
        (profiles ?? []).forEach((p) => {
            const fp = p.device_fingerprint;
            if (!fp) return;
            if (!groups.has(fp)) groups.set(fp, []);
            groups.get(fp)!.push(p);
        });

        // Return only duplicates
        const duplicates: ProfileEntry[] = [];
        groups.forEach((users) => {
            if (users.length > 1) duplicates.push(...users);
        });

        return duplicates;
    }

    return data;
}

export async function updateRewardTier(
    rewardId: string,
    updates: { label?: string; amount?: number; threshold?: number; is_active?: boolean }
) {
    const admin = createAdminClient();

    const { error } = await admin
        .from("rewards")
        .update(updates)
        .eq("id", rewardId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function getRewardTiers() {
    return cached("reward-tiers", 300, async () => {
        const admin = createAdminClient();

        const { data, error } = await admin
            .from("rewards")
            .select("*")
            .order("threshold", { ascending: true });

        if (error) throw error;
        return data;
    });
}

export async function pauseUserChallenge(challengeId: string) {
    const admin = createAdminClient();

    const { error } = await admin
        .from("user_challenges")
        .update({ status: "paused" })
        .eq("id", challengeId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function resumeUserChallenge(challengeId: string) {
    const admin = createAdminClient();

    const { error } = await admin
        .from("user_challenges")
        .update({ status: "active" })
        .eq("id", challengeId);

    if (error) return { error: error.message };
    return { success: true };
}

export async function getAllChallenges() {
    const admin = createAdminClient();

    const { data, error } = await admin
        .from("user_challenges")
        .select("*, profiles(id, phone, full_name)")
        .order("started_at", { ascending: false });

    if (error) throw error;
    return data;
}

export async function getLeaderboard() {
    return cached("leaderboard", 60, async () => {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("user_challenges")
            .select("user_id, valid_referrals, profiles(full_name)")
            .eq("status", "active")
            .order("valid_referrals", { ascending: false })
            .limit(50);

        if (error) throw error;

        return (data ?? []).map((entry, index) => ({
            user_id: entry.user_id,
            full_name: (entry.profiles as unknown as { full_name: string })?.full_name ?? "Anonymous",
            valid_referrals: entry.valid_referrals,
            rank: index + 1,
        }));
    });
}
