import { getFlaggedUsers, getDuplicateDevices } from "@/app/actions/admin";
import { AlertTriangle, Fingerprint } from "lucide-react";

export default async function FraudPage() {
    const [flaggedUsers, duplicateDevices] = await Promise.all([
        getFlaggedUsers(),
        getDuplicateDevices(),
    ]);

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "24px" }}>
                <span className="gradient-text">Fraud Monitor</span>
            </h1>

            {/* Flagged users */}
            <div className="glass-card" style={{ padding: "0", overflow: "hidden", marginBottom: "24px" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <AlertTriangle size={18} color="var(--brand-accent)" />
                    <h2 style={{ fontSize: "16px", fontWeight: 700 }}>
                        Flagged Users ({(flaggedUsers ?? []).length})
                    </h2>
                </div>
                {(flaggedUsers ?? []).length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                        No flagged users
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Phone</th>
                                <th>Name</th>
                                <th>Device FP</th>
                                <th>Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(flaggedUsers ?? []).map((user) => (
                                <tr key={user.id}>
                                    <td style={{ fontWeight: 500 }}>{user.phone}</td>
                                    <td>{user.full_name || "—"}</td>
                                    <td>
                                        <code style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                            {user.device_fingerprint?.slice(0, 16) || "—"}...
                                        </code>
                                    </td>
                                    <td style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Duplicate devices */}
            <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
                <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "12px" }}>
                    <Fingerprint size={18} color="var(--brand-warning)" />
                    <h2 style={{ fontSize: "16px", fontWeight: 700 }}>
                        Duplicate Devices ({(duplicateDevices ?? []).length})
                    </h2>
                </div>
                {(duplicateDevices ?? []).length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                        No duplicate devices detected
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Phone</th>
                                <th>Name</th>
                                <th>Device Fingerprint</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(duplicateDevices ?? []).map((user: { id: string; phone: string; full_name: string | null; device_fingerprint: string | null }) => (
                                <tr key={user.id}>
                                    <td style={{ fontWeight: 500 }}>{user.phone}</td>
                                    <td>{user.full_name || "—"}</td>
                                    <td>
                                        <code style={{ fontSize: "11px", color: "var(--brand-warning)" }}>
                                            {user.device_fingerprint?.slice(0, 24)}...
                                        </code>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
