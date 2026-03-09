"use client";

import { useState } from "react";
import { Save, Gift } from "lucide-react";
import { updateRewardTier } from "@/app/actions/admin";

interface Reward {
    id: string;
    threshold: number;
    label: string;
    amount: number;
    reward_type: string;
    is_active: boolean;
}

interface Props {
    initialRewards: Reward[];
}

export function AdminRewardsEditor({ initialRewards }: Props) {
    const [rewards, setRewards] = useState(initialRewards);
    const [saving, setSaving] = useState<string | null>(null);
    const [message, setMessage] = useState("");

    const handleUpdate = (id: string, field: string, value: string | number | boolean) => {
        setRewards((prev) =>
            prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
        );
    };

    const handleSave = async (reward: Reward) => {
        setSaving(reward.id);
        const result = await updateRewardTier(reward.id, {
            label: reward.label,
            amount: reward.amount,
            threshold: reward.threshold,
            is_active: reward.is_active,
        });
        if (result.error) {
            setMessage(`Error: ${result.error}`);
        } else {
            setMessage("Saved successfully!");
            setTimeout(() => setMessage(""), 2000);
        }
        setSaving(null);
    };

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700, marginBottom: "6px" }}>
                <span className="gradient-text">Reward Tiers</span>
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "20px" }}>
                Edit reward thresholds and amounts
            </p>

            {message && (
                <div
                    style={{
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        background: message.startsWith("Error") ? "rgba(255,107,107,0.1)" : "rgba(0,230,118,0.1)",
                        color: message.startsWith("Error") ? "var(--brand-accent)" : "var(--brand-success)",
                        fontSize: "13px",
                        marginBottom: "14px",
                    }}
                >
                    {message}
                </div>
            )}

            <div style={{ display: "grid", gap: "14px" }}>
                {rewards.map((reward) => (
                    <div key={reward.id} className="glass-card" style={{ padding: "20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                            <Gift size={18} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
                            <h3 style={{ fontWeight: 700, fontSize: "14px", flex: 1 }}>Tier: {reward.threshold} Referrals</h3>
                            <label
                                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", flexShrink: 0 }}
                            >
                                <input
                                    type="checkbox"
                                    checked={reward.is_active}
                                    onChange={(e) => handleUpdate(reward.id, "is_active", e.target.checked)}
                                    style={{ accentColor: "var(--brand-primary)" }}
                                />
                                Active
                            </label>
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
                                gap: "10px",
                            }}
                        >
                            <div>
                                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>
                                    Threshold
                                </label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={reward.threshold}
                                    onChange={(e) => handleUpdate(reward.id, "threshold", parseInt(e.target.value))}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>
                                    Label
                                </label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={reward.label}
                                    onChange={(e) => handleUpdate(reward.id, "label", e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase" }}>
                                    Amount (₹)
                                </label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={reward.amount}
                                    onChange={(e) => handleUpdate(reward.id, "amount", parseInt(e.target.value))}
                                />
                            </div>
                        </div>

                        <button
                            className="btn-primary"
                            onClick={() => handleSave(reward)}
                            disabled={saving === reward.id}
                            style={{ marginTop: "14px", padding: "8px 18px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
                        >
                            <Save size={14} />
                            {saving === reward.id ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
