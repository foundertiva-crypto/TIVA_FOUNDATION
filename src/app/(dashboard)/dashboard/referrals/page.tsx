import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReferralsView } from "@/components/dashboard/referrals-view";
import { buildReferralLink } from "@/lib/utils/referral";

export default async function ReferralsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .single();

    const referralLink = profile ? buildReferralLink(profile.referral_code) : "";

    return (
        <ReferralsView
            userId={user.id}
            referralCode={profile?.referral_code ?? ""}
            referralLink={referralLink}
        />
    );
}
