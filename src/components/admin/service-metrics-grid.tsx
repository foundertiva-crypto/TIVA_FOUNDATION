"use client";

import { useState, useCallback } from "react";
import { ServiceMetricCard } from "./service-metric-card";
import { getServiceMetrics } from "@/app/actions/service-metrics";
import type { ServiceMetricSummary, TimeFrame } from "@/app/actions/service-metrics";
import { BarChart2 } from "lucide-react";

interface ServiceMetricsGridProps {
    initialData: ServiceMetricSummary[];
}

const GLOBAL_FRAMES: { key: TimeFrame; label: string }[] = [
    { key: "daily", label: "Today" },
    { key: "weekly", label: "This Week" },
    { key: "monthly", label: "This Month" },
];

export function ServiceMetricsGrid({ initialData }: ServiceMetricsGridProps) {
    const [globalFrame, setGlobalFrame] = useState<TimeFrame>("weekly");
    const [services, setServices] = useState<ServiceMetricSummary[]>(initialData);
    const [loading, setLoading] = useState(false);

    const handleGlobalFrame = useCallback(async (frame: TimeFrame) => {
        setGlobalFrame(frame);
        setLoading(true);
        try {
            const fresh = await getServiceMetrics(frame);
            setServices(fresh);
        } catch (err) {
            console.error("Failed to refresh metrics:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Per-card frame change — re-fetch only that service's data
    const handleCardFrame = useCallback(async (slug: string, frame: TimeFrame) => {
        try {
            const fresh = await getServiceMetrics(frame);
            const updated = fresh.find((s) => s.slug === slug);
            if (updated) {
                setServices((prev) => prev.map((s) => (s.slug === slug ? updated : s)));
            }
        } catch (err) {
            console.error("Failed to refresh card metrics:", err);
        }
    }, []);

    return (
        <section className="smg-section">
            {/* Section Header */}
            <div className="smg-header">
                <div className="smg-title-row">
                    <div className="smg-title-icon">
                        <BarChart2 size={18} color="#6C5CE7" />
                    </div>
                    <div>
                        <h2 className="smg-title">Service Metrics</h2>
                        <p className="smg-subtitle">Platform services at a glance</p>
                    </div>
                </div>

                {/* Global Time Frame Selector */}
                <div className="smg-global-toggle">
                    {GLOBAL_FRAMES.map((tf) => (
                        <button
                            key={tf.key}
                            className={`smg-global-btn ${globalFrame === tf.key ? "active" : ""}`}
                            onClick={() => handleGlobalFrame(tf.key)}
                            disabled={loading}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className={`smg-grid ${loading ? "smg-loading" : ""}`}>
                {services.map((svc) => (
                    <ServiceMetricCard
                        key={svc.slug}
                        service={svc}
                        initialFrame={globalFrame}
                        onFrameChange={handleCardFrame}
                    />
                ))}
            </div>
        </section>
    );
}
