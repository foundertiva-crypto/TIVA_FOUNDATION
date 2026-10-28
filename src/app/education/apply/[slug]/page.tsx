import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, GraduationCap, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { submitEducationApplication } from "@/app/actions/education";

type Programme = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  languages: string[];
  delivery_mode: string;
  eligibility: string;
  capacity: number;
  application_opens_at: string | null;
  application_closes_at: string | null;
  privacy_notice_version: string | null;
  privacy_contact_email: string | null;
  retention_statement: string | null;
  privacy_notice_attested_at: string | null;
  safeguarding_owner_user_id: string | null;
  lms_course_ref: string | null;
  launch_ready_attested_at: string | null;
};

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; submitted?: string; already?: string }>;
};

const errorMessages: Record<string, string> = {
  "invalid-programme": "That programme reference is invalid.",
  "invalid-name": "Enter your full name using 2–180 characters.",
  "invalid-email": "Enter a valid contact email address.",
  "invalid-college": "Institution name must be 180 characters or fewer.",
  "consent-required": "Read the programme privacy notice and confirm consent before submitting.",
  "rate-limited": "Too many attempts were made. Try again later.",
  "not-open": "This programme is not accepting applications right now.",
  "unavailable": "The application service is temporarily unavailable. No submission is confirmed.",
  "submit-failed": "The application could not be saved. Please retry later.",
};

function formatDate(value: string | null) {
  if (!value) return "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(date);
}

function windowOpen(program: Programme) {
  const now = Date.now();
  const opens = program.application_opens_at ? Date.parse(program.application_opens_at) : Number.NaN;
  const closes = program.application_closes_at ? Date.parse(program.application_closes_at) : Number.NaN;
  return Number.isFinite(opens) && Number.isFinite(closes)
    && opens <= now && closes > now
    && Boolean(program.privacy_notice_version && program.privacy_contact_email && program.retention_statement
      && program.privacy_notice_attested_at && program.safeguarding_owner_user_id
      && program.lms_course_ref && program.launch_ready_attested_at);
}

export default async function EducationApplicationPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) notFound();

  const supabase = await createClient();
  const [{ data: user }, { data: programme, error: programError }] = await Promise.all([
    supabase.auth.getUser().then((r) => ({ data: r.data.user })),
    supabase.from("education_programs")
      .select("id,slug,title,summary,languages,delivery_mode,eligibility,capacity,application_opens_at,application_closes_at,privacy_notice_version,privacy_contact_email,retention_statement,privacy_notice_attested_at,safeguarding_owner_user_id,lms_course_ref,launch_ready_attested_at")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle(),
  ]);

  if (programError || !programme) notFound();
  const program = programme as Programme;
  const accepting = windowOpen(program);

  let existingApplication: { reference_code: string; status: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("education_applications")
      .select("reference_code,status")
      .eq("program_id", program.id)
      .eq("applicant_user_id", user.id)
      .maybeSingle();
    existingApplication = data;
  }

  const success = query.submitted === "1" || query.already === "1" || Boolean(existingApplication);
  const errorText = query.error ? errorMessages[query.error] ?? "The request could not be completed." : null;

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "clamp(18px, 4vw, 44px)" }}>
      <div style={{ maxWidth: 850, margin: "0 auto" }}>
        <Link href="/education" style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--text-secondary)", fontSize: 13, textDecoration: "none" }}><ArrowLeft size={15} /> All education programmes</Link>

        <header style={{ marginTop: 28, marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 13, background: "var(--gradient-brand)" }}><GraduationCap size={23} color="white" /></div>
            <p style={{ fontSize: 11, color: "var(--brand-secondary)", fontWeight: 800, letterSpacing: ".13em", textTransform: "uppercase" }}>TIVA World Foundation</p>
          </div>
          <h1 style={{ fontSize: "clamp(27px, 5vw, 40px)", lineHeight: 1.15, letterSpacing: "-.035em", fontWeight: 850, marginTop: 15 }}>{program.title}</h1>
          {program.summary && <p style={{ color: "var(--text-secondary)", lineHeight: 1.75, marginTop: 10 }}>{program.summary}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, color: "var(--text-secondary)", fontSize: 12 }}>
            <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><CalendarDays size={14} /> Closes {formatDate(program.application_closes_at)}</span>
            <span style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><ShieldCheck size={14} /> Notice {program.privacy_notice_version ?? "unavailable"}</span>
          </div>
        </header>

        {errorText && <div role="alert" style={{ border: "1px solid rgba(255,107,107,.35)", background: "rgba(255,107,107,.07)", borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 13 }}>{errorText}</div>}

        {success && (
          <section role="status" style={{ border: "1px solid rgba(0,201,135,.35)", background: "rgba(0,201,135,.07)", borderRadius: 15, padding: 20, marginBottom: 18 }}>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>Application status</h2>
            {existingApplication ? (
              <>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>Your application is recorded in the Foundation system. Save this reference for your follow-up.</p>
                <p style={{ fontSize: 14, marginTop: 12 }}><strong>Reference:</strong> {existingApplication.reference_code}</p>
                <p style={{ fontSize: 13, marginTop: 5 }}><strong>Status:</strong> {existingApplication.status.replace("_", " ")}</p>
              </>
            ) : (
              <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>The request was returned successfully, but the application record was not re-read. Sign in and check this page before submitting again.</p>
            )}
          </section>
        )}

        {!accepting ? (
          <section style={{ border: "1px solid var(--border-subtle)", borderRadius: 15, padding: 20, background: "var(--bg-card)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Applications are not open</h2>
            <p style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>This programme may be before its opening date, past its closing date, paused, or missing a required readiness record.</p>
          </section>
        ) : existingApplication ? null : !user ? (
          <section style={{ border: "1px solid var(--border-subtle)", borderRadius: 15, padding: 22, background: "var(--bg-card)" }}>
            <h2 style={{ fontSize: 19, fontWeight: 800 }}>Sign in to apply</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>The Foundation uses phone OTP sign-in to associate an application with your account. After sign-in, return here to complete the form.</p>
            <Link href={`/login?next=${encodeURIComponent(`/education/apply/${program.slug}`)}`} className="btn-primary" style={{ marginTop: 16, textDecoration: "none", display: "inline-flex", gap: 8, alignItems: "center" }}>Sign in to continue</Link>
          </section>
        ) : (
          <form action={submitEducationApplication} style={{ display: "grid", gap: 16, border: "1px solid var(--border-subtle)", borderRadius: 16, padding: "clamp(18px, 4vw, 30px)", background: "var(--bg-card)" }}>
            <input type="hidden" name="program_slug" value={program.slug} />
            <h2 style={{ fontSize: 21, fontWeight: 800 }}>Application form</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>Fields marked required are needed for programme review. Do not upload identity documents or sensitive personal information here.</p>

            <label style={{ display: "grid", gap: 7, fontSize: 13, color: "var(--text-secondary)" }}>Full name
              <input name="full_name" required minLength={2} maxLength={180} autoComplete="name" className="input-field" placeholder="Your full name" />
            </label>
            <label style={{ display: "grid", gap: 7, fontSize: 13, color: "var(--text-secondary)" }}>Contact email
              <input name="contact_email" required type="email" maxLength={254} autoComplete="email" className="input-field" placeholder="you@example.com" />
            </label>
            <label style={{ display: "grid", gap: 7, fontSize: 13, color: "var(--text-secondary)" }}>College / institution
              <input name="institution_name" maxLength={180} autoComplete="organization" className="input-field" placeholder="College or institution name" />
            </label>

            <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 14, fontSize: 12, lineHeight: 1.7, color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>Before you consent</strong>
              <p style={{ marginTop: 6 }}>This notice explains why the Foundation collects your application details, who can access them, and how long they are retained. Review the programme-specific notice before submitting.</p>
              <p style={{ marginTop: 7 }}>Purpose: application review and programme communication; if selected, enrolment, attendance, learning and assessment administration. Only authorised Foundation staff should access individual application records.</p>
              <p style={{ marginTop: 7 }}>Retention: {program.retention_statement}</p>
              <p style={{ marginTop: 7 }}>Privacy contact: <a href={`mailto:${program.privacy_contact_email}`} style={{ color: "var(--brand-secondary)" }}>{program.privacy_contact_email}</a></p>
              <Link href={`/education/privacy/${program.slug}`} style={{ color: "var(--brand-secondary)", display: "inline-block", marginTop: 8 }}>Read full programme privacy notice ↗</Link>
            </div>

            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, lineHeight: 1.7, color: "var(--text-secondary)" }}>
              <input type="checkbox" name="consent" value="yes" required style={{ marginTop: 4 }} />
              <span>I confirm these details are accurate and consent to the processing described in the programme privacy notice, version <strong>{program.privacy_notice_version}</strong>.</span>
            </label>

            <button type="submit" className="btn-primary" style={{ border: 0, borderRadius: 10, padding: "13px 18px", fontWeight: 800, cursor: "pointer" }}>Submit application</button>
            <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.6 }}>Submitting does not guarantee admission or certificate issuance. The Foundation reviews applications before making a decision.</p>
          </form>
        )}

        <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.7, marginTop: 22 }}>If the application form is unavailable or you need an accessible alternative, use the official Foundation contact details shown in the privacy notice.</p>
      </div>
    </main>
  );
}
