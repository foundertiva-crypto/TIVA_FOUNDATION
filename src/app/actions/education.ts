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

export async function attestEducationProgramReadiness(formData: FormData): Promise<never> {
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
    const noticeVersion = String(formData.get("privacy_notice_version") ?? "").trim();
    const privacyContactEmail = String(formData.get("privacy_contact_email") ?? "").trim().toLowerCase();
    const retentionStatement = String(formData.get("retention_statement") ?? "").trim();
    const safeguardingOwnerId = String(formData.get("safeguarding_owner_user_id") ?? "").trim();
    const lmsCourseRef = String(formData.get("lms_course_ref") ?? "").trim();

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(programId) || !uuidPattern.test(safeguardingOwnerId)) {
        redirect("/admin/education?error=Use%20valid%20programme%20and%20safeguarding-owner%20references.");
    }
    if (!/^[A-Za-z0-9._-]{3,80}$/.test(noticeVersion)) {
        redirect("/admin/education?error=Privacy%20notice%20version%20must%20be%203%E2%80%9380%20letters%2C%20numbers%2C%20dots%2C%20underscores%20or%20hyphens.");
    }
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(privacyContactEmail) || privacyContactEmail.length > 254) {
        redirect("/admin/education?error=Enter%20the%20Foundation-approved%20privacy%20contact%20email.");
    }
    if (retentionStatement.length < 20 || retentionStatement.length > 1500) {
        redirect("/admin/education?error=Write%20a%20specific%20retention%20statement%20between%2020%20and%201500%20characters.");
    }
    if (!/^[A-Za-z0-9._:/#-]{3,200}$/.test(lmsCourseRef) || lmsCourseRef.includes("..")) {
        redirect("/admin/education?error=Use%20a%20non-secret%20Moodle%20course%20ID%20or%20reference%20without%20tokens.");
    }

    if (formData.get("notice_reviewed") !== "yes"
        || formData.get("retention_reviewed") !== "yes"
        || formData.get("safeguarding_confirmed") !== "yes"
        || formData.get("lms_verified") !== "yes"
        || formData.get("launch_ready_confirmed") !== "yes") {
        redirect("/admin/education?error=All%20readiness%20attestations%20must%20be%20explicitly%20confirmed.");
    }

    // The service role is used only to verify that the nominated owner is an
    // existing account. The actual write uses the authenticated session so
    // database audit events retain the acting administrator.
    const admin = createAdminClient();
    const { data: owner, error: ownerError } = await admin
        .from("profiles")
        .select("id")
        .eq("id", safeguardingOwnerId)
        .maybeSingle();

    if (ownerError || !owner) {
        redirect("/admin/education?error=Safeguarding%20owner%20must%20be%20an%20existing%20Foundation%20account.");
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await sessionClient
        .from("education_programs")
        .update({
            privacy_notice_version: noticeVersion,
            privacy_contact_email: privacyContactEmail,
            retention_statement: retentionStatement,
            privacy_notice_attested_by: user.id,
            privacy_notice_attested_at: now,
            safeguarding_owner_user_id: safeguardingOwnerId,
            lms_course_ref: lmsCourseRef,
            launch_ready_attested_by: user.id,
            launch_ready_attested_at: now,
        })
        .eq("id", programId)
        .select("id")
        .maybeSingle();

    if (updateError || !updated) {
        redirect("/admin/education?error=Readiness%20could%20not%20be%20saved.%20Run%20the%20latest%20staging%20migration%20and%20verify%20admin%20permissions.");
    }

    revalidatePath("/admin/education");
    revalidatePath("/education");
    revalidatePath(`/education/privacy`);
    redirect("/admin/education?readiness=1");
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
        .select("id,status,privacy_notice_version,privacy_contact_email,retention_statement,privacy_notice_attested_by,privacy_notice_attested_at,safeguarding_owner_user_id,lms_course_ref,launch_ready_attested_by,launch_ready_attested_at")
        .eq("id", programId)
        .maybeSingle();

    if (loadError || !program) redirect("/admin/education?error=Programme%20could%20not%20be%20loaded.");

    if (mode === "publish" && !["draft", "paused"].includes(program.status)) {
        redirect("/admin/education?error=Only%20draft%20or%20paused%20programmes%20can%20be%20published.");
    }
    if (mode === "pause" && program.status !== "published") {
        redirect("/admin/education?error=Only%20published%20programmes%20can%20be%20paused.");
    }

    if (mode === "publish" && (
        !program.privacy_notice_version
        || !program.privacy_contact_email
        || !program.retention_statement
        || !program.privacy_notice_attested_by
        || !program.privacy_notice_attested_at
        || !program.safeguarding_owner_user_id
        || !program.lms_course_ref
        || !program.launch_ready_attested_by
        || !program.launch_ready_attested_at
    )) {
        redirect("/admin/education?error=Complete%20the%20notice%2C%20retention%2C%20safeguarding%2C%20LMS%20and%20launch%20attestation%20gates%20first.");
    }

    const now = new Date();
    let nextValues: Record<string, string> = {};
    if (mode === "publish") {
        const closingDate = String(formData.get("application_closes_on") ?? "").trim();
        if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(closingDate)) {
            redirect("/admin/education?error=Set%20an%20application%20closing%20date.");
        }
        const closeAt = new Date(`${closingDate}T23:59:59+05:30`);
        if (!Number.isFinite(closeAt.getTime()) || closeAt.getTime() <= now.getTime()) {
            redirect("/admin/education?error=Application%20closing%20date%20must%20be%20in%20the%20future.");
        }
        nextValues = {
            status: "published",
            application_opens_at: now.toISOString(),
            application_closes_at: closeAt.toISOString(),
        };
    } else {
        nextValues = { status: "paused", application_closes_at: now.toISOString() };
    }

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
        .select("id,status,application_opens_at,application_closes_at,privacy_notice_version,privacy_contact_email,retention_statement,privacy_notice_attested_at,safeguarding_owner_user_id,lms_course_ref,launch_ready_attested_at")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();

    if (programError || !program
        || !program.privacy_notice_version
        || !program.privacy_contact_email
        || !program.retention_statement
        || !program.privacy_notice_attested_at
        || !program.safeguarding_owner_user_id
        || !program.lms_course_ref
        || !program.launch_ready_attested_at) {
        redirect(`${applicationPath}?error=not-open`);
    }

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
            consent_version: program.privacy_notice_version,
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
    revalidatePath(`/education/privacy`);
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
