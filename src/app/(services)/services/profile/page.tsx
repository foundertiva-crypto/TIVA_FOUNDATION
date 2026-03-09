import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { User, Phone, Shield, Calendar } from "lucide-react";

export default async function ProfilePage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    const joinDate = profile?.created_at
        ? new Date(profile.created_at).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
          })
        : "—";

    return (
        <div style={{ maxWidth: "700px" }}>
            <h1
                style={{
                    fontSize: "clamp(24px, 4vw, 32px)",
                    fontWeight: 800,
                    marginBottom: "8px",
                    color: "var(--text-primary)",
                }}
            >
                Your Profile
            </h1>
            <p
                style={{
                    color: "var(--text-secondary)",
                    fontSize: "15px",
                    marginBottom: "32px",
                }}
            >
                Manage your personal information and account settings.
            </p>

            <div className="glass-card" style={{ padding: "32px" }}>
                {/* Avatar */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "20px",
                        marginBottom: "32px",
                        paddingBottom: "24px",
                        borderBottom: "1px solid var(--border-subtle)",
                    }}
                >
                    <div
                        style={{
                            width: "72px",
                            height: "72px",
                            borderRadius: "50%",
                            background: "var(--gradient-brand)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                        }}
                    >
                        <User size={32} color="white" />
                    </div>
                    <div>
                        <h2
                            style={{
                                fontSize: "22px",
                                fontWeight: 700,
                                color: "var(--text-primary)",
                                marginBottom: "4px",
                            }}
                        >
                            {profile?.full_name || "User"}
                        </h2>
                        <span
                            className="badge badge-info"
                            style={{ fontSize: "11px" }}
                        >
                            {profile?.role || "member"}
                        </span>
                    </div>
                </div>

                {/* Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <Phone size={18} style={{ color: "var(--brand-primary)", flexShrink: 0 }} />
                        <div>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                                Phone
                            </p>
                            <p style={{ fontSize: "15px", color: "var(--text-primary)" }}>
                                {profile?.phone || "—"}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <Shield size={18} style={{ color: "var(--brand-success)", flexShrink: 0 }} />
                        <div>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                                KYC Status
                            </p>
                            <p style={{ fontSize: "15px", color: "var(--text-primary)" }}>
                                {profile?.kyc_status === "approved"
                                    ? "✅ Verified"
                                    : profile?.kyc_status === "pending"
                                    ? "🕐 Pending Review"
                                    : "Not Submitted"}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <Calendar size={18} style={{ color: "var(--brand-secondary)", flexShrink: 0 }} />
                        <div>
                            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                                Member Since
                            </p>
                            <p style={{ fontSize: "15px", color: "var(--text-primary)" }}>
                                {joinDate}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
