import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ServicesSidebar } from "@/components/services/sidebar";

export default async function ServicesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    return (
        <div className="services-layout">
            <ServicesSidebar
                userName={profile?.full_name || "User"}
                phone={profile?.phone || ""}
            />
            <main className="services-main">
                {children}
            </main>
        </div>
    );
}
