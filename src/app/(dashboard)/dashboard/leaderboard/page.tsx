"use client";

import { Trophy, Medal, Award } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";

export default function LeaderboardPage() {
    const { entries, loading } = useLeaderboard();

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Trophy size={20} color="#FFD93D" />;
        if (rank === 2) return <Medal size={20} color="#C0C0C0" />;
        if (rank === 3) return <Award size={20} color="#CD7F32" />;
        return (
            <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-muted)" }}>
                #{rank}
            </span>
        );
    };

    const getRankStyle = (rank: number) => {
        if (rank === 1) return { borderColor: "#FFD93D", background: "rgba(255, 217, 61, 0.05)" };
        if (rank === 2) return { borderColor: "#C0C0C0", background: "rgba(192, 192, 192, 0.05)" };
        if (rank === 3) return { borderColor: "#CD7F32", background: "rgba(205, 127, 50, 0.05)" };
        return {};
    };

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700, marginBottom: "24px" }}>
                <span className="gradient-text">Leaderboard</span>
            </h1>

            <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
                {loading ? (
                    <div
                        style={{
                            padding: "48px",
                            textAlign: "center",
                            color: "var(--text-muted)",
                        }}
                    >
                        Loading leaderboard...
                    </div>
                ) : entries.length === 0 ? (
                    <div
                        style={{
                            padding: "48px",
                            textAlign: "center",
                            color: "var(--text-muted)",
                        }}
                    >
                        <Trophy size={48} style={{ margin: "0 auto 12px", opacity: 0.3 }} />
                        <p>No active challenges yet. Be the first!</p>
                    </div>
                ) : (
                    <div>
                        {entries.map((entry) => (
                            <div
                                key={entry.user_id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "12px clamp(12px, 3vw, 24px)",
                                    borderBottom: "1px solid var(--border-subtle)",
                                    transition: "background 0.2s",
                                    ...getRankStyle(entry.rank),
                                }}
                            >
                                {/* Rank */}
                                <div
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "50%",
                                        background: "var(--bg-elevated)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginRight: "16px",
                                        flexShrink: 0,
                                    }}
                                >
                                    {getRankIcon(entry.rank)}
                                </div>

                                {/* Name */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p
                                        style={{
                                            fontWeight: 600,
                                            fontSize: "14px",
                                            color: entry.rank <= 3 ? "var(--text-primary)" : "var(--text-secondary)",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {entry.full_name}
                                    </p>
                                </div>

                                {/* Count */}
                                <div style={{ textAlign: "right" }}>
                                    <p
                                        style={{
                                            fontSize: "20px",
                                            fontWeight: 800,
                                            color: "var(--brand-primary)",
                                        }}
                                    >
                                        {entry.valid_referrals}
                                    </p>
                                    <p
                                        style={{
                                            fontSize: "11px",
                                            color: "var(--text-muted)",
                                            textTransform: "uppercase",
                                        }}
                                    >
                                        referrals
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
