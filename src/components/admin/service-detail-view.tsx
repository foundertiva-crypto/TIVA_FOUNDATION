"use client";

import { useState } from "react";
import { ArrowLeft, TrendingUp, Users, ArrowRightLeft, DollarSign, Clock } from "lucide-react";
import type { ServiceDetailMetrics, TimeFrame } from "@/app/actions/service-metrics";

interface Props {
    metrics: ServiceDetailMetrics;
}

const FRAMES: { key: TimeFrame; label: string }[] = [
    { key: "daily", label: "Today (24h)" },
    { key: "weekly", label: "This Week" },
    { key: "monthly", label: "This Month" },
];

function BarChart({ data, valueKey }: { data: { label: string; [key: string]: number | string }[]; valueKey: string }) {
    const values = data.map((d) => Number(d[valueKey]) || 0);
    const max = Math.max(...values, 1);

    return (
        <div className="sdd-bar-chart">
            {data.map((d, i) => {
                const val = Number(d[valueKey]) || 0;
                const pct = (val / max) * 100;
                return (
                    <div key={i} className="sdd-bar-col">
                        <div className="sdd-bar-tooltip">{val > 0 ? val.toLocaleString() : "0"}</div>
                        <div className="sdd-bar-track">
                            <div
                                className="sdd-bar-fill"
                                style={{ height: `${Math.max(pct, 2)}%` }}
                            />
                        </div>
                        <span className="sdd-bar-label">{d.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

function StatBlock({
    icon,
    label,
    value,
    sub,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div className="sdd-stat-block">
            <div className="sdd-stat-icon">{icon}</div>
            <div>
                <p className="sdd-stat-label">{label}</p>
                <p className="sdd-stat-value">{value}</p>
                {sub && <p className="sdd-stat-sub">{sub}</p>}
            </div>
        </div>
    );
}

export function ServiceDetailView({ metrics }: Props) {
    const [frame, setFrame] = useState<TimeFrame>("weekly");

    const txn = metrics.transactions[frame];
    const rev = metrics.revenue[frame];
    const usr = metrics.users[frame];
    const chart = metrics.chartData[frame];

    const accentColor = metrics.gradient.includes("#FF6B6B")
        ? "#FF6B6B"
        : metrics.gradient.includes("#6C5CE7")
        ? "#6C5CE7"
        : metrics.gradient.includes("#00E676")
        ? "#00E676"
        : "#FFD93D";

    const formatDate = (iso: string) => {
        try {
            return new Date(iso).toLocaleString("en-IN", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return iso;
        }
    };

    const statusColor = (s: string) => {
        if (["captured", "valid", "approved", "active"].includes(s)) return "var(--brand-success)";
        if (["pending"].includes(s)) return "var(--brand-warning)";
        return "var(--brand-accent)";
    };

    return (
        <div className="sdd-root animate-fade-in">
            {/* Back Button */}
            <button
                className="sdd-back-btn"
                onClick={() => window.close()}
                aria-label="Close tab"
            >
                <ArrowLeft size={16} />
                Back
            </button>

            {/* Hero Header */}
            <div className="sdd-hero" style={{ background: metrics.gradient }}>
                <div className="sdd-hero-icon">{metrics.icon}</div>
                <div>
                    <h1 className="sdd-hero-title">{metrics.name}</h1>
                    <p className="sdd-hero-desc">{metrics.description}</p>
                </div>
            </div>

            {/* Time Frame Toggle */}
            <div className="sdd-frame-bar">
                {FRAMES.map((f) => (
                    <button
                        key={f.key}
                        className={`sdd-frame-btn ${frame === f.key ? "active" : ""}`}
                        onClick={() => setFrame(f.key)}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* KPI Cards */}
            <div className="sdd-kpi-grid">
                <StatBlock
                    icon={<ArrowRightLeft size={20} color={accentColor} />}
                    label="Transactions"
                    value={txn.toLocaleString()}
                    sub={`Total for ${frame === "daily" ? "today" : frame === "weekly" ? "this week" : "this month"}`}
                />
                {rev > 0 && (
                    <StatBlock
                        icon={<DollarSign size={20} color={accentColor} />}
                        label="Revenue"
                        value={`₹${rev.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                        sub="Captured payments"
                    />
                )}
                <StatBlock
                    icon={<Users size={20} color={accentColor} />}
                    label="Unique Users"
                    value={usr.toLocaleString()}
                    sub="Active participants"
                />
                {rev > 0 && txn > 0 && (
                    <StatBlock
                        icon={<TrendingUp size={20} color={accentColor} />}
                        label="Avg. Value"
                        value={`₹${(rev / txn).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                        sub="Per transaction"
                    />
                )}
            </div>

            {/* Chart Sections */}
            <div className="sdd-charts-grid">
                {/* Transactions Chart */}
                <div className="glass-card sdd-chart-card">
                    <h3 className="sdd-chart-title">Transaction Volume</h3>
                    {chart.length > 0 ? (
                        <BarChart data={chart} valueKey="transactions" />
                    ) : (
                        <p className="sdd-empty">No data for selected period</p>
                    )}
                </div>

                {/* Revenue Chart (only if applicable) */}
                {rev > 0 && (
                    <div className="glass-card sdd-chart-card">
                        <h3 className="sdd-chart-title">Revenue (₹)</h3>
                        {chart.length > 0 ? (
                            <BarChart data={chart} valueKey="revenue" />
                        ) : (
                            <p className="sdd-empty">No revenue data</p>
                        )}
                    </div>
                )}
            </div>

            {/* Recent Transactions Table */}
            <div className="glass-card sdd-txn-card">
                <div className="sdd-txn-header">
                    <Clock size={16} color="var(--text-muted)" />
                    <h3 className="sdd-chart-title">Recent Transactions</h3>
                </div>
                {metrics.recentTransactions.length > 0 ? (
                    <div className="table-scroll-wrapper">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>User</th>
                                    {metrics.recentTransactions.some((t) => t.amount > 0) && <th>Amount</th>}
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.recentTransactions.map((txn) => (
                                    <tr key={txn.id}>
                                        <td style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--text-muted)" }}>
                                            {txn.id.slice(0, 8)}…
                                        </td>
                                        <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                                            {txn.userId.slice(0, 8)}…
                                        </td>
                                        {metrics.recentTransactions.some((t) => t.amount > 0) && (
                                            <td style={{ fontWeight: 600, color: "var(--brand-success)" }}>
                                                {txn.amount > 0 ? `₹${txn.amount.toLocaleString()}` : "—"}
                                            </td>
                                        )}
                                        <td>
                                            <span
                                                className="badge"
                                                style={{
                                                    background: `${statusColor(txn.status)}20`,
                                                    color: statusColor(txn.status),
                                                }}
                                            >
                                                {txn.status}
                                            </span>
                                        </td>
                                        <td style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
                                            {formatDate(txn.date)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="sdd-empty">No recent transactions found.</p>
                )}
            </div>
        </div>
    );
}
