import { getAllChallenges } from "@/app/actions/admin";
import { AdminChallengesList } from "@/components/admin/challenges-list";

export default async function AdminChallengesPage() {
    const challenges = await getAllChallenges();
    return <AdminChallengesList challenges={challenges ?? []} />;
}
