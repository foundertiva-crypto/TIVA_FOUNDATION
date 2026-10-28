import { requireEducationAdmin } from "@/lib/education/admin-guard";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, ClipboardCheck, ExternalLink, FileClock, UserRoundCheck } from "lucide-react";
import { reviewEducationApplication } from "@/app/actions/education";
import { createAdminClient } from "@/lib/supabase/admin";

type ApplicationRow = {
  id: string;
  reference_code: string;
  program_id: string;
  applicant_user_id: string;
  applicant_full_name: string;
  applicant_email: string;
  applicant_phone: string | null;
  college_name: string | null;
  status: string;
  submitted_at: string;
};

type ReviewRow = {
  id: string;
  application_id: string;
  reviewer_user_id: string;
  from_status: string | null;
  to_status: string;
  private_note: string;
  created_at: string;
};

type Props = {
  searchParams: Promise<{ error?: string; updated?: string }>;
};

const errorMessages: Record<string,string> = {
  "invalid-reference": "The application reference is invalid.",
  "invalid-status": "Choose a valid review status.",
  "note-too-long": "Review notes must be 2,000 characters or fewer.",
  "not-authorized": "Your account is not authorised to review this application.",
  "migration-required": "The audited review migration is not installed in this database.",
  "review-failed": "The review was not saved. No status change is confirmed.",
};

const transitionOptions: Record<string,string[]> = {
  submitted: ["under_review","needs_information","accepted","waitlisted","rejected"],
  under_review: ["needs_information","accepted","waitlisted","rejected"],
  needs_information: ["under_review","accepted","waitlisted","rejected","withdrawn"],
  waitlisted: ["under_review","accepted","rejected","withdrawn"],
  accepted: ["withdrawn"],
  rejected: ["under_review"],
  withdrawn: [],
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      }).format(date);
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default async function EducationApplicationsAdminPage({ searchParams }: Props) {
  await requireEducationAdmin();
  const query = await searchParams;
  const errorMessage = query.error ? errorMessages[query.error] ?? "The requested operation could not be completed." : null;

  let ready = false;
  let applications: ApplicationRow[] = [];
  let reviews: ReviewRow[] = [];
  let programTitles = new Map<string,string>();

  try {
    const admin = createAdminClient();
    const [applicationResult, programResult, reviewResult] = await Promise.all([
      admin.from("education_applications")
        .select("id,reference_code,program_id,applicant_user_id,applicant_full_name,applicant_email,applicant_phone,college_name,status,submitted_at")
        .order("submitted_at", { ascending: false })
        .limit(200),
      admin.from("education_programs").select("id,title"),
      admin.from("education_application_reviews")
        .select("id,application_id,reviewer_user_id,from_status,to_status,private_note,created_at")
        .order("created_at", { ascending: false })
        .limit(300),
    ]);

    if (!applicationResult.error && !programResult.error && !reviewResult.error) {
      ready = true;
      applications = (applicationResult.data ?? []) as ApplicationRow[];
      reviews = (reviewResult.data ?? []) as ReviewRow[];
      programTitles = new Map((programResult.data ?? []).map((p) => [p.id as string, p.title as string]));
    }
  } catch {
    ready = false;
  }

  const reviewsByApplication = new Map<string,ReviewRow[]>();
  for (const review of reviews) {
    const existing = reviewsByApplication.get(review.application_id) ?? [];
    existing.push(review);
    reviewsByApplication.set(review.application_id, existing);
  }

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "clamp(16px, 3vw, 32px)", color: "var(--text-primary)" }}>
      <Link href="/admin/education" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}><ArrowLeft size={15} /> Education operations</Link>

      <header style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
        <div>
          <p style={{ color: "var(--brand-secondary)", fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>TIVA World Foundation</p>
          <h1 style={{ fontSize: "clamp(25px, 4vw, 36px)", fontWeight: 850, letterSpacing: "-.035em", marginTop: 6 }}>Education application review</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 8, maxWidth: 850 }}>Restricted staff queue. Every status change goes through the server-authorised review function and records a review-history entry. Decisions still require a human reviewer.</p>
        </div>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center", border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "8px 12px", fontSize: 11, fontWeight: 800, color: "var(--text-secondary)" }}><UserRoundCheck size={15} /> ADMIN-ONLY</span>
      </header>

      {query.updated && <div role="status" style={{ border: "1px solid rgba(0,201,135,.35)", background: "rgba(0,201,135,.07)", borderRadius: 10, padding: 13, marginTop: 18, fontSize: 13 }}>Application review saved. Confirm the updated status and history below.</div>}
      {errorMessage && <div role="alert" style={{ border: "1px solid rgba(255,107,107,.35)", background: "rgba(255,107,107,.07)", borderRadius: 10, padding: 13, marginTop: 18, fontSize: 13 }}>{errorMessage}</div>}

      {!ready ? (
        <section style={{ marginTop: 22, padding: 20, border: "1px solid rgba(212,167,44,.35)", borderRadius: 14, background: "rgba(212,167,44,.06)" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800 }}><AlertTriangle size={18} color="#D4A72C" /> Education database not verified</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>The application or review-history query failed. This can mean migrations are not installed or database access is not configured. The queue is intentionally not replaced with demo data.</p>
          <Link href="https://github.com/foundertiva-crypto/TIVA_FOUNDATION/blob/feat/tiva-education-foundation-pilot-20261029/supabase/migrations/202610290004_education_review_and_readiness.sql" target="_blank" rel="noreferrer" style={{ color: "var(--brand-secondary)", display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12, marginTop: 10 }}>Review application workflow migration <ExternalLink size={13} /></Link>
        </section>
      ) : applications.length === 0 ? (
        <section style={{ marginTop: 22, padding: 24, border: "1px solid var(--border-subtle)", borderRadius: 14, background: "var(--bg-card)" }}>
          <h2 style={{ fontSize: 19, fontWeight: 800 }}>No applications recorded</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 7 }}>Applications will appear here after a learner submits the form for a published programme.</p>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 14, marginTop: 22 }}>
          {applications.map((application) => {
            const options = transitionOptions[application.status] ?? [];
            const history = reviewsByApplication.get(application.id) ?? [];
            return (
              <article key={application.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: 16, padding: "clamp(16px, 3vw, 24px)", background: "var(--bg-card)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 15, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ color: "var(--brand-secondary)", fontSize: 10, fontWeight: 850, letterSpacing: ".12em", textTransform: "uppercase" }}>{application.reference_code}</p>
                    <h2 style={{ fontSize: 19, fontWeight: 800, marginTop: 5 }}>{application.applicant_full_name}</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 5 }}>{application.applicant_email}{application.applicant_phone ? ` · ${application.applicant_phone}` : ""}</p>
                    {application.college_name && <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>Institution: {application.college_name}</p>}
                    <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 7 }}>Programme: {programTitles.get(application.program_id) ?? "Programme reference unavailable"} · Submitted {formatDate(application.submitted_at)}</p>
                  </div>
                  <span style={{ border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 850, textTransform: "uppercase", color: application.status === "accepted" ? "#00C987" : "var(--text-secondary)" }}>{statusLabel(application.status)}</span>
                </div>

                {options.length > 0 ? (
                  <form action={reviewEducationApplication} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 10, marginTop: 18, borderTop: "1px solid var(--border-subtle)", paddingTop: 16 }}>
                    <input type="hidden" name="application_id" value={application.id} />
                    <label style={{ display: "grid", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>Next status
                      <select name="status" required defaultValue={options[0]} style={{ minHeight: 42, border: "1px solid var(--border-accent)", borderRadius: 9, padding: "9px 10px", background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
                        {options.map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}
                      </select>
                    </label>
                    <label style={{ display: "grid", gap: 6, color: "var(--text-secondary)", fontSize: 12, gridColumn: "1 / -1" }}>Private review note (visible to authorised reviewers)
                      <textarea name="private_note" maxLength={2000} rows={2} placeholder="Record the decision rationale or follow-up required." style={{ minHeight: 42, border: "1px solid var(--border-accent)", borderRadius: 9, padding: 10, background: "var(--bg-secondary)", color: "var(--text-primary)", resize: "vertical" }} />
                    </label>
                    <button type="submit" className="btn-primary" style={{ border: 0, borderRadius: 9, padding: "12px 14px", fontWeight: 800, cursor: "pointer", gridColumn: "1 / -1" }}><ClipboardCheck size={15} style={{ display: "inline", verticalAlign: "middle", marginRight: 7 }} />Save audited decision</button>
                  </form>
                ) : <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 15 }}>No further status transitions are available under the current review rules.</p>}

                <details style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 16, paddingTop: 12 }}>
                  <summary style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12, fontWeight: 800, color: "var(--text-secondary)" }}><FileClock size={14} /> Review history ({history.length})</summary>
                  {history.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 10 }}>No staff decisions are recorded for this application.</p> : (
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {history.map((review) => <div key={review.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: 9, padding: 11 }}>
                        <p style={{ fontSize: 12, fontWeight: 800 }}>{review.from_status ? statusLabel(review.from_status) : "Application created"} → {statusLabel(review.to_status)}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 4 }}>{formatDate(review.created_at)} · reviewer {review.reviewer_user_id.slice(0, 8)}</p>
                        {review.private_note && <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.6, marginTop: 6 }}>{review.private_note}</p>}
                      </div>)}
                    </div>
                  )}
                </details>
              </article>
            );
          })}
        </div>
      )}

      <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.7, marginTop: 24 }}>This queue contains applicant personal information and private review notes. Do not export or forward them outside approved Foundation processes. Admission decisions and certificate eligibility remain human responsibilities.</p>
    </div>
  );
}
