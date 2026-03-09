"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Referral } from "@/types/database";

export function useRealtimeReferrals(userId: string) {
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [validCount, setValidCount] = useState(0);

    useEffect(() => {
        const supabase = createClient();

        // Initial fetch
        supabase
            .from("referrals")
            .select("*")
            .eq("referrer_id", userId)
            .order("created_at", { ascending: false })
            .then(({ data }) => {
                if (data) {
                    setReferrals(data as Referral[]);
                    setValidCount(data.filter((r) => r.status === "valid").length);
                }
            });

        // Subscribe to real-time changes
        const channel = supabase
            .channel("referrals-realtime")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "referrals",
                    filter: `referrer_id=eq.${userId}`,
                },
                (payload) => {
                    if (payload.eventType === "INSERT") {
                        setReferrals((prev) => [payload.new as Referral, ...prev]);
                    } else if (payload.eventType === "UPDATE") {
                        setReferrals((prev) =>
                            prev.map((r) =>
                                r.id === (payload.new as Referral).id
                                    ? (payload.new as Referral)
                                    : r
                            )
                        );
                    }

                    // Recalculate valid count
                    setReferrals((prev) => {
                        setValidCount(prev.filter((r) => r.status === "valid").length);
                        return prev;
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    return { referrals, validCount, total: referrals.length };
}
