"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const allowedDeliveryModes = new Set(["online", "hybrid", "in_person", "offline"]);

export async function createEducationProgram(formData: FormData): Promise<never> {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();

    if (!user) redirect("/login");

    // Recheck on the server; a protected layout is not the only security boundary.
    const { data: profile, error: profileError } = await sessionClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || profile?.role !== "admin") {
        redirect("/dashboard");
    }

    const title = String(formData.get("title") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
    const summary = String(formData.get("summary") ?? "").trim();
    const deliveryMode = String(formData.get("delivery_mode") ?? "hybrid");
    const capacityText = String(formData.get("capacity") ?? "50").trim();
    const languagesText = String(formData.get("languages") ?? "en,kn,hi");

    if (title.length < 3 || title.length > 180) {
        redirect("/admin/education?error=Programme%20title%20must%20be%203%E2%80%93180%20characters.");
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        redirect("/admin/education?error=Slug%20must%20use%20lowercase%20letters%2C%20numbers%20and%20hyphens.");
    }

    const capacity = Number(capacityText);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) {
        redirect("/admin/education?error=Capacity%20must%20be%20an%20integer%20between%201%20and%20100000.");
    }
    if (!allowedDeliveryModes.has(deliveryMode)) {
        redirect("/admin/education?error=Choose%20a%20valid%20delivery%20mode.");
    }

    const languages = [...new Set(
        languagesText.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean)
    )].slice(0, 8);
    if (languages.length === 0 || languages.some((value) => !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/.test(value))) {
        redirect("/admin/education?error=Use%20valid%20language%20codes%20such%20as%20en%2Ckn%2Chi.");
    }

    if (summary.length > 2000) {
        redirect("/admin/education?error=Description%20must%20be%202000%20characters%20or%20less.");
    }

    let failure: "duplicate" | "migration" | "database" | null = null;

    try {
        const admin = createAdminClient();
        const { error } = await admin.from("education_programs").insert({
            title,
            slug,
            summary,
            delivery_mode: deliveryMode,
            capacity,
            languages,
            status: "draft",
            created_by: user.id,
        });

        if (error) {
            if (error.code === "23505") failure = "duplicate";
            else if (error.code === "42P01" || error.code === "PGRST205") failure = "migration";
            else failure = "database";
        }
    } catch {
        failure = "database";
    }

    // Do redirects outside the try/catch: Next.js redirects throw a control-flow
    // exception, and catching one would incorrectly turn an application error
    // into a generic database-connection error.
    if (failure === "duplicate") {
        redirect("/admin/education?error=That%20programme%20slug%20already%20exists.");
    }
    if (failure === "migration") {
        redirect("/admin/education?error=Education%20migration%20is%20not%20installed%20in%20this%20database.");
    }
    if (failure === "database") {
        redirect("/admin/education?error=Programme%20could%20not%20be%20created.%20Check%20the%20database%20configuration.");
    }

    revalidatePath("/admin/education");
    redirect("/admin/education?created=1");
}
