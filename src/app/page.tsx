import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LandingPage from "@/components/landing/landing-page";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      redirect("/admin");
    }
    redirect("/services");
  }

  return <LandingPage />;
}
