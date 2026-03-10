"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type TimeFrame = "daily" | "weekly" | "monthly";

export type ServiceMetricSummary = {
    serviceId: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    gradient: string;
    category: string;
    isActive: boolean;
    transactions: number;
    revenue: number;
    users: number;
    trend: number;
    chartData: { label: string; value: number }[];
};

export type ServiceDetailMetrics = {
    serviceId: string;
    slug: string;
    name: string;
    description: string;
    icon: string;
    gradient: string;
    transactions: { daily: number; weekly: number; monthly: number };
    revenue: { daily: number; weekly: number; monthly: number };
    users: { daily: number; weekly: number; monthly: number };
    recentTransactions: {
        id: string;
        userId: string;
        userName: string | null;
        amount: number;
        status: string;
        type: string;
        date: string;
    }[];
    chartData: {
        daily: { label: string; transactions: number; revenue: number }[];
        weekly: { label: string; transactions: number; revenue: number }[];
        monthly: { label: string; transactions: number; revenue: number }[];
    };
};

type AnyRecord = Record<string, unknown>;

function getCutoff(frame: TimeFrame): Date {
    const now = new Date();
    if (frame === "daily") return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (frame === "weekly") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
}

function buildDayBuckets(n: number): string[] {
    return Array.from({ length: n }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (n - 1 - i));
        return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    });
}

function buildHourBuckets(n: number): string[] {
    return Array.from({ length: n }, (_, i) => {
        const h = new Date();
        h.setHours(h.getHours() - (n - 1 - i), 0, 0, 0);
        return `${h.getHours()}:00`;
    });
}

// Typed row structures for each table
type DonationRow = { id: string; user_id: string; amount: number; payment_status: string; created_at: string };
type ReferralRow = { id: string; referrer_id: string; status: string; created_at: string };
type DepositRow = { id: string; user_id: string; amount: number; status: string; created_at: string };
type KycRow = { id: string; user_id: string; status: string; created_at: string };

type ServiceRow = DonationRow | ReferralRow | DepositRow | KycRow;

const SERVICE_DEFS = [
    {
        slug: "cow-donation",
        name: "Cow Donation",
        description: "Sacred cow adoption & recurring donations",
        icon: "🐄",
        gradient: "linear-gradient(135deg, #FF6B6B 0%, #FFD93D 100%)",
        table: "donations" as const,
        getUserId: (r: AnyRecord) => r.user_id as string,
        getAmount: (r: AnyRecord) => Number(r.amount ?? 0),
        getDate: (r: AnyRecord) => r.created_at as string,
        getStatus: (r: AnyRecord) => r.payment_status as string,
    },
    {
        slug: "referral-challenge",
        name: "Referral Challenge",
        description: "Gamified referral program with rewards",
        icon: "🏆",
        gradient: "linear-gradient(135deg, #6C5CE7 0%, #00D2FF 100%)",
        table: "referrals" as const,
        getUserId: (r: AnyRecord) => r.referrer_id as string,
        getAmount: (_: AnyRecord) => 0,
        getDate: (r: AnyRecord) => r.created_at as string,
        getStatus: (r: AnyRecord) => r.status as string,
    },
    {
        slug: "deposits",
        name: "Deposits",
        description: "Platform deposit & wallet top-up service",
        icon: "💰",
        gradient: "linear-gradient(135deg, #00E676 0%, #00D2FF 100%)",
        table: "deposits" as const,
        getUserId: (r: AnyRecord) => r.user_id as string,
        getAmount: (r: AnyRecord) => Number(r.amount ?? 0),
        getDate: (r: AnyRecord) => r.created_at as string,
        getStatus: (r: AnyRecord) => r.status as string,
    },
    {
        slug: "kyc-verification",
        name: "KYC Verification",
        description: "User identity verification pipeline",
        icon: "🛡️",
        gradient: "linear-gradient(135deg, #FFD93D 0%, #FF6B6B 100%)",
        table: "kyc_documents" as const,
        getUserId: (r: AnyRecord) => r.user_id as string,
        getAmount: (_: AnyRecord) => 0,
        getDate: (r: AnyRecord) => r.created_at as string,
        getStatus: (r: AnyRecord) => r.status as string,
    },
] as const;

export type ServiceSlug = (typeof SERVICE_DEFS)[number]["slug"];

// ── Summary metrics for dashboard grid ──────────────────────────────────────
export async function getServiceMetrics(frame: TimeFrame = "weekly"): Promise<ServiceMetricSummary[]> {
    const admin = createAdminClient();
    const cutoff = getCutoff(frame);
    const periodMs = new Date().getTime() - cutoff.getTime();
    const prevCutoff = new Date(cutoff.getTime() - periodMs);

    const results: ServiceMetricSummary[] = [];

    for (const svc of SERVICE_DEFS) {
        try {
            const { data: currentRaw } = await admin
                .from(svc.table)
                .select("*")
                .gte("created_at", cutoff.toISOString());

            const { count: prevCount } = await admin
                .from(svc.table)
                .select("*", { count: "exact", head: true })
                .gte("created_at", prevCutoff.toISOString())
                .lt("created_at", cutoff.toISOString());

            const current = (currentRaw ?? []) as AnyRecord[];
            const currentCount = current.length;
            const prev = prevCount ?? 0;
            const trend = prev === 0 ? 0 : Math.round(((currentCount - prev) / prev) * 100);

            const uniqueUsers = new Set(current.map((r) => svc.getUserId(r))).size;
            const revenue = current.reduce((sum, r) => sum + svc.getAmount(r), 0);

            const buckets = buildDayBuckets(7);
            const chartData = buckets.map((label, i) => {
                const from = new Date();
                from.setDate(from.getDate() - (6 - i));
                from.setHours(0, 0, 0, 0);
                const to = new Date(from);
                to.setDate(to.getDate() + 1);
                const count = current.filter((r) => {
                    const d = new Date(svc.getDate(r));
                    return d >= from && d < to;
                }).length;
                return { label, value: count };
            });

            results.push({
                serviceId: svc.slug,
                slug: svc.slug,
                name: svc.name,
                description: svc.description,
                icon: svc.icon,
                gradient: svc.gradient,
                category: "platform",
                isActive: true,
                transactions: currentCount,
                revenue,
                users: uniqueUsers,
                trend,
                chartData,
            });
        } catch (err) {
            console.error(`Failed to fetch metrics for ${svc.slug}:`, err);
        }
    }

    return results;
}

// ── Full detail metrics for a specific service ───────────────────────────────
export async function getServiceDetailMetrics(slug: string): Promise<ServiceDetailMetrics | null> {
    const svc = SERVICE_DEFS.find((s) => s.slug === slug);
    if (!svc) return null;

    const admin = createAdminClient();
    const monthlyCutoff = getCutoff("monthly");
    const weeklyCutoff = getCutoff("weekly");
    const dailyCutoff = getCutoff("daily");

    try {
        const { data: allRaw } = await admin
            .from(svc.table)
            .select("*")
            .gte("created_at", monthlyCutoff.toISOString())
            .order("created_at", { ascending: false });

        const { data: recentRaw } = await admin
            .from(svc.table)
            .select("*")
            .order("created_at", { ascending: false })
            .limit(20);

        const allRecords = (allRaw ?? []) as AnyRecord[];
        const recentRecords = (recentRaw ?? []) as AnyRecord[];

        const filterFrom = (cutoff: Date) =>
            allRecords.filter((r) => new Date(svc.getDate(r)) >= cutoff);

        const dailyRec = filterFrom(dailyCutoff);
        const weeklyRec = filterFrom(weeklyCutoff);

        const countUniq = (arr: AnyRecord[]) => new Set(arr.map((r) => svc.getUserId(r))).size;
        const sumRevenue = (arr: AnyRecord[]) => arr.reduce((s, r) => s + svc.getAmount(r), 0);

        const recentTransactions = recentRecords.map((r) => ({
            id: r.id as string,
            userId: svc.getUserId(r),
            userName: null as string | null,
            amount: svc.getAmount(r),
            status: svc.getStatus(r),
            type: svc.name,
            date: svc.getDate(r),
        }));

        // Build chart helpers
        type ChartPoint = { label: string; transactions: number; revenue: number };
        const buildChart = (
            arr: AnyRecord[],
            buckets: string[],
            bucketFn: (idx: number) => { from: Date; to: Date }
        ): ChartPoint[] =>
            buckets.map((label, i) => {
                const { from, to } = bucketFn(i);
                const bucket = arr.filter((r) => {
                    const d = new Date(svc.getDate(r));
                    return d >= from && d < to;
                });
                return { label, transactions: bucket.length, revenue: sumRevenue(bucket) };
            });

        const hourlyBuckets = buildHourBuckets(8);
        const dailyChart = buildChart(dailyRec, hourlyBuckets, (i) => {
            const from = new Date();
            from.setHours(from.getHours() - (7 - i) * 3, 0, 0, 0);
            return { from, to: new Date(from.getTime() + 3 * 60 * 60 * 1000) };
        });

        const weeklyBuckets = buildDayBuckets(7);
        const weeklyChart = buildChart(weeklyRec, weeklyBuckets, (i) => {
            const from = new Date();
            from.setDate(from.getDate() - (6 - i));
            from.setHours(0, 0, 0, 0);
            const to = new Date(from);
            to.setDate(to.getDate() + 1);
            return { from, to };
        });

        const monthlyBuckets = Array.from({ length: 6 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (29 - i * 5));
            return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
        });
        const monthlyChart = buildChart(allRecords, monthlyBuckets, (i) => {
            const from = new Date();
            from.setDate(from.getDate() - (29 - i * 5));
            from.setHours(0, 0, 0, 0);
            return { from, to: new Date(from.getTime() + 5 * 24 * 60 * 60 * 1000) };
        });

        return {
            serviceId: svc.slug,
            slug: svc.slug,
            name: svc.name,
            description: svc.description,
            icon: svc.icon,
            gradient: svc.gradient,
            transactions: {
                daily: dailyRec.length,
                weekly: weeklyRec.length,
                monthly: allRecords.length,
            },
            revenue: {
                daily: sumRevenue(dailyRec),
                weekly: sumRevenue(weeklyRec),
                monthly: sumRevenue(allRecords),
            },
            users: {
                daily: countUniq(dailyRec),
                weekly: countUniq(weeklyRec),
                monthly: countUniq(allRecords),
            },
            recentTransactions,
            chartData: {
                daily: dailyChart,
                weekly: weeklyChart,
                monthly: monthlyChart,
            },
        };
    } catch (err) {
        console.error(`Failed to fetch detail metrics for ${slug}:`, err);
        return null;
    }
}
