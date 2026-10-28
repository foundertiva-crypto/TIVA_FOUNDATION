import type { CSSProperties } from "react";
import Link from "next/link";
import {
  GraduationCap, ClipboardList, BookOpenCheck, CalendarCheck, UsersRound,
  Award, ShieldCheck, BarChart3, FileCheck2, Workflow, ExternalLink,
  CircleDot, CheckCircle2, AlertTriangle
} from "lucide-react";
import { createEducationProgram, attestEducationProgramReadiness, setEducationProgramAvailability } from "@/app/actions/education";
import { createAdminClient } from "@/lib/supabase/admin";

type EducationProgram = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  status: string;
  capacity: number;
  delivery_mode: string;
  languages: string[];
  created_at: string;
  privacy_notice_version: string | null;
  privacy_contact_email: string | null;
  retention_statement: string | null;
  privacy_notice_attested_at: string | null;
  safeguarding_owner_user_id: string | null;
  lms_course_ref: string | null;
  launch_ready_attested_at: string | null;
};

type EducationSnapshot = {
  ready: boolean;
  counts: { programs: number; applications: number; cohorts: number; enrollments: number };
  programs: EducationProgram[];
};

async function getEducationSnapshot(): Promise<EducationSnapshot> {
  const empty: EducationSnapshot = {
    ready: false,
    counts: { programs: 0, applications: 0, cohorts: 0, enrollments: 0 },
    programs: [],
  };

  try {
    const admin = createAdminClient();
    const [programs, applications, cohorts, enrollments] = await Promise.all([
      admin.from("education_programs")
        .select("id,title,slug,summary,status,capacity,delivery_mode,languages,created_at,privacy_notice_version,privacy_contact_email,retention_statement,privacy_notice_attested_at,safeguarding_owner_user_id,lms_course_ref,launch_ready_attested_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(100),
      admin.from("education_applications").select("id", { count: "exact", head: true }),
      admin.from("education_cohorts").select("id", { count: "exact", head: true }),
      admin.from("education_enrollments").select("id", { count: "exact", head: true }),
    ]);

    if (programs.error || applications.error || cohorts.error || enrollments.error) return empty;

    return {
      ready: true,
      counts: {
        programs: programs.count ?? programs.data?.length ?? 0,
        applications: applications.count ?? 0,
        cohorts: cohorts.count ?? 0,
        enrollments: enrollments.count ?? 0,
      },
      programs: (programs.data ?? []) as EducationProgram[],
    };
  } catch {
    return empty;
  }
}

const modules = [
  { icon: ClipboardList, name: "Programme & applications", state: "PLANNED", description: "Programme catalogue, applicant reference, consent version, review queue and status history." },
  { icon: UsersRound, name: "Learners, colleges & mentors", state: "PLANNED", description: "Restricted learner registry, partner contacts, mentor assignments and cohort teams." },
  { icon: CalendarCheck, name: "Cohorts & attendance", state: "PLANNED", description: "Cohort capacity, session calendar, attendance evidence and correction history." },
  { icon: BookOpenCheck, name: "Learning delivery", state: "DECISION", description: "Moodle is the proposed pilot LMS; host and course must be verified separately." },
  { icon: FileCheck2, name: "Assignments & assessments", state: "PLANNED", description: "Rubrics, submissions, reviewer feedback, reassessment and evidence links." },
  { icon: Award, name: "Certificates", state: "GATED", description: "Certificate issuance follows an approved completion decision and a verification register." },
  { icon: ShieldCheck, name: "Safeguarding & privacy", state: "GATED", description: "Restricted case handling, retention rules, consent, incident process and least privilege." },
  { icon: BarChart3, name: "Impact reporting", state: "PLANNED", description: "Aggregate programme outcomes with metric definitions, source evidence and review." },
  { icon: Workflow, name: "Workflow automation", state: "OPTIONAL", description: "Notifications and approved hand-offs through a least-privilege service identity." },
];

const statusColor: Record<string, string> = {
  draft: "#D4A72C", published: "#00C987", paused: "#D4A72C", closed: "#9CA3AF",
  PLANNED: "#9CA3AF", DECISION: "#D4A72C", GATED: "#F97373", OPTIONAL: "#60A5FA",
};

const docs = [
  { label: "Education platform architecture", href: "https://github.com/foundertiva-crypto/TIVA_FOUNDATION/blob/feat/tiva-education-foundation-pilot-20261029/docs/TIVA-WORLD-FOUNDATION-EDUCATION-PLATFORM.md" },
  { label: "10-day internship cohort runbook", href: "https://github.com/foundertiva-crypto/TIVA_FOUNDATION/blob/feat/tiva-education-foundation-pilot-20261029/docs/FOUNDATION-EDUCATION-PILOT-10-DAY.md" },
  { label: "Open-source stack register", href: "https://github.com/foundertiva-crypto/TIVA_FOUNDATION/blob/feat/tiva-education-foundation-pilot-20261029/docs/OPEN-SOURCE-EDUCATION-STACK.md" },
  { label: "Security gates and tests", href: "https://github.com/foundertiva-crypto/TIVA_FOUNDATION/blob/feat/tiva-education-foundation-pilot-20261029/docs/EDUCATION-SECURITY-GATES.md" },
  { label: "Education SQL migration", href: "https://github.com/foundertiva-crypto/TIVA_FOUNDATION/blob/feat/tiva-education-foundation-pilot-20261029/supabase/migrations/202610290001_foundation_education.sql" },
];

const inputStyle: CSSProperties = {
  width: "100%", minHeight: 42, border: "1px solid var(--border-accent)",
  borderRadius: 9, padding: "10px 12px", background: "var(--bg-secondary)",
  color: "var(--text-primary)", outline: "none",
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

function Pill({ state }: { state: string }) {
  const color = statusColor[state] ?? "#9CA3AF";
  return (
    <span style={{
      border: `1px solid ${color}66`, color, background: `${color}12`,
      borderRadius: 999, padding: "4px 9px", fontSize: 10,
      fontWeight: 800, letterSpacing: ".08em", whiteSpace: "nowrap",
    }}>{state.toUpperCase()}</span>
  );
}

export default async function EducationAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; error?: string; readiness?: string; published?: string; paused?: string }>;
}) {
  const [{ created, error, readiness, published, paused }, snapshot] = await Promise.all([searchParams, getEducationSnapshot()]);
  const metrics = [
    { label: "Programmes", value: snapshot.ready ? snapshot.counts.programs : "—", sub: "Database records", icon: ClipboardList },
    { label: "Applications", value: snapshot.ready ? snapshot.counts.applications : "—", sub: "All statuses", icon: UsersRound },
    { label: "Cohorts", value: snapshot.ready ? snapshot.counts.cohorts : "—", sub: "Scheduled groups", icon: CalendarCheck },
    { label: "Enrolments", value: snapshot.ready ? snapshot.counts.enrollments : "—", sub: "All statuses", icon: GraduationCap },
  ];

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1400, margin: "0 auto", padding: "clamp(16px, 3vw, 32px)", color: "var(--text-primary)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 24 }}>
        <div>
          <p style={{ color: "var(--brand-secondary)", fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 8 }}>TIVA World Foundation</p>
          <h1 style={{ fontSize: "clamp(25px, 4vw, 34px)", fontWeight: 850, letterSpacing: "-.035em" }}><span className="gradient-text">Education Operations</span></h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 7, fontSize: 14, lineHeight: 1.7, maxWidth: 800 }}>
            Programme setup, internship cohorts, applications, attendance, learning evidence and certificate governance.
            Counters below come from the database; sample learner numbers are never fabricated.
          </p>
        </div>
        <span style={{ display: "inline-flex", gap: 7, alignItems: "center", borderRadius: 999, padding: "8px 12px", border: "1px solid rgba(212,167,44,.35)", color: "#D4A72C", fontSize: 11, fontWeight: 800 }}>
          <CircleDot size={14} /> PILOT OPERATIONS
        </span>
      </div>

      {created && <div role="status" style={{ padding: 14, marginBottom: 16, borderRadius: 10, border: "1px solid rgba(0,230,118,.35)", background: "rgba(0,230,118,.08)" }}>Draft programme created. Complete and attest readiness before publication.</div>}
      {readiness && <div role="status" style={{ padding: 14, marginBottom: 16, borderRadius: 10, border: "1px solid rgba(0,230,118,.35)", background: "rgba(0,230,118,.08)" }}>Readiness attestation recorded. Check the details and review the close date before publishing.</div>}
      {published && <div role="status" style={{ padding: 14, marginBottom: 16, borderRadius: 10, border: "1px solid rgba(0,230,118,.35)", background: "rgba(0,230,118,.08)" }}>Programme published. Its application window is now open and has a recorded closing date.</div>}
      {paused && <div role="status" style={{ padding: 14, marginBottom: 16, borderRadius: 10, border: "1px solid var(--border-subtle)", background: "var(--bg-secondary)" }}>Applications paused. The programme remains in the register but is no longer accepting new applications.</div>}
      {error && <div role="alert" style={{ padding: 14, marginBottom: 16, borderRadius: 10, border: "1px solid rgba(255,107,107,.4)", background: "rgba(255,107,107,.08)" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 12, marginBottom: 24 }}>
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return <div key={metric.label} className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>{metric.label}</span>
              <Icon size={17} color="#8B7CF6" />
            </div>
            <p style={{ fontSize: 30, fontWeight: 850, marginTop: 12 }}>{metric.value}</p>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>{metric.sub}</p>
          </div>;
        })}
      </div>

      {!snapshot.ready && <section style={{ padding: 18, marginBottom: 22, borderRadius: 14, border: "1px solid rgba(212,167,44,.35)", background: "rgba(212,167,44,.06)" }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 7, display: "flex", alignItems: "center", gap: 9 }}><AlertTriangle size={18} color="#D4A72C" /> Education database not verified</h2>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.7, fontSize: 13 }}>The education tables could not be read. The migration may not be installed or the database configuration may be unavailable. Counts remain blank rather than showing demo data. Apply the migration to staging first and run the security tests before production.</p>
        <Link href="https://github.com/foundertiva-crypto/TIVA_FOUNDATION/blob/feat/tiva-education-foundation-pilot-20261029/supabase/migrations/202610290001_foundation_education.sql" target="_blank" rel="noreferrer" style={{ color: "var(--brand-secondary)", display: "inline-block", fontSize: 13, fontWeight: 700, marginTop: 10 }}>Review education migration ↗</Link>
      </section>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", gap: 18, alignItems: "start" }}>
        <section className="glass-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 7 }}>Create a programme</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.65, marginBottom: 18 }}>Creates a draft only. It does not open applications, send messages, or collect payments.</p>
          <form action={createEducationProgram} style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>Programme title
              <input name="title" required minLength={3} maxLength={180} placeholder="TIVA Campus Internship Cohort 001" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>URL slug
              <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="campus-internship-cohort-001" style={inputStyle} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>Description
              <textarea name="summary" rows={3} maxLength={2000} placeholder="Purpose, outcomes and target learners" style={{ ...inputStyle, resize: "vertical" }} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>Capacity
                <input name="capacity" type="number" required min={1} max={100000} defaultValue={50} style={inputStyle} />
              </label>
              <label style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>Delivery mode
                <select name="delivery_mode" defaultValue="hybrid" style={inputStyle}>
                  <option value="hybrid">Hybrid</option><option value="online">Online</option><option value="in_person">In person</option><option value="offline">Offline</option>
                </select>
              </label>
            </div>
            <label style={{ display: "grid", gap: 6, fontSize: 13, color: "var(--text-secondary)" }}>Languages (comma-separated codes)
              <input name="languages" defaultValue="en,kn,hi" placeholder="en,kn,hi" style={inputStyle} />
            </label>
            <button type="submit" className="btn-primary" style={{ border: 0, borderRadius: 10, padding: "13px 16px", fontWeight: 800, cursor: "pointer" }}>Create draft programme</button>
          </form>
        </section>

        <section className="glass-card" style={{ padding: 20 }}>
          <h2 style={{ fontSize: 19, fontWeight: 800, marginBottom: 6 }}>Programme register</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>Actual database records, when the migration is installed and reachable.</p>
          {snapshot.ready && snapshot.programs.length > 0 ? <div style={{ display: "grid", gap: 10 }}>
            {snapshot.programs.map((program) => {
              const readinessComplete = Boolean(
                program.privacy_notice_version
                && program.privacy_contact_email
                && program.retention_statement
                && program.privacy_notice_attested_at
                && program.safeguarding_owner_user_id
                && program.lms_course_ref
                && program.launch_ready_attested_at
              );
              return <article key={program.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 14, display: "grid", gap: 14 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div><h3 style={{ fontWeight: 800, fontSize: 15 }}>{program.title}</h3><p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>/{program.slug}</p></div>
                    <Pill state={program.status} />
                  </div>
                  {program.summary && <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>{program.summary}</p>}
                  <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 10 }}>Capacity {program.capacity} · {program.delivery_mode.replace("_", " ")} · {(program.languages ?? []).join(", ").toUpperCase()}</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 6 }}>Created {formatDate(program.created_at)}</p>
                  <p style={{ color: readinessComplete ? "#00C987" : "#D4A72C", fontWeight: 750, fontSize: 11, marginTop: 8 }}>{readinessComplete ? "READINESS ATTESTED" : "READINESS INCOMPLETE"}</p>
                </div>

                {program.status !== "published" && <details style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                  <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 800 }}>Configure privacy, safeguarding and LMS readiness</summary>
                  <form action={attestEducationProgramReadiness} style={{ display: "grid", gap: 10, marginTop: 13 }}>
                    <input type="hidden" name="program_id" value={program.id} />
                    <label style={{ display: "grid", gap: 5, color: "var(--text-secondary)", fontSize: 12 }}>Reviewed privacy notice version
                      <input name="privacy_notice_version" required minLength={3} maxLength={80} pattern="[A-Za-z0-9._-]{3,80}" defaultValue={program.privacy_notice_version ?? ""} placeholder="education-privacy-v1" style={inputStyle} />
                    </label>
                    <label style={{ display: "grid", gap: 5, color: "var(--text-secondary)", fontSize: 12 }}>Public privacy contact email
                      <input name="privacy_contact_email" type="email" required maxLength={254} defaultValue={program.privacy_contact_email ?? ""} placeholder="privacy@your-approved-domain" style={inputStyle} />
                    </label>
                    <label style={{ display: "grid", gap: 5, color: "var(--text-secondary)", fontSize: 12 }}>Retention statement shown to applicants
                      <textarea name="retention_statement" required minLength={20} maxLength={1500} defaultValue={program.retention_statement ?? ""} rows={3} placeholder="Specify the approved retention period and how deletion requests are handled." style={{ ...inputStyle, resize: "vertical" }} />
                    </label>
                    <label style={{ display: "grid", gap: 5, color: "var(--text-secondary)", fontSize: 12 }}>Safeguarding owner account UUID
                      <input name="safeguarding_owner_user_id" required defaultValue={program.safeguarding_owner_user_id ?? ""} placeholder="UUID of the assigned Foundation contact" style={inputStyle} />
                    </label>
                    <label style={{ display: "grid", gap: 5, color: "var(--text-secondary)", fontSize: 12 }}>Moodle course ID or non-secret reference
                      <input name="lms_course_ref" required maxLength={200} defaultValue={program.lms_course_ref ?? ""} placeholder="Moodle course ID; never enter access tokens" style={inputStyle} />
                    </label>
                    <div style={{ display: "grid", gap: 8, border: "1px solid var(--border-subtle)", borderRadius: 10, padding: 11 }}>
                      {[
                        ["notice_reviewed", "I reviewed the actual privacy notice text and contact details."],
                        ["retention_reviewed", "I verified the retention statement against the Foundation's approved schedule."],
                        ["safeguarding_confirmed", "The safeguarding contact is appointed and the escalation path is ready."],
                        ["lms_verified", "The referenced LMS course exists and its access settings were tested."],
                        ["launch_ready_confirmed", "The staging checks, privacy and programme launch gates have been reviewed."],
                      ].map(([name, label]) => <label key={name} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11, lineHeight: 1.6, color: "var(--text-secondary)" }}>
                        <input type="checkbox" name={name} value="yes" required style={{ marginTop: 3 }} /> <span>{label}</span>
                      </label>)}
                    </div>
                    <button type="submit" className="btn-primary" style={{ border: 0, borderRadius: 9, padding: "11px 13px", fontWeight: 800, cursor: "pointer" }}>Record readiness attestation</button>
                  </form>
                </details>}

                {program.status === "draft" || program.status === "paused" ? (
                  <form action={setEducationProgramAvailability} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, display: "grid", gap: 9 }}>
                    <input type="hidden" name="program_id" value={program.id} />
                    <input type="hidden" name="mode" value="publish" />
                    <label style={{ display: "grid", gap: 5, color: "var(--text-secondary)", fontSize: 12 }}>Application closing date (India time)
                      <input type="date" name="application_closes_on" required min={new Date().toISOString().slice(0,10)} style={inputStyle} />
                    </label>
                    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--text-secondary)", fontSize: 11, lineHeight: 1.6 }}>
                      <input type="checkbox" name="publish_confirmed" value="yes" required style={{ marginTop: 3 }} />
                      <span>I confirm the programme is approved, the notice and retention details are accurate, and the course and safeguarding gates are complete.</span>
                    </label>
                    <button type="submit" className="btn-primary" style={{ border: 0, borderRadius: 9, padding: "11px 13px", fontWeight: 800, cursor: "pointer" }}>Publish and open applications</button>
                  </form>
                ) : program.status === "published" ? (
                  <form action={setEducationProgramAvailability} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 12, display: "grid", gap: 9 }}>
                    <input type="hidden" name="program_id" value={program.id} />
                    <input type="hidden" name="mode" value="pause" />
                    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", color: "var(--text-secondary)", fontSize: 11, lineHeight: 1.6 }}>
                      <input type="checkbox" name="publish_confirmed" value="yes" required style={{ marginTop: 3 }} />
                      <span>Confirm that applications should stop immediately.</span>
                    </label>
                    <button type="submit" style={{ border: "1px solid rgba(212,167,44,.4)", borderRadius: 9, background: "transparent", color: "#D4A72C", padding: "11px 13px", fontWeight: 800, cursor: "pointer" }}>Pause applications</button>
                  </form>
                ) : null}
                {program.status === "published" && <Link href={`/education/apply/${program.slug}`} target="_blank" rel="noreferrer" style={{ color: "var(--brand-secondary)", fontSize: 12, fontWeight: 700 }}>Preview application page ↗</Link>}
              </article>;
            })}
          </div> : <div style={{ padding: 20, borderRadius: 12, background: "var(--bg-secondary)", color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>
            {snapshot.ready ? "No programmes have been created yet. Create the first draft programme." : "Live programme data will appear after the migration and database connection are verified."}
          </div>}
        </section>
      </div>

      <section style={{ marginTop: 8, marginBottom: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/admin/education/applications" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", gap: 8, alignItems: "center" }}>Application review ↗</Link>
        <Link href="/admin/education/cohorts" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", gap: 8, alignItems: "center" }}>Cohorts & sessions ↗</Link>
        <Link href="/admin/education/attendance" className="btn-primary" style={{ textDecoration: "none", display: "inline-flex", gap: 8, alignItems: "center" }}>Attendance register ↗</Link>
      </section>

      <section style={{ marginTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Module readiness</h2>
          <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>Status indicates implementation state, not live service health</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
          {modules.map((item) => {
            const Icon = item.icon;
            return <article key={item.name} style={{ padding: 18, border: "1px solid var(--border-subtle)", borderRadius: 15, background: "var(--bg-card)", minHeight: 148 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}><span style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 11, background: "rgba(108,92,231,.13)", color: "#9A8CFF" }}><Icon size={19} /></span><Pill state={item.state} /></div>
              <h3 style={{ fontSize: 15, fontWeight: 800, marginTop: 14, marginBottom: 7 }}>{item.name}</h3>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>{item.description}</p>
            </article>;
          })}
        </div>
      </section>

      <section style={{ marginTop: 26, border: "1px solid var(--border-subtle)", borderRadius: 16, padding: 20, background: "var(--bg-secondary)" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 14, display: "flex", alignItems: "center", gap: 9 }}><CheckCircle2 size={19} color="#00D2A0" /> Readiness gates before registration opens</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 10 }}>
          {[
            "Staging database backup and restore tested",
            "Learner A / learner B access-boundary tests pass",
            "Role self-escalation blocked in database",
            "Privacy notice, consent and retention approved",
            "Moodle host and first course verified",
            "Safeguarding escalation owner assigned",
            "Attendance and certificate rules approved",
            "Rollback owner and production deployment gate recorded",
          ].map((text) => <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,.025)", fontSize: 12, lineHeight: 1.6, color: "var(--text-secondary)" }}><span style={{ width: 16, height: 16, border: "1px solid var(--text-muted)", borderRadius: 4, flexShrink: 0, marginTop: 1 }} />{text}</div>)}
        </div>
      </section>

      <section style={{ marginTop: 26 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 13 }}>Programme documents</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: 10 }}>
          {docs.map((doc) => <a key={doc.label} href={doc.href} target="_blank" rel="noreferrer" style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: 13, textDecoration: "none", color: "var(--text-primary)", fontSize: 13, fontWeight: 650 }}>{doc.label}<ExternalLink size={15} color="var(--text-secondary)" /></a>)}
        </div>
      </section>

      <p style={{ fontSize: 11, lineHeight: 1.7, color: "var(--text-muted)", marginTop: 24 }}>This first executable slice includes live programme counters and admin-only draft creation. Applications, cohort assignment, attendance, assessments, certificates and safeguarding workflows still require their own tested screens and service logic. No learner data should be imported until access-boundary tests and backup/restore pass.</p>
    </div>
  );
}
