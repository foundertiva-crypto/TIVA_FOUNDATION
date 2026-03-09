"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle, Flag } from "lucide-react";
import { flagUser } from "@/app/actions/admin";

interface UserData {
    id: string;
    phone: string;
    full_name: string | null;
    referral_code: string;
    role: string;
    is_flagged: boolean;
    created_at: string;
    kyc_documents?: { status: string }[];
}

interface Props {
    initialData: {
        users: UserData[];
        total: number;
        page: number;
        pageSize: number;
    };
}

export function AdminUsersTable({ initialData }: Props) {
    const [users, setUsers] = useState(initialData.users);

    const handleFlag = async (userId: string, flagged: boolean) => {
        await flagUser(userId, flagged);
        setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, is_flagged: flagged } : u))
        );
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
                <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700 }}>
                    <span className="gradient-text">User Management</span>
                </h1>
                <span className="badge badge-info">{initialData.total} total</span>
            </div>

            <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
                <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table className="data-table" style={{ minWidth: "700px" }}>
                        <thead>
                            <tr>
                                <th>Phone</th>
                                <th>Name</th>
                                <th>Referral Code</th>
                                <th>KYC</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => {
                                const kycStatus = user.kyc_documents?.[0]?.status ?? "none";
                                return (
                                    <tr key={user.id}>
                                        <td style={{ fontWeight: 500, whiteSpace: "nowrap" }}>{user.phone}</td>
                                        <td style={{ whiteSpace: "nowrap" }}>{user.full_name || "—"}</td>
                                        <td>
                                            <code style={{ fontSize: "12px", color: "var(--brand-primary)" }}>
                                                {user.referral_code}
                                            </code>
                                        </td>
                                        <td>
                                            <span
                                                className={`badge ${kycStatus === "approved"
                                                    ? "badge-success"
                                                    : kycStatus === "pending"
                                                        ? "badge-warning"
                                                        : "badge-danger"
                                                    }`}
                                            >
                                                {kycStatus}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.role === "admin" ? "badge-info" : "badge-success"}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            {user.is_flagged ? (
                                                <span className="badge badge-danger">
                                                    <AlertTriangle size={12} style={{ marginRight: "4px" }} />
                                                    Flagged
                                                </span>
                                            ) : (
                                                <span className="badge badge-success">
                                                    <CheckCircle size={12} style={{ marginRight: "4px" }} />
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap" }} suppressHydrationWarning>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <button
                                                onClick={() => handleFlag(user.id, !user.is_flagged)}
                                                className={user.is_flagged ? "btn-secondary" : "btn-danger"}
                                                style={{ padding: "6px 12px", fontSize: "12px", whiteSpace: "nowrap" }}
                                            >
                                                <Flag size={12} style={{ marginRight: "4px" }} />
                                                {user.is_flagged ? "Unflag" : "Flag"}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
