import { createAdminClient } from "@/lib/supabase/admin";
import { Users, Shield, AlertTriangle, Trophy } from "lucide-react";

export default async function AdminOverview() {
    const admin = createAdminClient();

    const [usersRes, kycRes, flaggedRes, challengeRes] = await Promise.all([
        admin.from("profiles").select("id", { count: "exact", head: true }),
        admin.from("kyc_documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
        admin.from("profiles").select("id", { count: "exact", head: true }).eq("is_flagged", true),
        admin.from("user_challenges").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    const stats = [
        { label: "Total Users", value: usersRes.count ?? 0, icon: Users, color: "#6C5CE7" },
        { label: "Pending KYC", value: kycRes.count ?? 0, icon: Shield, color: "#FFD93D" },
        { label: "Flagged Users", value: flaggedRes.count ?? 0, icon: AlertTriangle, color: "#FF6B6B" },
        { label: "Active Challenges", value: challengeRes.count ?? 0, icon: Trophy, color: "#00D2FF" },
    ];

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700, marginBottom: "24px" }}>
                <span className="gradient-text">Admin Dashboard</span>
            </h1>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
                    gap: "12px",
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
                                    marginBottom: "12px",
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: "12px",
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
                                        width: "36px",
                                        height: "36px",
                                        borderRadius: "var(--radius-sm)",
                                        background: `${stat.color}15`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Icon size={18} color={stat.color} />
                                </div>
                            </div>
                            <p
                                style={{
                                    fontSize: "clamp(24px, 6vw, 32px)",
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
        </div>
    );
}
