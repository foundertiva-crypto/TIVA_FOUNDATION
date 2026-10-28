import { requireEducationAdmin } from "@/lib/education/admin-guard";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  AlertTriangle, ArrowLeft, CalendarDays, Clock3, GraduationCap,
  Plus, UsersRound, CheckCircle2
} from "lucide-react";
import {
  createEducationCohort,
  createEducationSession,
  setEducationCohortStatus,
  setEducationSessionPublished,
  enrollAcceptedEducationApplicant,
} from "@/app/actions/education";
import { createAdminClient } from "@/lib/supabase/admin";

type Program = {
  id: string;
  title: string;
  slug: string;
  status: string;
  capacity: number;
};
type Cohort = {
  id: string;
  program_id: string;
  slug: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  timezone: string;
  delivery_mode: string;
  capacity: number;
  status: string;
};
type Session = {
  id: string;
  cohort_id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  delivery_mode: string;
  location_label: string | null;
  published: boolean;
};
type Enrollment = { id: string; cohort_id: string; learner_user_id: string; application_id: string | null; status: string };
type AcceptedApplication = { id: string; program_id: string; reference_code: string; applicant_full_name: string; status: string };

type Props = {
  searchParams: Promise<{ error?: string; created?: string; enrolled?: string; ["session-created"]?: string; ["cohort-updated"]?: string; ["session-updated"]?: string }>;
};

const errorMessages: Record<string,string> = {
  "invalid-program": "Select a valid programme.",
  "invalid-slug": "Use a lowercase cohort slug with letters, numbers and hyphens.",
  "invalid-title": "Cohort title must be 3–160 characters.",
  "invalid-capacity": "Capacity must be a whole number above zero.",
  "invalid-mode": "Choose a valid delivery mode.",
  "invalid-date": "Enter valid cohort dates.",
  "date-order": "The cohort end date must be on or after its start date.",
  "program-unavailable": "The selected programme could not be loaded.",
  "capacity-exceeds-program": "Cohort capacity cannot exceed the parent programme capacity.",
  "duplicate-slug": "That cohort slug already exists within this programme.",
  "migration-required": "Education migration is missing or the database API cache needs a reload.",
  "create-failed": "Cohort could not be created. No new cohort is confirmed.",
  "invalid-cohort": "The cohort reference is invalid.",
  "invalid-enrolment-reference": "Choose a valid application and cohort.",
  "application-unavailable": "The accepted application could not be loaded.",
  "application-not-accepted": "Only an accepted application can be enrolled.",
  "programme-cohort-mismatch": "The application and cohort belong to different programmes.",
  "cohort-not-active": "Activate the cohort before enrolling learners.",
  "already-enrolled": "This application already has an enrolment.",
  "enrolment-check-failed": "Existing enrolment could not be verified.",
  "capacity-or-integrity": "Enrolment was blocked by cohort/programme capacity or an integrity check.",
  "enrolment-failed": "Enrolment could not be saved.",
  "session-title": "Session title must be 3–180 characters.",
  "session-details": "Session description or location is too long.",
  "session-dates": "Enter valid session date and time values.",
  "session-time-order": "The session must start in the future and end after it starts.",
  "cohort-unavailable": "The selected cohort could not be loaded.",
  "cohort-closed": "Sessions cannot be added to a completed or cancelled cohort.",
  "session-create-failed": "Session could not be saved.",
  "invalid-cohort-status": "Choose a supported cohort status.",
  "invalid-cohort-transition": "That cohort status transition is not permitted.",
  "program-not-published": "The parent programme must be published first.",
  "session-required": "Add at least one session before activating the cohort.",
  "cohort-update-failed": "Cohort status could not be saved.",
  "invalid-session": "The session reference is invalid.",
  "session-unavailable": "The selected session could not be loaded.",
  "session-already-published": "That session is already published.",
  "session-already-started": "A session cannot first be published after it has started.",
  "activate-cohort-first": "Activate the cohort before publishing its session.",
  "session-publish-failed": "Session publishing could not be saved.",
};

const inputStyle: CSSProperties = {
  width: "100%", minHeight: 42, border: "1px solid var(--border-accent)",
  borderRadius: 9, padding: "10px 12px", background: "var(--bg-secondary)",
  color: "var(--text-primary)", outline: "none",
};
const deliveryModes = [
  { value: "hybrid", label: "Hybrid" },
  { value: "online", label: "Online" },
  { value: "in_person", label: "In person" },
  { value: "offline", label: "Offline" },
];

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(date);
}
function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date);
}
function humanize(value: string) { return value.replaceAll("_", " "); }

export default async function EducationCohortsPage({ searchParams }: Props) {
  await requireEducationAdmin();
  const query = await searchParams;
  let ready = false;
  let programs: Program[] = [];
  let cohorts: Cohort[] = [];
  let sessions: Session[] = [];
  let acceptedApplications: AcceptedApplication[] = [];
  let enrollments: Enrollment[] = [];
  const enrollmentCounts = new Map<string,number>();

  try {
    const admin = createAdminClient();
    const [programResult, cohortResult, sessionResult, enrollmentResult, acceptedApplicationResult] = await Promise.all([
      admin.from("education_programs").select("id,title,slug,status,capacity").order("created_at", { ascending: false }).limit(200),
      admin.from("education_cohorts").select("id,program_id,slug,title,start_date,end_date,timezone,delivery_mode,capacity,status").order("created_at", { ascending: false }).limit(300),
      admin.from("education_sessions").select("id,cohort_id,title,description,starts_at,ends_at,delivery_mode,location_label,published").order("starts_at", { ascending: true }).limit(1000),
      admin.from("education_enrollments").select("id,cohort_id,learner_user_id,application_id,status").limit(5000),
      admin.from("education_applications").select("id,program_id,reference_code,applicant_full_name,status").eq("status", "accepted").order("submitted_at", { ascending: true }).limit(1000),
    ]);

    if (!programResult.error && !cohortResult.error && !sessionResult.error && !enrollmentResult.error && !acceptedApplicationResult.error) {
      ready = true;
      programs = (programResult.data ?? []) as Program[];
      cohorts = (cohortResult.data ?? []) as Cohort[];
      sessions = (sessionResult.data ?? []) as Session[];
      enrollments = (enrollmentResult.data ?? []) as Enrollment[];
      acceptedApplications = (acceptedApplicationResult.data ?? []) as AcceptedApplication[];
      for (const row of enrollments) {
        if (["invited","enrolled","active","completed","incomplete"].includes(row.status)) {
          enrollmentCounts.set(row.cohort_id, (enrollmentCounts.get(row.cohort_id) ?? 0) + 1);
        }
      }
    }
  } catch {
    ready = false;
  }

  const programMap = new Map(programs.map((program) => [program.id, program]));
  const sessionsByCohort = new Map<string,Session[]>();
  for (const session of sessions) {
    const bucket = sessionsByCohort.get(session.cohort_id) ?? [];
    bucket.push(session);
    sessionsByCohort.set(session.cohort_id, bucket);
  }
  const activePrograms = programs.filter((program) => program.status === "published");
  const errorText = query.error ? errorMessages[query.error] ?? "The requested action could not be completed." : null;

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "clamp(16px, 3vw, 32px)", color: "var(--text-primary)" }}>
      <Link href="/admin/education" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}><ArrowLeft size={15} /> Education operations</Link>

      <header style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
        <div>
          <p style={{ color: "var(--brand-secondary)", fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>TIVA World Foundation</p>
          <h1 style={{ fontSize: "clamp(25px, 4vw, 36px)", fontWeight: 850, letterSpacing: "-.035em", marginTop: 6 }}>Cohorts & class schedule</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 8, maxWidth: 850 }}>Create cohorts under an approved programme, schedule classes in India Standard Time, and publish session details only after the programme and cohort are ready.</p>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "8px 12px", fontSize: 11, fontWeight: 800, color: "var(--text-secondary)" }}><CalendarDays size={15} /> ASIA/KOLKATA</span>
      </header>

      {query.created && <div role="status" style={{ marginTop: 18, border: "1px solid rgba(0,201,135,.35)", background: "rgba(0,201,135,.07)", borderRadius: 10, padding: 13, fontSize: 13 }}>Cohort created as a draft. Add the session schedule before activating it.</div>}
      {query["session-created"] && <div role="status" style={{ marginTop: 18, border: "1px solid rgba(0,201,135,.35)", background: "rgba(0,201,135,.07)", borderRadius: 10, padding: 13, fontSize: 13 }}>Session saved as a draft; it is not yet visible to learners.</div>}
      {query.enrolled && <div role="status" style={{ marginTop: 18, border: "1px solid rgba(0,201,135,.35)", background: "rgba(0,201,135,.07)", borderRadius: 10, padding: 13, fontSize: 13 }}>Accepted applicant enrolled. They can now see their cohort and published sessions in My Applications.</div>}
      {query["cohort-updated"] && <div role="status" style={{ marginTop: 18, border: "1px solid rgba(0,201,135,.35)", background: "rgba(0,201,135,.07)", borderRadius: 10, padding: 13, fontSize: 13 }}>Cohort status updated.</div>}
      {query["session-updated"] && <div role="status" style={{ marginTop: 18, border: "1px solid rgba(0,201,135,.35)", background: "rgba(0,201,135,.07)", borderRadius: 10, padding: 13, fontSize: 13 }}>Session publication updated.</div>}
      {errorText && <div role="alert" style={{ marginTop: 18, border: "1px solid rgba(255,107,107,.35)", background: "rgba(255,107,107,.07)", borderRadius: 10, padding: 13, fontSize: 13 }}>{errorText}</div>}

      {!ready ? (
        <section style={{ marginTop: 22, border: "1px solid rgba(212,167,44,.35)", background: "rgba(212,167,44,.06)", borderRadius: 14, padding: 20 }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 800 }}><AlertTriangle size={18} color="#D4A72C" /> Education database not verified</h2>
          <p style={{ marginTop: 8, color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7 }}>The cohort, session, or enrolment query failed. These controls will not show fictional schedules. Apply and verify migrations in staging before using real learner records.</p>
        </section>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))", gap: 12, marginTop: 22 }}>
            {[
              { label: "Programmes", value: programs.length, icon: GraduationCap },
              { label: "Cohorts", value: cohorts.length, icon: UsersRound },
              { label: "Sessions", value: sessions.length, icon: CalendarDays },
              { label: "Enrolments", value: [...enrollmentCounts.values()].reduce((a,b) => a+b,0), icon: CheckCircle2 },
            ].map((item) => { const Icon=item.icon; return <div key={item.label} className="stat-card"><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}><span style={{ color:"var(--text-secondary)", fontSize:12, fontWeight:700 }}>{item.label}</span><Icon size={16} color="#8B7CF6" /></div><p style={{ fontSize:28, fontWeight:850, marginTop:10 }}>{item.value}</p></div>; })}
          </div>

          <section className="glass-card" style={{ padding: 20, marginTop: 22 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}><Plus size={19} /> Create a cohort</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.65, marginTop: 7, marginBottom: 15 }}>Cohorts start in draft. Capacity cannot exceed its parent programme capacity.</p>
            {activePrograms.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Publish an approved programme before creating a new cohort.</p>
            ) : (
              <form action={createEducationCohort} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 12 }}>
                <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--text-secondary)", gridColumn: "1 / -1" }}>Parent programme
                  <select name="program_id" required style={inputStyle} defaultValue=""><option value="" disabled>Select programme</option>{activePrograms.map((program) => <option key={program.id} value={program.id}>{program.title} · capacity {program.capacity}</option>)}</select>
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>Cohort title
                  <input name="title" required minLength={3} maxLength={160} placeholder="Campus Internship Cohort 001" style={inputStyle} />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>Cohort slug
                  <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="campus-internship-001" style={inputStyle} />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>Start date (optional)
                  <input name="start_date" type="date" style={inputStyle} />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>End date (optional)
                  <input name="end_date" type="date" style={inputStyle} />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>Seat capacity
                  <input name="capacity" type="number" required min={1} max={100000} defaultValue={50} style={inputStyle} />
                </label>
                <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>Delivery mode
                  <select name="delivery_mode" defaultValue="hybrid" style={inputStyle}>{deliveryModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select>
                </label>
                <button type="submit" className="btn-primary" style={{ border: 0, borderRadius: 10, padding: 13, fontWeight: 800, cursor: "pointer", gridColumn: "1 / -1" }}>Create draft cohort</button>
              </form>
            )}
          </section>

          <section style={{ marginTop: 26 }}>
            <h2 style={{ fontSize: 22, fontWeight: 850, marginBottom: 14 }}>Cohort register</h2>
            {cohorts.length === 0 ? <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 14, padding: 22, color: "var(--text-secondary)", fontSize: 13 }}>No cohorts have been created yet.</div> : (
              <div style={{ display: "grid", gap: 16 }}>
                {cohorts.map((cohort) => {
                  const program = programMap.get(cohort.program_id);
                  const cohortSessions = sessionsByCohort.get(cohort.id) ?? [];
                  const seats = enrollmentCounts.get(cohort.id) ?? 0;
                  return <article key={cohort.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: 16, padding: "clamp(16px, 3vw, 22px)", background: "var(--bg-card)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                      <div>
                        <p style={{ color: "var(--brand-secondary)", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 800, fontSize: 10 }}>{program?.title ?? "Programme unavailable"}</p>
                        <h3 style={{ fontSize: 19, fontWeight: 850, marginTop: 5 }}>{cohort.title}</h3>
                        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4 }}>{cohort.slug} · {humanize(cohort.delivery_mode)} · {cohort.timezone}</p>
                        <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 7 }}>Dates: {formatDate(cohort.start_date)} – {formatDate(cohort.end_date)} · Seats: {seats}/{cohort.capacity} · Sessions: {cohortSessions.length}</p>
                      </div>
                      <span style={{ textTransform: "uppercase", fontSize: 10, fontWeight: 850, letterSpacing: ".08em", border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "6px 9px", color: cohort.status === "active" ? "#00C987" : "var(--text-secondary)" }}>{humanize(cohort.status)}</span>
                    </div>

                    {cohort.status === "draft" && (
                      <form action={setEducationCohortStatus} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 13, marginTop: 15, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <input type="hidden" name="cohort_id" value={cohort.id} />
                        <input type="hidden" name="status" value="active" />
                        <button type="submit" className="btn-primary" style={{ border: 0, borderRadius: 9, padding: "10px 12px", fontWeight: 800, cursor: "pointer" }}>Activate cohort</button>
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Requires a published programme and at least one scheduled session.</span>
                      </form>
                    )}
                    {cohort.status === "active" && (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                        <form action={setEducationCohortStatus}><input type="hidden" name="cohort_id" value={cohort.id}/><input type="hidden" name="status" value="completed"/><button type="submit" style={{ border: "1px solid var(--border-subtle)", borderRadius: 8, padding: "8px 10px", fontSize: 12, background: "transparent", color: "var(--text-secondary)", cursor: "pointer" }}>Mark completed</button></form>
                        <form action={setEducationCohortStatus}><input type="hidden" name="cohort_id" value={cohort.id}/><input type="hidden" name="status" value="cancelled"/><button type="submit" style={{ border: "1px solid rgba(255,107,107,.4)", borderRadius: 8, padding: "8px 10px", fontSize: 12, background: "transparent", color: "#F97373", cursor: "pointer" }}>Cancel cohort</button></form>
                      </div>
                    )}

                    {cohort.status === "active" && (
                      <details style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 15, paddingTop: 12 }}>
                        <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 800 }}>Enroll an accepted applicant</summary>
                        {(() => {
                          const alreadyEnrolled = new Set(enrollments.filter((entry) => entry.application_id).map((entry) => entry.application_id as string));
                          const eligibleApplications = acceptedApplications.filter((application) => application.program_id === cohort.program_id && !alreadyEnrolled.has(application.id));
                          return eligibleApplications.length === 0
                            ? <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 10 }}>No accepted, unenrolled applications are available for this programme.</p>
                            : <form action={enrollAcceptedEducationApplicant} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, marginTop: 12, alignItems: "end" }}>
                              <input type="hidden" name="cohort_id" value={cohort.id}/>
                              <label style={{ display: "grid", gap: 5, color: "var(--text-secondary)", fontSize: 12 }}>Accepted applicant
                                <select name="application_id" required defaultValue="" style={inputStyle}>
                                  <option value="" disabled>Select applicant</option>
                                  {eligibleApplications.map((application) => <option key={application.id} value={application.id}>{application.reference_code} · {application.applicant_full_name}</option>)}
                                </select>
                              </label>
                              <button type="submit" className="btn-primary" style={{ border: 0, borderRadius: 9, padding: "11px 13px", fontWeight: 800, cursor: "pointer" }}>Create enrolment</button>
                            </form>;
                        })()}
                      </details>
                    )}

                    {cohort.status !== "completed" && cohort.status !== "cancelled" && (
                      <details style={{ borderTop: "1px solid var(--border-subtle)", marginTop: 16, paddingTop: 13 }}>
                        <summary style={{ cursor: "pointer", fontSize: 13, fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}><Plus size={15}/> Schedule a session</summary>
                        <form action={createEducationSession} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 10, marginTop: 13 }}>
                          <input type="hidden" name="cohort_id" value={cohort.id} />
                          <label style={{ display: "grid", gap: 6, color: "var(--text-secondary)", fontSize: 12, gridColumn: "1 / -1" }}>Session title
                            <input name="title" required minLength={3} maxLength={180} placeholder="Day 1 — Orientation and safe collaboration" style={inputStyle}/>
                          </label>
                          <label style={{ display: "grid", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>Starts (India time)
                            <input type="datetime-local" name="starts_at" required style={inputStyle}/>
                          </label>
                          <label style={{ display: "grid", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>Ends (India time)
                            <input type="datetime-local" name="ends_at" required style={inputStyle}/>
                          </label>
                          <label style={{ display: "grid", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>Delivery mode
                            <select name="delivery_mode" defaultValue={cohort.delivery_mode} style={inputStyle}>{deliveryModes.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select>
                          </label>
                          <label style={{ display: "grid", gap: 6, color: "var(--text-secondary)", fontSize: 12 }}>Location / joining label (optional)
                            <input name="location_label" maxLength={180} placeholder="Room name or approved meeting details" style={inputStyle}/>
                          </label>
                          <label style={{ display: "grid", gap: 6, color: "var(--text-secondary)", fontSize: 12, gridColumn: "1 / -1" }}>Description / learning objective (optional)
                            <textarea name="description" maxLength={2000} rows={2} placeholder="Theory objective and supervised practical evidence" style={{...inputStyle,resize:"vertical"}}/>
                          </label>
                          <button type="submit" className="btn-primary" style={{ border: 0, borderRadius: 9, padding: 12, fontWeight: 800, cursor: "pointer", gridColumn: "1 / -1" }}>Save unpublished session</button>
                        </form>
                      </details>
                    )}

                    <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                      {cohortSessions.map((session) => (
                        <div key={session.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: 11, padding: 13 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}><CalendarDays size={16} color="#8B7CF6" style={{ marginTop: 2 }}/><div><h4 style={{ fontSize: 14, fontWeight: 800 }}>{session.title}</h4><p style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}><Clock3 size={12}/> {formatDateTime(session.starts_at)} – {formatDateTime(session.ends_at)}</p>{session.location_label && <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 3 }}>{session.location_label}</p>}</div></div>
                            <span style={{ fontSize: 10, fontWeight: 850, textTransform: "uppercase", color: session.published ? "#00C987" : "#D4A72C" }}>{session.published ? "Published" : "Draft"}</span>
                          </div>
                          {!session.published && <form action={setEducationSessionPublished} style={{ marginTop: 10 }}><input type="hidden" name="session_id" value={session.id}/><input type="hidden" name="published" value="yes"/><button type="submit" className="btn-primary" style={{ border: 0, borderRadius: 8, padding: "8px 10px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Publish session</button></form>}
                        </div>
                      ))}
                      {cohortSessions.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 5 }}>No sessions scheduled for this cohort yet.</p>}
                    </div>
                  </article>;
                })}
              </div>
            )}
          </section>
        </>
      )}

      <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.7, marginTop: 26 }}>Draft sessions are private to authorised staff. Publishing requires a live parent programme and active cohort. This page schedules sessions; it does not provision Moodle, video-conference rooms or send learner notifications.</p>
    </div>
  );
}
