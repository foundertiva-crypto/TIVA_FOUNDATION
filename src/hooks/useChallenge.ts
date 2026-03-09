"use client";

import { useEffect, useState, useCallback } from "react";
import type { UserChallenge } from "@/types/database";

interface ChallengeState {
    challenge: UserChallenge | null;
    timeRemaining: number; // milliseconds
    isExpired: boolean;
    progress: number; // 0-100 percentage
    loading: boolean;
}

export function useChallenge(initialChallenge: UserChallenge | null): ChallengeState {
    const [challenge, setChallenge] = useState<UserChallenge | null>(initialChallenge);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [loading] = useState(false);

    const calculateTimeRemaining = useCallback(() => {
        if (!challenge || challenge.status !== "active") return 0;
        const endsAt = new Date(challenge.ends_at).getTime();
        const now = Date.now();
        return Math.max(0, endsAt - now);
    }, [challenge]);

    useEffect(() => {
        setTimeRemaining(calculateTimeRemaining());

        const interval = setInterval(() => {
            const remaining = calculateTimeRemaining();
            setTimeRemaining(remaining);

            if (remaining <= 0 && challenge?.status === "active") {
                setChallenge((prev) =>
                    prev ? { ...prev, status: "expired" } : null
                );
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [challenge, calculateTimeRemaining]);

    const isExpired = timeRemaining <= 0 && challenge?.status === "active";
    const progress = challenge
        ? Math.min(100, (challenge.valid_referrals / 100) * 100)
        : 0;

    return { challenge, timeRemaining, isExpired, progress, loading };
}

/**
 * Format milliseconds to HH:MM:SS
 */
export function formatCountdown(ms: number): string {
    if (ms <= 0) return "00:00:00";
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
