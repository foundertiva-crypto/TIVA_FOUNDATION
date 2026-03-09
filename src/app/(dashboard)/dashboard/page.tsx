import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardOverview } from "@/components/dashboard/overview";

export default async function DashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Fetch all dashboard data
    const [profileRes, challengeRes, referralsRes, rewardsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
            .from("user_challenges")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single(),
        supabase
            .from("referrals")
            .select("id, status")
            .eq("referrer_id", user.id),
        supabase.from("rewards").select("*").eq("is_active", true).order("threshold"),
    ]);

    const profile = profileRes.data;
    const challenge = challengeRes.data;
    const referrals = referralsRes.data ?? [];
    const rewards = rewardsRes.data ?? [];

    const validCount = referrals.filter((r) => r.status === "valid").length;

    return (
        <DashboardOverview
            profile={profile}
            challenge={challenge}
            totalReferrals={referrals.length}
            validReferrals={validCount}
            rewards={rewards}
        />
    );
}
