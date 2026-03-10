"use client";

import { useState, useTransition } from "react";
import { TrendingUp, TrendingDown, ExternalLink, Users, ArrowRightLeft, DollarSign } from "lucide-react";
import type { ServiceMetricSummary, TimeFrame } from "@/app/actions/service-metrics";

interface ServiceMetricCardProps {
    service: ServiceMetricSummary;
    initialFrame: TimeFrame;
    onFrameChange: (slug: string, frame: TimeFrame) => void;
}

const TIME_FRAMES: { key: TimeFrame; label: string }[] = [
    { key: "daily", label: "Day" },
    { key: "weekly", label: "Week" },
    { key: "monthly", label: "Month" },
];

function MiniSparkline({ data, color }: { data: { label: string; value: number }[]; color: string }) {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map((d) => d.value), 1);
    const height = 40;
    const width = 100;
    const step = width / (data.length - 1 || 1);

    const points = data.map((d, i) => ({
        x: i * step,
        y: height - (d.value / max) * height,
    }));

    const pathD = points.reduce((acc, p, i) => {
        return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L 0 ${height} Z`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "44px" }} preserveAspectRatio="none">
            <defs>
                <linearGradient id={`grad-${color.replace(/[^a-zA-Z0-9]/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d={areaD}
                fill={`url(#grad-${color.replace(/[^a-zA-Z0-9]/g, "")})`}
            />
            <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function ServiceMetricCard({ service, initialFrame, onFrameChange }: ServiceMetricCardProps) {
    const [frame, setFrame] = useState<TimeFrame>(initialFrame);
    const [, startTransition] = useTransition();

    const handleFrame = (f: TimeFrame) => {
        setFrame(f);
        startTransition(() => {
            onFrameChange(service.slug, f);
        });
    };

    const handleOpen = () => {
        window.open(`/admin/services/${service.slug}`, "_blank");
    };

    const trendPositive = service.trend >= 0;
    const accentColor = service.gradient.includes("#FF6B6B")
        ? "#FF6B6B"
        : service.gradient.includes("#6C5CE7")
        ? "#6C5CE7"
        : service.gradient.includes("#00E676")
        ? "#00E676"
        : "#FFD93D";

    return (
        <div
            className="service-metric-card"
            style={{ borderTop: `2px solid ${accentColor}22` }}
        >
            {/* Header */}
            <div className="smc-header">
                <div className="smc-icon" style={{ background: service.gradient }}>
                    <span style={{ fontSize: "20px" }}>{service.icon}</span>
                </div>
                <div className="smc-title-block">
                    <h3 className="smc-title">{service.name}</h3>
                    <p className="smc-desc">{service.description}</p>
                </div>
                <button
                    className="smc-open-btn"
                    onClick={handleOpen}
                    title={`Open ${service.name} details`}
                    aria-label={`Open ${service.name} details in new tab`}
                >
                    <ExternalLink size={14} />
                </button>
            </div>

            {/* Time Frame Toggle */}
            <div className="smc-frame-toggle">
                {TIME_FRAMES.map((tf) => (
                    <button
                        key={tf.key}
                        className={`smc-frame-btn ${frame === tf.key ? "active" : ""}`}
                        onClick={() => handleFrame(tf.key)}
                    >
                        {tf.label}
                    </button>
                ))}
            </div>

            {/* Sparkline */}
            <div className="smc-chart">
                <MiniSparkline data={service.chartData} color={accentColor} />
            </div>

            {/* Metrics Row */}
            <div className="smc-metrics">
                <div className="smc-metric">
                    <ArrowRightLeft size={12} color="var(--text-muted)" />
                    <span className="smc-metric-val">{service.transactions.toLocaleString()}</span>
                    <span className="smc-metric-label">Txns</span>
                </div>
                <div className="smc-metric-divider" />
                <div className="smc-metric">
                    <DollarSign size={12} color="var(--text-muted)" />
                    <span className="smc-metric-val">
                        {service.revenue > 0 ? `₹${(service.revenue / 1000).toFixed(1)}k` : "—"}
                    </span>
                    <span className="smc-metric-label">Revenue</span>
                </div>
                <div className="smc-metric-divider" />
                <div className="smc-metric">
                    <Users size={12} color="var(--text-muted)" />
                    <span className="smc-metric-val">{service.users.toLocaleString()}</span>
                    <span className="smc-metric-label">Users</span>
                </div>
            </div>

            {/* Trend Badge */}
            <div className="smc-footer">
                <span
                    className={`smc-trend ${trendPositive ? "positive" : "negative"}`}
                >
                    {trendPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {trendPositive ? "+" : ""}{service.trend}% vs prev period
                </span>
                <button className="smc-details-link" onClick={handleOpen}>
                    View Details →
                </button>
            </div>
        </div>
    );
}
