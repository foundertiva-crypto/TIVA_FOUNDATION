"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LeaderboardEntry } from "@/types/database";

export function useLeaderboard() {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();

        async function fetchLeaderboard() {
            const { data } = await supabase
                .from("user_challenges")
                .select("user_id, valid_referrals, profiles(full_name)")
                .eq("status", "active")
                .order("valid_referrals", { ascending: false })
                .limit(50);

            if (data) {
                const mapped: LeaderboardEntry[] = data.map((entry, index) => ({
                    user_id: entry.user_id,
                    full_name:
                        (entry.profiles as unknown as { full_name: string })?.full_name ??
                        "Anonymous",
                    valid_referrals: entry.valid_referrals,
                    rank: index + 1,
                }));
                setEntries(mapped);
            }
            setLoading(false);
        }

        fetchLeaderboard();

        // Subscribe to real-time leaderboard updates
        const channel = supabase
            .channel("leaderboard-realtime")
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "user_challenges",
                },
                () => {
                    // Re-fetch on any challenge update
                    fetchLeaderboard();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return { entries, loading };
}
