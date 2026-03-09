import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KycView } from "@/components/dashboard/kyc-view";

export default async function KycPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: documents } = await supabase
        .from("kyc_documents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    return <KycView documents={documents ?? []} />;
}
