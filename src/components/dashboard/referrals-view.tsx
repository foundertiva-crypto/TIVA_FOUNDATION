"use client";

import { useState } from "react";
import { Link2, Copy, Check, ExternalLink, Users, Star, Clock } from "lucide-react";
import { useRealtimeReferrals } from "@/hooks/useRealtimeReferrals";

interface Props {
    userId: string;
    referralCode: string;
    referralLink: string;
}

export function ReferralsView({ userId, referralCode, referralLink }: Props) {
    const { referrals, validCount, total } = useRealtimeReferrals(userId);
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700, marginBottom: "24px" }}>
                <span className="gradient-text">Your Referrals</span>
            </h1>

            {/* Referral link card */}
            <div
                className="glass-card"
                style={{ padding: "20px", marginBottom: "20px" }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "14px",
                    }}
                >
                    <Link2 size={20} color="var(--brand-primary)" />
                    <h2 style={{ fontSize: "16px", fontWeight: 700 }}>Share Your Link</h2>
                </div>

                <div
                    style={{
                        display: "flex",
                        gap: "8px",
                        marginBottom: "10px",
                        flexDirection: "row",
                        flexWrap: "wrap",
                    }}
                >
                    <input
                        readOnly
                        value={referralLink}
                        className="input-field"
                        style={{ fontSize: "13px", minWidth: 0, flex: 1 }}
                    />
                    <button
                        className="btn-primary"
                        onClick={handleCopy}
                        style={{
                            padding: "10px 16px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                        }}
                    >
                        {copied ? <Check size={16} /> : <Copy size={16} />}
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                    Referral Code: <strong>{referralCode}</strong>
                </p>
            </div>

            {/* Stats */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 120px), 1fr))",
                    gap: "10px",
                    marginBottom: "20px",
                }}
            >
                <div className="stat-card" style={{ textAlign: "center" }}>
                    <Users size={18} color="var(--brand-primary)" style={{ margin: "0 auto 6px" }} />
                    <p style={{ fontSize: "22px", fontWeight: 800 }}>{total}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Total</p>
                </div>
                <div className="stat-card" style={{ textAlign: "center" }}>
                    <Star size={18} color="var(--brand-success)" style={{ margin: "0 auto 6px" }} />
                    <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--brand-success)" }}>{validCount}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Valid</p>
                </div>
                <div className="stat-card" style={{ textAlign: "center" }}>
                    <Clock size={18} color="var(--brand-warning)" style={{ margin: "0 auto 6px" }} />
                    <p style={{ fontSize: "22px", fontWeight: 800, color: "var(--brand-warning)" }}>{total - validCount}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Pending</p>
                </div>
            </div>

            {/* Referral list */}
            <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Referral History</h3>
                </div>
                {referrals.length === 0 ? (
                    <div
                        style={{
                            padding: "40px 20px",
                            textAlign: "center",
                            color: "var(--text-muted)",
                        }}
                    >
                        <ExternalLink size={36} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                        <p>No referrals yet. Share your link to get started!</p>
                    </div>
                ) : (
                    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>OTP</th>
                                    <th>KYC</th>
                                    <th>Deposit</th>
                                    <th>Device</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {referrals.map((r) => (
                                    <tr key={r.id}>
                                        <td style={{ fontWeight: 500 }}>
                                            {r.referred_id.slice(0, 8)}...
                                        </td>
                                        <td>
                                            <span className={`badge ${r.otp_verified ? "badge-success" : "badge-warning"}`}>
                                                {r.otp_verified ? "Yes" : "No"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${r.kyc_approved ? "badge-success" : "badge-warning"}`}>
                                                {r.kyc_approved ? "Yes" : "No"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${r.deposit_completed ? "badge-success" : "badge-warning"}`}>
                                                {r.deposit_completed ? "Yes" : "No"}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${r.device_unique ? "badge-success" : "badge-danger"}`}>
                                                {r.device_unique ? "Unique" : "Dup"}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${r.status === "valid"
                                                    ? "badge-success"
                                                    : r.status === "invalid"
                                                        ? "badge-danger"
                                                        : "badge-warning"
                                                    }`}
                                            >
                                                {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
