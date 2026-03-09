"use client";

import { Users, Trophy, Link2, Star, Clock, Target } from "lucide-react";
import { useChallenge, formatCountdown } from "@/hooks/useChallenge";
import type { Profile, UserChallenge, Reward } from "@/types/database";

interface Props {
    profile: Profile | null;
    challenge: UserChallenge | null;
    totalReferrals: number;
    validReferrals: number;
    rewards: Reward[];
}

export function DashboardOverview({
    profile,
    challenge,
    totalReferrals,
    validReferrals,
    rewards,
}: Props) {
    const { timeRemaining, progress } = useChallenge(challenge);

    const stats = [
        {
            label: "Total Referrals",
            value: totalReferrals,
            icon: Users,
            color: "#6C5CE7",
        },
        {
            label: "Valid Referrals",
            value: validReferrals,
            icon: Star,
            color: "#00E676",
        },
        {
            label: "Challenge Progress",
            value: `${challenge?.valid_referrals ?? 0}/100`,
            icon: Target,
            color: "#00D2FF",
        },
        {
            label: "Time Remaining",
            value: challenge?.status === "active" ? formatCountdown(timeRemaining) : "—",
            icon: Clock,
            color: "#FFD93D",
        },
    ];

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700, marginBottom: "4px" }}>
                    Welcome back, <span className="gradient-text">{profile?.full_name || "Champion"}</span>
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                    Your referral code:{" "}
                    <code
                        style={{
                            background: "var(--bg-elevated)",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontWeight: 600,
                            color: "var(--brand-primary)",
                        }}
                    >
                        {profile?.referral_code}
                    </code>
                </p>
            </div>

            {/* Stats grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                    gap: "12px",
                    marginBottom: "24px",
                }}
            >
                {stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div key={stat.label} className="stat-card">
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: "10px",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        color: "var(--text-secondary)",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                    }}
                                >
                                    {stat.label}
                                </span>
                                <div
                                    style={{
                                        width: "32px",
                                        height: "32px",
                                        borderRadius: "var(--radius-sm)",
                                        background: `${stat.color}15`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                    }}
                                >
                                    <Icon size={16} color={stat.color} />
                                </div>
                            </div>
                            <p
                                style={{
                                    fontSize: "clamp(22px, 4vw, 28px)",
                                    fontWeight: 800,
                                    color: "var(--text-primary)",
                                }}
                            >
                                {stat.value}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Challenge progress */}
            {challenge && challenge.status === "active" && (
                <div className="glass-card" style={{ padding: "20px", marginBottom: "20px" }}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "16px",
                            flexWrap: "wrap",
                        }}
                    >
                        <Trophy size={20} color="var(--brand-primary)" />
                        <h2 style={{ fontSize: "16px", fontWeight: 700, flex: 1 }}>
                            24-Hour Challenge
                        </h2>
                        <span className="badge badge-success">
                            Active
                        </span>
                    </div>

                    <div className="progress-bar" style={{ height: "10px", marginBottom: "10px" }}>
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                        }}
                    >
                        <span>{challenge.valid_referrals} valid referrals</span>
                        <span>Target: 100</span>
                    </div>
                </div>
            )}

            {/* Reward tiers */}
            <div className="glass-card" style={{ padding: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                    <Link2 size={20} color="var(--brand-secondary)" />
                    <h2 style={{ fontSize: "16px", fontWeight: 700 }}>
                        Reward Tiers
                    </h2>
                </div>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
                        gap: "10px",
                    }}
                >
                    {rewards.map((reward) => {
                        const unlocked = validReferrals >= reward.threshold;
                        return (
                            <div
                                key={reward.id}
                                style={{
                                    padding: "14px",
                                    borderRadius: "var(--radius-md)",
                                    border: `1px solid ${unlocked
                                        ? "var(--brand-success)"
                                        : "var(--border-subtle)"
                                        }`,
                                    background: unlocked
                                        ? "rgba(0, 230, 118, 0.05)"
                                        : "var(--bg-secondary)",
                                    opacity: unlocked ? 1 : 0.6,
                                }}
                            >
                                <p
                                    style={{
                                        fontSize: "18px",
                                        fontWeight: 800,
                                        color: unlocked
                                            ? "var(--brand-success)"
                                            : "var(--text-primary)",
                                        marginBottom: "4px",
                                    }}
                                >
                                    {reward.threshold}
                                </p>
                                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                    {reward.label}
                                </p>
                                {unlocked && (
                                    <span className="badge badge-success" style={{ marginTop: "6px" }}>
                                        Unlocked
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
