"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, Trophy } from "lucide-react";
import { pauseUserChallenge, resumeUserChallenge } from "@/app/actions/admin";

interface ChallengeEntry {
    id: string;
    user_id: string;
    valid_referrals: number;
    status: string;
    started_at: string;
    ends_at: string;
    profiles?: { id: string; phone: string; full_name: string | null };
}

interface Props {
    challenges: ChallengeEntry[];
}

export function AdminChallengesList({ challenges }: Props) {
    const [list, setList] = useState(challenges);
    const [processing, setProcessing] = useState<string | null>(null);
    const router = useRouter();

    const handlePause = async (id: string) => {
        setProcessing(id);
        await pauseUserChallenge(id);
        setList((prev) => prev.map((c) => (c.id === id ? { ...c, status: "paused" } : c)));
        setProcessing(null);
        router.refresh();
    };

    const handleResume = async (id: string) => {
        setProcessing(id);
        await resumeUserChallenge(id);
        setList((prev) => prev.map((c) => (c.id === id ? { ...c, status: "active" } : c)));
        setProcessing(null);
        router.refresh();
    };

    const getStatusBadge = (status: string) => {
        const cls = {
            active: "badge-success",
            completed: "badge-info",
            expired: "badge-warning",
            paused: "badge-danger",
        }[status] ?? "badge-warning";
        return <span className={`badge ${cls}`}>{status}</span>;
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
                <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700 }}>
                    <span className="gradient-text">Challenges</span>
                </h1>
                <span className="badge badge-info">
                    {list.filter((c) => c.status === "active").length} active
                </span>
            </div>

            <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table className="data-table" style={{ minWidth: "650px" }}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Referrals</th>
                                <th>Status</th>
                                <th>Started</th>
                                <th>Ends</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((c) => (
                                <tr key={c.id}>
                                    <td>
                                        <div style={{ minWidth: 0 }}>
                                            <p style={{ fontWeight: 500, fontSize: "13px", whiteSpace: "nowrap" }}>
                                                {(c.profiles as { full_name: string | null })?.full_name || "Unknown"}
                                            </p>
                                            <p style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                {(c.profiles as { phone: string })?.phone}
                                            </p>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <Trophy size={14} color="var(--brand-primary)" />
                                            <span style={{ fontWeight: 700, fontSize: "15px" }}>
                                                {c.valid_referrals}
                                            </span>
                                            <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                                                / 100
                                            </span>
                                        </div>
                                    </td>
                                    <td>{getStatusBadge(c.status)}</td>
                                    <td style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }} suppressHydrationWarning>
                                        {new Date(c.started_at).toLocaleString()}
                                    </td>
                                    <td style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }} suppressHydrationWarning>
                                        {new Date(c.ends_at).toLocaleString()}
                                    </td>
                                    <td>
                                        {c.status === "active" && (
                                            <button
                                                className="btn-danger"
                                                onClick={() => handlePause(c.id)}
                                                disabled={processing === c.id}
                                                style={{ padding: "6px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
                                            >
                                                <Pause size={12} /> Pause
                                            </button>
                                        )}
                                        {c.status === "paused" && (
                                            <button
                                                className="btn-primary"
                                                onClick={() => handleResume(c.id)}
                                                disabled={processing === c.id}
                                                style={{ padding: "6px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", whiteSpace: "nowrap" }}
                                            >
                                                <Play size={12} /> Resume
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
