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
        const { error } = await sessionClient.from("education_programs").insert({
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(privacyContactEmail) || privacyContactEmail.length > 254) {
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
        if (!/^\d{4}-\d{2}-\d{2}$/.test(closingDate)) {
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


export async function createEducationCohort(formData: FormData): Promise<never> {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile, error: profileError } = await sessionClient
        .from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "admin") redirect("/dashboard");

    const programId = String(formData.get("program_id") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
    const title = String(formData.get("title") ?? "").trim();
    const startDate = String(formData.get("start_date") ?? "").trim();
    const endDate = String(formData.get("end_date") ?? "").trim();
    const capacity = Number(String(formData.get("capacity") ?? "50").trim());
    const deliveryMode = String(formData.get("delivery_mode") ?? "hybrid");

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(programId)) {
        redirect("/admin/education/cohorts?error=invalid-program");
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) redirect("/admin/education/cohorts?error=invalid-slug");
    if (title.length < 3 || title.length > 160) redirect("/admin/education/cohorts?error=invalid-title");
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100000) redirect("/admin/education/cohorts?error=invalid-capacity");
    if (!allowedDeliveryModes.has(deliveryMode)) redirect("/admin/education/cohorts?error=invalid-mode");

    const datePattern = /^\\d{4}-\\d{2}-\\d{2}$/;
    if ((startDate && !datePattern.test(startDate)) || (endDate && !datePattern.test(endDate))) {
        redirect("/admin/education/cohorts?error=invalid-date");
    }
    if (startDate && Number.isNaN(Date.parse(startDate + "T00:00:00Z"))) redirect("/admin/education/cohorts?error=invalid-date");
    if (endDate && Number.isNaN(Date.parse(endDate + "T00:00:00Z"))) redirect("/admin/education/cohorts?error=invalid-date");
    if (startDate && endDate && endDate < startDate) redirect("/admin/education/cohorts?error=date-order");

    const { data: program, error: programError } = await sessionClient
        .from("education_programs")
        .select("id,capacity")
        .eq("id", programId)
        .maybeSingle();
    if (programError || !program) redirect("/admin/education/cohorts?error=program-unavailable");
    if (capacity > program.capacity) redirect("/admin/education/cohorts?error=capacity-exceeds-program");

    const { error: insertError } = await sessionClient.from("education_cohorts").insert({
        program_id: programId,
        slug,
        title,
        start_date: startDate || null,
        end_date: endDate || null,
        timezone: "Asia/Kolkata",
        delivery_mode: deliveryMode,
        capacity,
        status: "draft",
        created_by: user.id,
    });

    if (insertError) {
        if (insertError.code === "23505") redirect("/admin/education/cohorts?error=duplicate-slug");
        if (insertError.code === "42P01" || insertError.code === "PGRST205") redirect("/admin/education/cohorts?error=migration-required");
        redirect("/admin/education/cohorts?error=create-failed");
    }

    revalidatePath("/admin/education");
    revalidatePath("/admin/education/cohorts");
    redirect("/admin/education/cohorts?created=1");
}

export async function createEducationSession(formData: FormData): Promise<never> {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile, error: profileError } = await sessionClient
        .from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "admin") redirect("/dashboard");

    const cohortId = String(formData.get("cohort_id") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const startsLocal = String(formData.get("starts_at") ?? "").trim();
    const endsLocal = String(formData.get("ends_at") ?? "").trim();
    const deliveryMode = String(formData.get("delivery_mode") ?? "hybrid");
    const locationLabel = String(formData.get("location_label") ?? "").trim();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cohortId)) redirect("/admin/education/cohorts?error=invalid-cohort");
    if (title.length < 3 || title.length > 180) redirect("/admin/education/cohorts?error=session-title");
    if (description.length > 2000 || locationLabel.length > 180) redirect("/admin/education/cohorts?error=session-details");
    if (!allowedDeliveryModes.has(deliveryMode)) redirect("/admin/education/cohorts?error=invalid-mode");
    const localDateTimePattern = /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/;
    if (!localDateTimePattern.test(startsLocal) || !localDateTimePattern.test(endsLocal)) redirect("/admin/education/cohorts?error=session-dates");

    // datetime-local input is interpreted explicitly as India Standard Time, not server-local time.
    const startsAt = new Date(`${startsLocal}:00+05:30`);
    const endsAt = new Date(`${endsLocal}:00+05:30`);
    if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())
        || startsAt.getTime() <= Date.now() || endsAt.getTime() <= startsAt.getTime()) {
        redirect("/admin/education/cohorts?error=session-time-order");
    }

    const { data: cohort, error: cohortError } = await sessionClient
        .from("education_cohorts")
        .select("id,status")
        .eq("id", cohortId)
        .maybeSingle();
    if (cohortError || !cohort) redirect("/admin/education/cohorts?error=cohort-unavailable");
    if (cohort.status === "cancelled" || cohort.status === "completed") redirect("/admin/education/cohorts?error=cohort-closed");

    const { error: insertError } = await sessionClient.from("education_sessions").insert({
        cohort_id: cohortId,
        title,
        description,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        delivery_mode: deliveryMode,
        location_label: locationLabel || null,
        published: false,
        created_by: user.id,
    });
    if (insertError) {
        if (insertError.code === "42P01" || insertError.code === "PGRST205") redirect("/admin/education/cohorts?error=migration-required");
        redirect("/admin/education/cohorts?error=session-create-failed");
    }

    revalidatePath("/admin/education/cohorts");
    revalidatePath("/education/my-applications");
    redirect("/admin/education/cohorts?session-created=1");
}

export async function setEducationCohortStatus(formData: FormData): Promise<never> {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile, error: profileError } = await sessionClient
        .from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "admin") redirect("/dashboard");

    const cohortId = String(formData.get("cohort_id") ?? "").trim();
    const targetStatus = String(formData.get("status") ?? "");
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cohortId)) redirect("/admin/education/cohorts?error=invalid-cohort");
    if (!["active", "completed", "cancelled"].includes(targetStatus)) redirect("/admin/education/cohorts?error=invalid-cohort-status");

    const { data: cohort, error: loadError } = await sessionClient
        .from("education_cohorts").select("id,program_id,status").eq("id", cohortId).maybeSingle();
    if (loadError || !cohort) redirect("/admin/education/cohorts?error=cohort-unavailable");

    if (targetStatus === "active" && cohort.status !== "draft") redirect("/admin/education/cohorts?error=invalid-cohort-transition");
    if (targetStatus === "completed" && cohort.status !== "active") redirect("/admin/education/cohorts?error=invalid-cohort-transition");
    if (targetStatus === "cancelled" && !["draft", "active"].includes(cohort.status)) redirect("/admin/education/cohorts?error=invalid-cohort-transition");

    if (targetStatus === "active") {
        const [{ data: program }, { count: sessionsCount, error: sessionsError }] = await Promise.all([
            sessionClient.from("education_programs").select("status").eq("id", cohort.program_id).maybeSingle(),
            sessionClient.from("education_sessions").select("id", { count: "exact", head: true }).eq("cohort_id", cohortId),
        ]);
        if (!program || program.status !== "published") redirect("/admin/education/cohorts?error=program-not-published");
        if (sessionsError || !sessionsCount || sessionsCount < 1) redirect("/admin/education/cohorts?error=session-required");
    }

    const { error: updateError } = await sessionClient
        .from("education_cohorts").update({ status: targetStatus }).eq("id", cohortId);
    if (updateError) redirect("/admin/education/cohorts?error=cohort-update-failed");

    revalidatePath("/admin/education/cohorts");
    revalidatePath("/admin/education");
    redirect("/admin/education/cohorts?cohort-updated=1");
}

export async function setEducationSessionPublished(formData: FormData): Promise<never> {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile, error: profileError } = await sessionClient
        .from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "admin") redirect("/dashboard");

    const sessionId = String(formData.get("session_id") ?? "").trim();
    const publish = formData.get("published") === "yes";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) redirect("/admin/education/cohorts?error=invalid-session");

    const { data: session, error: sessionError } = await sessionClient
        .from("education_sessions")
        .select("id,cohort_id,starts_at,ends_at,published")
        .eq("id", sessionId)
        .maybeSingle();
    if (sessionError || !session) redirect("/admin/education/cohorts?error=session-unavailable");
    if (publish && session.published) redirect("/admin/education/cohorts?error=session-already-published");
    if (publish && Date.parse(session.starts_at) <= Date.now()) redirect("/admin/education/cohorts?error=session-already-started");

    if (publish) {
        const { data: cohort } = await sessionClient
            .from("education_cohorts")
            .select("id,status,program_id")
            .eq("id", session.cohort_id)
            .maybeSingle();
        if (!cohort || cohort.status !== "active") redirect("/admin/education/cohorts?error=activate-cohort-first");
        const { data: program } = await sessionClient
            .from("education_programs")
            .select("id,status")
            .eq("id", cohort.program_id)
            .maybeSingle();
        if (!program || program.status !== "published") redirect("/admin/education/cohorts?error=program-not-published");
    }

    const { error: updateError } = await sessionClient
        .from("education_sessions")
        .update({ published: publish })
        .eq("id", sessionId);
    if (updateError) redirect("/admin/education/cohorts?error=session-publish-failed");

    revalidatePath("/admin/education/cohorts");
    revalidatePath("/education/my-applications");
    redirect("/admin/education/cohorts?session-updated=1");
}


export async function recordEducationAttendance(formData: FormData): Promise<never> {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile, error: profileError } = await sessionClient
        .from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "admin") redirect("/dashboard");

    const sessionId = String(formData.get("session_id") ?? "").trim();
    const enrollmentId = String(formData.get("enrollment_id") ?? "").trim();
    const status = String(formData.get("attendance_status") ?? "");
    const correctionReason = String(formData.get("correction_reason") ?? "").trim();

    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(sessionId) || !uuidPattern.test(enrollmentId)) redirect("/admin/education/attendance?error=invalid-reference");
    if (!["present","late","absent","excused"].includes(status)) redirect("/admin/education/attendance?error=invalid-status");
    if (correctionReason.length > 500) redirect("/admin/education/attendance?error=reason-too-long");

    const { data: session, error: sessionError } = await sessionClient
        .from("education_sessions")
        .select("id,cohort_id,starts_at,published")
        .eq("id", sessionId)
        .maybeSingle();
    if (sessionError || !session) redirect("/admin/education/attendance?error=session-unavailable");
    if (!session.published) redirect("/admin/education/attendance?error=session-not-published");
    if (Date.parse(session.starts_at) > Date.now()) redirect("/admin/education/attendance?error=session-not-started");

    const { data: enrollment, error: enrollmentError } = await sessionClient
        .from("education_enrollments")
        .select("id,cohort_id,learner_user_id,status")
        .eq("id", enrollmentId)
        .maybeSingle();
    if (enrollmentError || !enrollment) redirect("/admin/education/attendance?error=enrollment-unavailable");
    if (enrollment.cohort_id !== session.cohort_id
        || !["enrolled","active","completed","incomplete"].includes(enrollment.status)) {
        redirect("/admin/education/attendance?error=enrollment-mismatch");
    }

    const { data: existing, error: existingError } = await sessionClient
        .from("education_attendance")
        .select("id,attendance_status,recorded_by,recorded_at,last_corrected_by,last_corrected_at")
        .eq("session_id", sessionId)
        .eq("enrollment_id", enrollmentId)
        .maybeSingle();
    if (existingError) redirect("/admin/education/attendance?error=database");

    const now = new Date().toISOString();
    if (existing) {
        if (existing.attendance_status === status) redirect("/admin/education/attendance?saved=1");
        if (correctionReason.length < 5) redirect("/admin/education/attendance?error=correction-reason-required");

        const { error: updateError } = await sessionClient
            .from("education_attendance")
            .update({
                attendance_status: status,
                correction_reason: correctionReason,
                last_corrected_by: user.id,
                last_corrected_at: now,
            })
            .eq("id", existing.id);

        if (updateError) {
            if (updateError.code === "42501") redirect("/admin/education/attendance?error=not-authorized");
            redirect("/admin/education/attendance?error=correction-failed");
        }
    } else {
        const { error: insertError } = await sessionClient
            .from("education_attendance")
            .insert({
                session_id: sessionId,
                cohort_id: session.cohort_id,
                enrollment_id: enrollment.id,
                learner_user_id: enrollment.learner_user_id,
                attendance_status: status,
                correction_reason: null,
                recorded_by: user.id,
                recorded_at: now,
            });

        if (insertError) {
            if (insertError.code === "42501") redirect("/admin/education/attendance?error=not-authorized");
            if (insertError.code === "23505") redirect("/admin/education/attendance?saved=1");
            redirect("/admin/education/attendance?error=record-failed");
        }
    }

    revalidatePath("/admin/education/attendance");
    revalidatePath("/education/my-applications");
    redirect("/admin/education/attendance?saved=1");
}


export async function enrollAcceptedEducationApplicant(formData: FormData): Promise<never> {
    const sessionClient = await createClient();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile, error: profileError } = await sessionClient
        .from("profiles").select("role").eq("id", user.id).single();
    if (profileError || profile?.role !== "admin") redirect("/dashboard");

    const applicationId = String(formData.get("application_id") ?? "").trim();
    const cohortId = String(formData.get("cohort_id") ?? "").trim();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(applicationId) || !uuidPattern.test(cohortId)) {
        redirect("/admin/education/cohorts?error=invalid-enrolment-reference");
    }

    const [{ data: application, error: applicationError }, { data: cohort, error: cohortError }] = await Promise.all([
        sessionClient.from("education_applications")
            .select("id,program_id,applicant_user_id,status,reference_code")
            .eq("id", applicationId)
            .maybeSingle(),
        sessionClient.from("education_cohorts")
            .select("id,program_id,status")
            .eq("id", cohortId)
            .maybeSingle(),
    ]);

    if (applicationError || !application) redirect("/admin/education/cohorts?error=application-unavailable");
    if (cohortError || !cohort) redirect("/admin/education/cohorts?error=cohort-unavailable");
    if (application.status !== "accepted") redirect("/admin/education/cohorts?error=application-not-accepted");
    if (application.program_id !== cohort.program_id) redirect("/admin/education/cohorts?error=programme-cohort-mismatch");
    if (cohort.status !== "active") redirect("/admin/education/cohorts?error=cohort-not-active");

    const { data: program, error: programError } = await sessionClient
        .from("education_programs").select("status").eq("id", cohort.program_id).maybeSingle();
    if (programError || !program || program.status !== "published") {
        redirect("/admin/education/cohorts?error=program-not-published");
    }

    const { data: existing, error: existingError } = await sessionClient
        .from("education_enrollments")
        .select("id")
        .eq("application_id", applicationId)
        .maybeSingle();
    if (existingError) redirect("/admin/education/cohorts?error=enrolment-check-failed");
    if (existing) redirect("/admin/education/cohorts?error=already-enrolled");

    const { error: insertError } = await sessionClient.from("education_enrollments").insert({
        cohort_id: cohortId,
        learner_user_id: application.applicant_user_id,
        application_id: applicationId,
        status: "enrolled",
        created_by: user.id,
    });

    if (insertError) {
        if (insertError.code === "23505") redirect("/admin/education/cohorts?error=already-enrolled");
        if (insertError.code === "23514") redirect("/admin/education/cohorts?error=capacity-or-integrity");
        if (insertError.code === "42501") redirect("/admin/education/cohorts?error=not-authorized");
        redirect("/admin/education/cohorts?error=enrolment-failed");
    }

    revalidatePath("/admin/education/cohorts");
    revalidatePath("/admin/education/attendance");
    revalidatePath("/education/my-applications");
    redirect("/admin/education/cohorts?enrolled=1");
}
