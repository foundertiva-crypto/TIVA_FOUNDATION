import { getPendingKyc } from "@/app/actions/admin";
import { AdminKycQueue } from "@/components/admin/kyc-queue";

export default async function AdminKycPage() {
    const documents = await getPendingKyc();
    return <AdminKycQueue documents={documents ?? []} />;
}
