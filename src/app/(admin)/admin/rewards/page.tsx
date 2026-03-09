import { getRewardTiers } from "@/app/actions/admin";
import { AdminRewardsEditor } from "@/components/admin/rewards-editor";

export default async function AdminRewardsPage() {
    const rewards = await getRewardTiers();
    return <AdminRewardsEditor initialRewards={rewards ?? []} />;
}
