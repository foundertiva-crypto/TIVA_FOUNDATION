"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle, XCircle, Clock, Shield } from "lucide-react";
import { uploadKycDocument } from "@/app/actions/kyc";
import type { KycDocument } from "@/types/database";

interface Props {
    documents: KycDocument[];
}

export function KycView({ documents }: Props) {
    const [uploading, setUploading] = useState(false);
    const [docType, setDocType] = useState("aadhaar");
    const [message, setMessage] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        const file = fileRef.current?.files?.[0];
        if (!file) return;

        setUploading(true);
        setMessage("");

        const formData = new FormData();
        formData.append("document", file);
        formData.append("documentType", docType);

        const result = await uploadKycDocument(formData);
        if (result.error) {
            setMessage(`Error: ${result.error}`);
        } else {
            setMessage("Document uploaded successfully! Awaiting review.");
        }
        setUploading(false);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "approved":
                return <CheckCircle size={18} color="var(--brand-success)" />;
            case "rejected":
                return <XCircle size={18} color="var(--brand-accent)" />;
            default:
                return <Clock size={18} color="var(--brand-warning)" />;
        }
    };

    const latestStatus = documents.length > 0 ? documents[0].status : null;

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 700, marginBottom: "24px" }}>
                <span className="gradient-text">KYC Verification</span>
            </h1>

            {/* Status banner */}
            {latestStatus && (
                <div
                    className="glass-card"
                    style={{
                        padding: "16px 20px",
                        marginBottom: "20px",
                        borderColor:
                            latestStatus === "approved"
                                ? "var(--brand-success)"
                                : latestStatus === "rejected"
                                    ? "var(--brand-accent)"
                                    : "var(--brand-warning)",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                        <Shield
                            size={22}
                            color={
                                latestStatus === "approved"
                                    ? "var(--brand-success)"
                                    : latestStatus === "rejected"
                                        ? "var(--brand-accent)"
                                        : "var(--brand-warning)"
                            }
                            style={{ flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 600, fontSize: "14px" }}>
                                KYC Status:{" "}
                                <span
                                    style={{
                                        color:
                                            latestStatus === "approved"
                                                ? "var(--brand-success)"
                                                : latestStatus === "rejected"
                                                    ? "var(--brand-accent)"
                                                    : "var(--brand-warning)",
                                        textTransform: "capitalize",
                                    }}
                                >
                                    {latestStatus}
                                </span>
                            </p>
                            {latestStatus === "rejected" && documents[0]?.admin_notes && (
                                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px", wordBreak: "break-word" }}>
                                    Reason: {documents[0].admin_notes}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Upload form */}
            {latestStatus !== "approved" && (
                <div className="glass-card" style={{ padding: "20px", marginBottom: "20px" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "14px" }}>
                        Upload Document
                    </h2>
                    <form onSubmit={handleUpload}>
                        <div style={{ marginBottom: "14px" }}>
                            <label
                                style={{
                                    display: "block",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: "var(--text-secondary)",
                                    marginBottom: "6px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Document Type
                            </label>
                            <select
                                className="input-field"
                                value={docType}
                                onChange={(e) => setDocType(e.target.value)}
                            >
                                <option value="aadhaar">Aadhaar Card</option>
                                <option value="pan">PAN Card</option>
                                <option value="passport">Passport</option>
                                <option value="driving_license">Driving License</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: "16px" }}>
                            <label
                                style={{
                                    display: "block",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    color: "var(--text-secondary)",
                                    marginBottom: "6px",
                                    textTransform: "uppercase",
                                }}
                            >
                                Upload File
                            </label>
                            <div
                                style={{
                                    border: "2px dashed var(--border-accent)",
                                    borderRadius: "var(--radius-md)",
                                    padding: "clamp(20px, 4vw, 32px)",
                                    textAlign: "center",
                                    cursor: "pointer",
                                    transition: "all 0.2s",
                                }}
                                onClick={() => fileRef.current?.click()}
                            >
                                <Upload
                                    size={28}
                                    color="var(--brand-primary)"
                                    style={{ margin: "0 auto 10px" }}
                                />
                                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                                    Click or drag & drop your document
                                </p>
                                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                                    PDF, JPG, PNG up to 5MB
                                </p>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    style={{ display: "none" }}
                                />
                            </div>
                        </div>

                        {message && (
                            <div
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: "var(--radius-sm)",
                                    background: message.startsWith("Error")
                                        ? "rgba(255, 107, 107, 0.1)"
                                        : "rgba(0, 230, 118, 0.1)",
                                    color: message.startsWith("Error")
                                        ? "var(--brand-accent)"
                                        : "var(--brand-success)",
                                    fontSize: "13px",
                                    marginBottom: "14px",
                                    wordBreak: "break-word",
                                }}
                            >
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={uploading}
                            style={{ width: "100%" }}
                        >
                            {uploading ? "Uploading..." : "Submit for Review"}
                        </button>
                    </form>
                </div>
            )}

            {/* Document history */}
            {documents.length > 0 && (
                <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
                    <div
                        style={{
                            padding: "16px 20px",
                            borderBottom: "1px solid var(--border-subtle)",
                        }}
                    >
                        <h3 style={{ fontSize: "16px", fontWeight: 700 }}>
                            Submission History
                        </h3>
                    </div>
                    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((doc) => (
                                    <tr key={doc.id}>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                <FileText size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                                <span style={{ textTransform: "capitalize", whiteSpace: "nowrap" }}>
                                                    {doc.document_type.replace("_", " ")}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                                {getStatusIcon(doc.status)}
                                                <span
                                                    className={`badge ${doc.status === "approved"
                                                        ? "badge-success"
                                                        : doc.status === "rejected"
                                                            ? "badge-danger"
                                                            : "badge-warning"
                                                        }`}
                                                >
                                                    {doc.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ color: "var(--text-secondary)", fontSize: "12px", whiteSpace: "nowrap" }} suppressHydrationWarning>
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </td>
                                        <td style={{ color: "var(--text-muted)", fontSize: "12px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            {doc.admin_notes || "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
