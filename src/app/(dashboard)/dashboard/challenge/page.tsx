import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChallengeView } from "@/components/dashboard/challenge-view";

export default async function ChallengePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: challenge } = await supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

    const { data: rewards } = await supabase
        .from("rewards")
        .select("*")
        .eq("is_active", true)
        .order("threshold");

    return (
        <ChallengeView
            userId={user.id}
            initialChallenge={challenge}
            rewards={rewards ?? []}
        />
    );
}
