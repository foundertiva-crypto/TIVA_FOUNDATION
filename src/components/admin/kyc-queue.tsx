"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, FileText, ExternalLink } from "lucide-react";
import { approveKyc, rejectKyc } from "@/app/actions/kyc";

interface KycDocument {
    id: string;
    user_id: string;
    document_type: string;
    document_url: string;
    status: string;
    created_at: string;
    profiles?: { id: string; phone: string; full_name: string | null };
}

interface Props {
    documents: KycDocument[];
}

export function AdminKycQueue({ documents }: Props) {
    const [docs, setDocs] = useState(documents);
    const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState<string | null>(null);
    const router = useRouter();

    const handleApprove = async (docId: string) => {
        setProcessing(docId);
        await approveKyc(docId);
        setDocs((prev) => prev.filter((d) => d.id !== docId));
        setProcessing(null);
        router.refresh();
    };

    const handleReject = async (docId: string) => {
        const notes = rejectNotes[docId];
        if (!notes) return alert("Please provide a rejection reason");
        setProcessing(docId);
        await rejectKyc(docId, notes);
        setDocs((prev) => prev.filter((d) => d.id !== docId));
        setProcessing(null);
        router.refresh();
    };

    return (
        <div className="animate-fade-in">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
                <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700 }}>
                    <span className="gradient-text">KYC Queue</span>
                </h1>
                <span className="badge badge-warning">{docs.length} pending</span>
            </div>

            {docs.length === 0 ? (
                <div className="glass-card" style={{ padding: "40px 20px", textAlign: "center" }}>
                    <CheckCircle size={40} color="var(--brand-success)" style={{ margin: "0 auto 10px", opacity: 0.3 }} />
                    <p style={{ color: "var(--text-muted)" }}>All caught up! No pending KYC documents.</p>
                </div>
            ) : (
                <div style={{ display: "grid", gap: "14px" }}>
                    {docs.map((doc) => (
                        <div
                            key={doc.id}
                            className="glass-card"
                            style={{ padding: "20px" }}
                        >
                            {/* Content area */}
                            <div style={{ marginBottom: "14px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
                                    <FileText size={18} color="var(--brand-primary)" style={{ flexShrink: 0 }} />
                                    <div style={{ minWidth: 0 }}>
                                        <p style={{ fontWeight: 600, fontSize: "14px" }}>
                                            {(doc.profiles as { phone: string })?.phone || "Unknown"}
                                        </p>
                                        <p style={{ fontSize: "12px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {(doc.profiles as { full_name: string | null })?.full_name || "No name"}
                                            {" · "}
                                            <span style={{ textTransform: "capitalize" }}>
                                                {doc.document_type.replace("_", " ")}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <a
                                    href={doc.document_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        color: "var(--brand-secondary)",
                                        fontSize: "13px",
                                    }}
                                >
                                    <ExternalLink size={14} /> View Document
                                </a>

                                {/* Rejection notes */}
                                <div style={{ marginTop: "10px" }}>
                                    <input
                                        className="input-field"
                                        placeholder="Rejection reason (required to reject)"
                                        value={rejectNotes[doc.id] || ""}
                                        onChange={(e) =>
                                            setRejectNotes((prev) => ({ ...prev, [doc.id]: e.target.value }))
                                        }
                                        style={{ fontSize: "13px" }}
                                    />
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                <button
                                    className="btn-primary"
                                    onClick={() => handleApprove(doc.id)}
                                    disabled={processing === doc.id}
                                    style={{ padding: "8px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", flex: "1 1 auto" }}
                                >
                                    <CheckCircle size={14} /> Approve
                                </button>
                                <button
                                    className="btn-danger"
                                    onClick={() => handleReject(doc.id)}
                                    disabled={processing === doc.id}
                                    style={{ padding: "8px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", flex: "1 1 auto" }}
                                >
                                    <XCircle size={14} /> Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
