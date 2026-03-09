import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Gift, Lock, CheckCircle } from "lucide-react";

export default async function RewardsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [rewardsRes, challengeRes, claimsRes] = await Promise.all([
        supabase.from("rewards").select("*").eq("is_active", true).order("threshold"),
        supabase
            .from("user_challenges")
            .select("valid_referrals, status")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single(),
        supabase.from("reward_claims").select("reward_id").eq("user_id", user.id),
    ]);

    const rewards = rewardsRes.data ?? [];
    const challenge = challengeRes.data;
    const claimedIds = new Set((claimsRes.data ?? []).map((c) => c.reward_id));
    const validReferrals = challenge?.valid_referrals ?? 0;

    const tierColors = ["#6C5CE7", "#00D2FF", "#FFD93D", "#00E676"];

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700, marginBottom: "24px" }}>
                <span className="gradient-text">Rewards</span>
            </h1>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                    gap: "16px",
                }}
            >
                {rewards.map((reward, i) => {
                    const unlocked = validReferrals >= reward.threshold;
                    const claimed = claimedIds.has(reward.id);
                    const color = tierColors[i % tierColors.length];

                    return (
                        <div
                            key={reward.id}
                            className="glass-card"
                            style={{
                                padding: "clamp(18px, 4vw, 28px)",
                                position: "relative",
                                overflow: "hidden",
                                borderColor: unlocked ? color : undefined,
                                opacity: unlocked ? 1 : 0.65,
                            }}
                        >
                            {/* Background accent */}
                            <div
                                style={{
                                    position: "absolute",
                                    top: "-30px",
                                    right: "-30px",
                                    width: "100px",
                                    height: "100px",
                                    borderRadius: "50%",
                                    background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
                                    pointerEvents: "none",
                                }}
                            />

                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    marginBottom: "16px",
                                }}
                            >
                                <div
                                    style={{
                                        width: "48px",
                                        height: "48px",
                                        borderRadius: "var(--radius-md)",
                                        background: unlocked ? `${color}20` : "var(--bg-elevated)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    {unlocked ? (
                                        <Gift size={24} color={color} />
                                    ) : (
                                        <Lock size={24} color="var(--text-muted)" />
                                    )}
                                </div>
                                {claimed && (
                                    <span className="badge badge-success">
                                        <CheckCircle size={12} style={{ marginRight: "4px" }} /> Claimed
                                    </span>
                                )}
                            </div>

                            <p
                                style={{
                                    fontSize: "32px",
                                    fontWeight: 800,
                                    color: unlocked ? color : "var(--text-muted)",
                                    marginBottom: "4px",
                                }}
                            >
                                {reward.threshold}
                            </p>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                                referrals needed
                            </p>
                            <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                                {reward.label}
                            </p>
                            {reward.amount > 0 && (
                                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                                    ₹{reward.amount} reward
                                </p>
                            )}

                            {/* Progress indicator */}
                            {!unlocked && (
                                <div style={{ marginTop: "16px" }}>
                                    <div className="progress-bar" style={{ height: "6px" }}>
                                        <div
                                            className="progress-bar-fill"
                                            style={{
                                                width: `${Math.min(100, (validReferrals / reward.threshold) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px" }}>
                                        {validReferrals}/{reward.threshold}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
