import Link from "next/link";
import type { CSSProperties } from "react";
import { AlertTriangle, ArrowLeft, Award, ExternalLink, ShieldCheck } from "lucide-react";
import { issueEducationCompletionCertificate } from "@/app/actions/education";
import { createAdminClient } from "@/lib/supabase/admin";

type Enrollment = {
  id: string;
  cohort_id: string;
  learner_user_id: string;
  application_id: string | null;
  status: string;
  completion_approved_at: string | null;
  created_at: string;
};
type Cohort = { id: string; program_id: string; title: string; status: string };
type Program = { id: string; title: string };
type Certificate = {
  id: string;
  verification_code: string;
  enrollment_id: string;
  award_title: string;
  status: string;
  issued_at: string;
  revoked_at: string | null;
};
type Profile = { id: string; full_name: string | null };

type Props = { searchParams: Promise<{ error?: string; issued?: string }> };

const errors: Record<string,string> = {
  "invalid-reference": "Select a valid enrolment.",
  "invalid-title": "Certificate title must contain 3–180 characters.",
  "not-authorized": "Your account is not authorised to approve completion and issue certificates.",
  "enrollment-unavailable": "The enrolment could not be loaded.",
  "evidence-required": "Completion is blocked until required attendance and assessment evidence is recorded and accepted.",
  "migration-required": "The certificate workflow migration is missing or the database API schema cache needs a reload.",
  "issue-failed": "The completion/certificate transaction failed. No certificate issuance is confirmed.",
};

const inputStyle: CSSProperties = {
  width: "100%", minHeight: 40, border: "1px solid var(--border-accent)",
  borderRadius: 9, padding: "9px 11px", background: "var(--bg-secondary)",
  color: "var(--text-primary)", outline: "none", fontSize: 12,
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
  }).format(date);
}
function humanize(value: string) { return value.replaceAll("_", " "); }

export default async function EducationCertificatesAdminPage({ searchParams }: Props) {
  const query = await searchParams;
  let ready = false;
  let enrollments: Enrollment[] = [];
  let cohorts = new Map<string,Cohort>();
  let programs = new Map<string,Program>();
  const certificates = new Map<string,Certificate>();
  const names = new Map<string,string>();

  try {
    const admin = createAdminClient();
    const [enrollmentResult, cohortResult, programResult, certificateResult] = await Promise.all([
      admin.from("education_enrollments")
        .select("id,cohort_id,learner_user_id,application_id,status,completion_approved_at,created_at")
        .order("created_at", { ascending: false }).limit(5000),
      admin.from("education_cohorts").select("id,program_id,title,status").limit(1000),
      admin.from("education_programs").select("id,title").limit(1000),
      admin.from("education_certificates")
        .select("id,verification_code,enrollment_id,award_title,status,issued_at,revoked_at")
        .order("issued_at", { ascending: false }).limit(5000),
    ]);

    if (enrollmentResult.error || cohortResult.error || programResult.error || certificateResult.error) {
      throw new Error("Education certificate data unavailable");
    }

    enrollments = (enrollmentResult.data ?? []) as Enrollment[];
    cohorts = new Map(((cohortResult.data ?? []) as Cohort[]).map((row) => [row.id,row]));
    programs = new Map(((programResult.data ?? []) as Program[]).map((row) => [row.id,row]));
    for (const certificate of (certificateResult.data ?? []) as Certificate[]) {
      certificates.set(certificate.enrollment_id, certificate);
    }

    const learnerIds = [...new Set(enrollments.map((row) => row.learner_user_id))];
    if (learnerIds.length > 0) {
      const { data } = await admin.from("profiles").select("id,full_name").in("id", learnerIds.slice(0,5000));
      for (const row of (data ?? []) as Profile[]) names.set(row.id, row.full_name || `Learner ${row.id.slice(0,8)}`);
    }
    ready = true;
  } catch {
    ready = false;
  }

  const eligibleStatuses = new Set(["enrolled","active","incomplete","completed"]);
  const pending = enrollments.filter((enrollment) => eligibleStatuses.has(enrollment.status) && !certificates.has(enrollment.id));
  const issuedCount = [...certificates.values()].filter((certificate) => certificate.status === "issued").length;
  const errorText = query.error ? errors[query.error] ?? "The operation could not be completed." : null;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "clamp(16px,3vw,32px)", color: "var(--text-primary)" }}>
      <Link href="/admin/education" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}><ArrowLeft size={15}/> Education operations</Link>

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap", marginTop: 20 }}>
        <div>
          <p style={{ color: "var(--brand-secondary)", fontSize: 11, fontWeight: 850, letterSpacing: ".14em", textTransform: "uppercase" }}>TIVA World Foundation</p>
          <h1 style={{ fontSize: "clamp(25px,4vw,36px)", fontWeight: 850, letterSpacing: "-.035em", marginTop: 6 }}>Completion & certificates</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, maxWidth: 900, marginTop: 8 }}>Certificate issuance is one atomic, audited action. It requires recorded attendance for all ended published sessions and an accepted latest review for every published or closed assessment in the cohort.</p>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "8px 12px", fontSize: 11, fontWeight: 800, color: "var(--text-secondary)" }}><ShieldCheck size={15}/> EVIDENCE-GATED</span>
      </header>

      {query.issued && <div role="status" style={{ marginTop: 18, border: "1px solid rgba(0,201,135,.35)", background: "rgba(0,201,135,.07)", borderRadius: 10, padding: 13, fontSize: 13 }}>The completion/certificate action succeeded or an existing certificate was returned. The verified register below is the source of truth.</div>}
      {errorText && <div role="alert" style={{ marginTop: 18, border: "1px solid rgba(255,107,107,.35)", background: "rgba(255,107,107,.07)", borderRadius: 10, padding: 13, fontSize: 13 }}>{errorText}</div>}

      {!ready ? (
        <section style={{ marginTop: 22, border: "1px solid rgba(212,167,44,.35)", background: "rgba(212,167,44,.06)", borderRadius: 14, padding: 20 }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 850 }}><AlertTriangle size={18} color="#D4A72C"/> Certificate register unavailable</h2>
          <p style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>The enrolment, cohort or certificate tables could not be verified. No demo certificates are shown as real.</p>
        </section>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,190px),1fr))", gap: 12, marginTop: 22 }}>
            {[
              { label: "Enrolments", value: enrollments.length },
              { label: "Certificates issued", value: issuedCount },
              { label: "Awaiting certificate", value: pending.length },
            ].map((metric) => <div key={metric.label} className="stat-card"><span style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 700 }}>{metric.label}</span><p style={{ fontSize: 29, fontWeight: 850, marginTop: 10 }}>{metric.value}</p></div>)}
          </div>

          <section style={{ marginTop: 27 }}>
            <h2 style={{ fontSize: 21, fontWeight: 850, marginBottom: 13 }}>Issued certificate register</h2>
            {certificates.size === 0 ? <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 14, padding: 20, color: "var(--text-secondary)", fontSize: 13 }}>No certificates have been issued yet.</div> : (
              <div style={{ display: "grid", gap: 10 }}>
                {[...certificates.values()].map((certificate) => {
                  const enrollment = enrollments.find((item) => item.id === certificate.enrollment_id);
                  const cohort = enrollment ? cohorts.get(enrollment.cohort_id) : undefined;
                  const program = cohort ? programs.get(cohort.program_id) : undefined;
                  return <article key={certificate.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: 13, background: "var(--bg-card)", padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 850 }}>{certificate.award_title}</h3>
                        <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 5 }}>{names.get(enrollment?.learner_user_id ?? "") ?? "Learner"} · {program?.title ?? "Programme"} · {cohort?.title ?? "Cohort"}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 5 }}>Issued {formatDate(certificate.issued_at)} · Code {certificate.verification_code}</p>
                      </div>
                      <span style={{ color: certificate.status === "issued" ? "#00C987" : "#F97373", border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "5px 9px", fontSize: 10, fontWeight: 850, textTransform: "uppercase" }}>{certificate.status}</span>
                    </div>
                    <Link href={`/education/certificate/${certificate.verification_code}`} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--brand-secondary)", fontSize: 12, fontWeight: 750, textDecoration: "none", marginTop: 11 }}>Public verification <ExternalLink size={13}/></Link>
                  </article>;
                })}
              </div>
            )}
          </section>

          <section style={{ marginTop: 28 }}>
            <h2 style={{ fontSize: 21, fontWeight: 850, marginBottom: 7 }}>Completion review queue</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.7, marginBottom: 14 }}>Each issue button calls a database transaction. It will mark the enrolment complete and create the certificate only after the database confirms attendance and assessment prerequisites.</p>
            {pending.length === 0 ? (
              <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 14, padding: 20, color: "var(--text-secondary)", fontSize: 13 }}>No unissued eligible enrolments are in the register.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {pending.map((enrollment) => {
                  const cohort = cohorts.get(enrollment.cohort_id);
                  const program = cohort ? programs.get(cohort.program_id) : undefined;
                  const learnerName = names.get(enrollment.learner_user_id) ?? `Learner ${enrollment.learner_user_id.slice(0,8)}`;
                  const defaultTitle = `${program?.title ?? "TIVA Education Programme"} — Completion Certificate`;
                  return <article key={enrollment.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: 14, padding: 17, background: "var(--bg-card)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <h3 style={{ fontSize: 15, fontWeight: 850 }}>{learnerName}</h3>
                        <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 4 }}>{program?.title ?? "Programme unavailable"} · {cohort?.title ?? "Cohort unavailable"}</p>
                        <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 5 }}>Enrolment {enrollment.id.slice(0,8)} · {humanize(enrollment.status)} · {enrollment.completion_approved_at ? `Previously approved ${formatDate(enrollment.completion_approved_at)}` : "Completion not approved"}</p>
                      </div>
                      <span style={{ color: "#D4A72C", border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "5px 9px", fontSize: 10, fontWeight: 850, textTransform: "uppercase" }}>Pending evidence gate</span>
                    </div>
                    <form action={issueEducationCompletionCertificate} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "end", marginTop: 14, borderTop: "1px solid var(--border-subtle)", paddingTop: 13 }}>
                      <input type="hidden" name="enrollment_id" value={enrollment.id}/>
                      <label style={{ display: "grid", gap: 5, color: "var(--text-secondary)", fontSize: 12 }}>Certificate award title
                        <input name="award_title" required minLength={3} maxLength={180} defaultValue={defaultTitle} style={inputStyle}/>
                      </label>
                      <button type="submit" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 7, border: 0, borderRadius: 9, padding: "11px 13px", fontWeight: 850, cursor: "pointer" }}><Award size={15}/> Approve & issue</button>
                    </form>
                  </article>;
                })}
              </div>
            )}
          </section>
        </>
      )}

      <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.7, marginTop: 26 }}>Public verification shows award title, programme title, issue date and validity only. It does not expose learner phone numbers, emails, scores, attendance or identity documents. An issued certificate cannot be silently reactivated after revocation.</p>
    </div>
  );
}
