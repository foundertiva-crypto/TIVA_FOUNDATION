"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Clock, Target, Zap, RotateCcw, CheckCircle } from "lucide-react";
import { useChallenge, formatCountdown } from "@/hooks/useChallenge";
import { startChallenge, restartChallenge } from "@/app/actions/challenge";
import type { UserChallenge, Reward } from "@/types/database";

interface Props {
    userId: string;
    initialChallenge: UserChallenge | null;
    rewards: Reward[];
}

export function ChallengeView({ userId, initialChallenge, rewards }: Props) {
    const { challenge, timeRemaining, isExpired, progress } =
        useChallenge(initialChallenge);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleStart = async () => {
        setLoading(true);
        await startChallenge();
        router.refresh();
        setLoading(false);
    };

    const handleRestart = async () => {
        setLoading(true);
        await restartChallenge();
        router.refresh();
        setLoading(false);
    };

    const milestones = rewards.map((r) => ({
        threshold: r.threshold,
        label: r.label,
        reached: (challenge?.valid_referrals ?? 0) >= r.threshold,
    }));

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700, marginBottom: "24px" }}>
                <span className="gradient-text">24-Hour Challenge</span>
            </h1>

            {/* No challenge — CTA */}
            {!challenge || challenge.status === "expired" || challenge.status === "completed" ? (
                <div
                    className="glass-card"
                    style={{
                        padding: "clamp(24px, 5vw, 48px)",
                        textAlign: "center",
                        maxWidth: "560px",
                        margin: "0 auto",
                    }}
                >
                    <div
                        style={{
                            width: "64px",
                            height: "64px",
                            borderRadius: "50%",
                            background: "rgba(108, 92, 231, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 20px",
                        }}
                    >
                        {challenge?.status === "completed" ? (
                            <CheckCircle size={32} color="var(--brand-success)" />
                        ) : (
                            <Trophy size={32} color="var(--brand-primary)" />
                        )}
                    </div>

                    {challenge?.status === "completed" && (
                        <div style={{ marginBottom: "16px" }}>
                            <span className="badge badge-success" style={{ fontSize: "13px", padding: "6px 14px" }}>
                                Challenge Completed! 🎉
                            </span>
                        </div>
                    )}

                    <h2 style={{ fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 700, marginBottom: "10px" }}>
                        {challenge ? "Ready for another round?" : "Start Your Challenge"}
                    </h2>
                    <p
                        style={{
                            color: "var(--text-secondary)",
                            fontSize: "14px",
                            marginBottom: "24px",
                            maxWidth: "400px",
                            margin: "0 auto 24px",
                            lineHeight: "1.6",
                        }}
                    >
                        Refer 100 users in 24 hours to earn up to ₹500 + an exclusive badge.
                        Each referral must complete OTP, KYC, and a deposit.
                    </p>
                    <button
                        className="btn-primary"
                        onClick={challenge ? handleRestart : handleStart}
                        disabled={loading}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "15px",
                        }}
                    >
                        {loading ? (
                            "Starting..."
                        ) : challenge ? (
                            <>
                                <RotateCcw size={18} /> Restart Challenge
                            </>
                        ) : (
                            <>
                                <Zap size={18} /> Start Challenge
                            </>
                        )}
                    </button>
                </div>
            ) : (
                /* Active challenge */
                <div>
                    {/* Timer card */}
                    <div
                        className="glass-card animate-pulse-glow"
                        style={{
                            padding: "clamp(24px, 5vw, 40px)",
                            textAlign: "center",
                            marginBottom: "20px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                marginBottom: "16px",
                            }}
                        >
                            <Clock size={18} color="var(--brand-warning)" />
                            <span
                                style={{
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: "var(--brand-warning)",
                                    textTransform: "uppercase",
                                    letterSpacing: "1px",
                                }}
                            >
                                Time Remaining
                            </span>
                        </div>
                        <p
                            style={{
                                fontSize: "clamp(36px, 10vw, 64px)",
                                fontWeight: 800,
                                fontFamily: "monospace",
                                color: isExpired ? "var(--brand-accent)" : "var(--text-primary)",
                                letterSpacing: "2px",
                                marginBottom: "12px",
                            }}
                        >
                            {formatCountdown(timeRemaining)}
                        </p>
                    </div>

                    {/* Progress */}
                    <div
                        className="glass-card"
                        style={{ padding: "20px", marginBottom: "20px" }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                marginBottom: "12px",
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Target size={16} color="var(--brand-primary)" />
                                <span style={{ fontWeight: 600, fontSize: "14px" }}>Progress</span>
                            </div>
                            <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                {challenge?.valid_referrals ?? 0} / 100
                            </span>
                        </div>
                        <div className="progress-bar" style={{ height: "12px" }}>
                            <div
                                className="progress-bar-fill"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Milestones */}
                    <div className="glass-card" style={{ padding: "20px" }}>
                        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>
                            Milestones
                        </h3>
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                gap: "10px",
                            }}
                        >
                            {milestones.map((m) => (
                                <div
                                    key={m.threshold}
                                    style={{
                                        padding: "14px",
                                        borderRadius: "var(--radius-md)",
                                        border: `1px solid ${m.reached ? "var(--brand-success)" : "var(--border-subtle)"
                                            }`,
                                        background: m.reached
                                            ? "rgba(0, 230, 118, 0.05)"
                                            : "var(--bg-secondary)",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "10px",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "50%",
                                            background: m.reached
                                                ? "var(--gradient-success)"
                                                : "var(--bg-elevated)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            flexShrink: 0,
                                        }}
                                    >
                                        {m.reached ? (
                                            <CheckCircle size={18} color="white" />
                                        ) : (
                                            <span
                                                style={{
                                                    fontSize: "12px",
                                                    fontWeight: 700,
                                                    color: "var(--text-muted)",
                                                }}
                                            >
                                                {m.threshold}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ fontWeight: 600, fontSize: "13px" }}>
                                            {m.threshold} referrals
                                        </p>
                                        <p
                                            style={{
                                                fontSize: "11px",
                                                color: "var(--text-secondary)",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {m.label}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
