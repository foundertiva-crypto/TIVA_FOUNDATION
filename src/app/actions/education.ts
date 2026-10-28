"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit, educationApplicationLimiter } from "@/lib/rate-limit";

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


const applicationConsentVersion = "tiva-world-foundation-education-application-v1";
const applicationStatuses = new Set([
    "under_review",
    "needs_information",
    "accepted",
    "waitlisted",
    "rejected",
    "withdrawn",
]);

function isValidProgramSlug(value: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export async function setEducationProgramAvailability(formData: FormData): Promise<never> {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile, error: profileError } = await sessionClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || profile?.role !== "admin") redirect("/dashboard");

    const programId = String(formData.get("program_id") ?? "").trim();
    const mode = String(formData.get("mode") ?? "");
    const confirmed = formData.get("publish_confirmed") === "yes";

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(programId)) {
        redirect("/admin/education?error=Invalid%20programme%20reference.");
    }
    if (!confirmed) redirect("/admin/education?error=Confirm%20the%20programme%20readiness%20statement.");
    if (mode !== "publish" && mode !== "pause") redirect("/admin/education?error=Invalid%20programme%20action.");

    const { data: program, error: loadError } = await sessionClient
        .from("education_programs")
        .select("id,status")
        .eq("id", programId)
        .maybeSingle();

    if (loadError || !program) redirect("/admin/education?error=Programme%20could%20not%20be%20loaded.");

    if (mode === "publish" && !["draft", "paused"].includes(program.status)) {
        redirect("/admin/education?error=Only%20draft%20or%20paused%20programmes%20can%20be%20published.");
    }
    if (mode === "pause" && program.status !== "published") {
        redirect("/admin/education?error=Only%20published%20programmes%20can%20be%20paused.");
    }

    const now = new Date().toISOString();
    const nextValues = mode === "publish"
        ? { status: "published", application_opens_at: now, application_closes_at: null }
        : { status: "paused", application_closes_at: now };

    const { error: updateError } = await sessionClient
        .from("education_programs")
        .update(nextValues)
        .eq("id", programId);

    if (updateError) {
        redirect("/admin/education?error=Programme%20availability%20could%20not%20be%20updated.%20Check%20the%20education%20migration%20and%20permissions.");
    }

    revalidatePath("/admin/education");
    revalidatePath("/education");
    redirect(mode === "publish"
        ? "/admin/education?published=1"
        : "/admin/education?paused=1");
}

export async function submitEducationApplication(formData: FormData): Promise<never> {
    const slug = String(formData.get("program_slug") ?? "").trim().toLowerCase();

    if (!isValidProgramSlug(slug)) redirect("/education?error=invalid-programme");
    const applicationPath = `/education/apply/${slug}`;

    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();

    if (!user) redirect(`/login?next=${encodeURIComponent(applicationPath)}`);

    const { allowed } = await checkRateLimit(educationApplicationLimiter, `${user.id}:${slug}`);
    if (!allowed) redirect(`${applicationPath}?error=rate-limited`);

    const fullName = String(formData.get("full_name") ?? "").trim().replace(/\s+/g, " ");
    const contactEmail = String(formData.get("contact_email") ?? "").trim().toLowerCase();
    const institutionName = String(formData.get("institution_name") ?? "").trim().replace(/\s+/g, " ");
    const consent = formData.get("consent") === "yes";

    if (fullName.length < 2 || fullName.length > 180) {
        redirect(`${applicationPath}?error=invalid-name`);
    }
    if (contactEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactEmail)) {
        redirect(`${applicationPath}?error=invalid-email`);
    }
    if (institutionName.length > 180) redirect(`${applicationPath}?error=invalid-college`);
    if (!consent) redirect(`${applicationPath}?error=consent-required`);

    const { data: program, error: programError } = await sessionClient
        .from("education_programs")
        .select("id,status,application_opens_at,application_closes_at")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

    if (programError || !program) redirect(`${applicationPath}?error=not-open`);

    const nowMs = Date.now();
    const opensMs = program.application_opens_at ? Date.parse(program.application_opens_at) : null;
    const closesMs = program.application_closes_at ? Date.parse(program.application_closes_at) : null;
    if ((opensMs !== null && (!Number.isFinite(opensMs) || opensMs > nowMs))
        || (closesMs !== null && (!Number.isFinite(closesMs) || closesMs <= nowMs))) {
        redirect(`${applicationPath}?error=not-open`);
    }

    const { data: existing, error: existingError } = await sessionClient
        .from("education_applications")
        .select("id")
        .eq("program_id", program.id)
        .eq("applicant_user_id", user.id)
        .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
        redirect(`${applicationPath}?error=unavailable`);
    }
    if (existing) redirect(`${applicationPath}?already=1`);

    const { error: insertError } = await sessionClient
        .from("education_applications")
        .insert({
            program_id: program.id,
            applicant_user_id: user.id,
            applicant_full_name: fullName,
            applicant_email: contactEmail,
            college_name: institutionName || null,
            consent_version: applicationConsentVersion,
            consent_at: new Date().toISOString(),
            status: "submitted",
            submitted_at: new Date().toISOString(),
        });

    if (insertError) {
        if (insertError.code === "23505") redirect(`${applicationPath}?already=1`);
        if (insertError.code === "42P01" || insertError.code === "PGRST205") {
            redirect(`${applicationPath}?error=unavailable`);
        }
        if (insertError.code === "42501") redirect(`${applicationPath}?error=not-open`);
        redirect(`${applicationPath}?error=submit-failed`);
    }

    revalidatePath("/education");
    revalidatePath(applicationPath);
    revalidatePath("/admin/education");
    revalidatePath("/admin/education/applications");
    redirect(`${applicationPath}?submitted=1`);
}

export async function reviewEducationApplication(formData: FormData): Promise<never> {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile, error: profileError } = await sessionClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profileError || profile?.role !== "admin") redirect("/dashboard");

    const applicationId = String(formData.get("application_id") ?? "").trim();
    const toStatus = String(formData.get("status") ?? "");
    const privateNote = String(formData.get("private_note") ?? "").trim();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)) {
        redirect("/admin/education/applications?error=invalid-reference");
    }
    if (!applicationStatuses.has(toStatus)) {
        redirect("/admin/education/applications?error=invalid-status");
    }
    if (privateNote.length > 2000) {
        redirect("/admin/education/applications?error=note-too-long");
    }

    const { error } = await sessionClient.rpc("review_education_application", {
        p_application_id: applicationId,
        p_to_status: toStatus,
        p_private_note: privateNote,
    });

    if (error) {
        if (error.code === "42501") redirect("/admin/education/applications?error=not-authorized");
        if (error.code === "PGRST202" || error.code === "42883") {
            redirect("/admin/education/applications?error=migration-required");
        }
        redirect("/admin/education/applications?error=review-failed");
    }

    revalidatePath("/admin/education/applications");
    revalidatePath("/admin/education");
    redirect("/admin/education/applications?updated=1");
}
