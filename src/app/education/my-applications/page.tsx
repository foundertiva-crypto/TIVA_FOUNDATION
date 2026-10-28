import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, GraduationCap, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type EducationApplication = {
  id: string;
  reference_code: string;
  program_id: string;
  status: string;
  consent_version: string;
  submitted_at: string;
};
type Program = {
  id: string;
  title: string;
  slug: string;
  summary: string;
};
type Enrollment = {
  id: string;
  cohort_id: string;
  learner_user_id: string;
  application_id: string | null;
  status: string;
  created_at: string;
};
type Cohort = {
  id: string;
  program_id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  timezone: string;
  delivery_mode: string;
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
};
type Attendance = {
  session_id: string;
  learner_user_id: string;
  attendance_status: string;
  recorded_at: string;
  correction_reason: string | null;
  last_corrected_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", timeZone: "Asia/Kolkata",
  }).format(date);
}
function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
  }).format(date);
}
function humanize(value: string) { return value.replaceAll("_", " "); }

const statusColor: Record<string,string> = {
  submitted: "#60A5FA",
  under_review: "#D4A72C",
  needs_information: "#D4A72C",
  accepted: "#00C987",
  waitlisted: "#D4A72C",
  rejected: "#F97373",
  withdrawn: "#9CA3AF",
  invited: "#D4A72C",
  enrolled: "#60A5FA",
  active: "#00C987",
  completed: "#00C987",
  incomplete: "#D4A72C",
  present: "#00C987",
  late: "#D4A72C",
  absent: "#F97373",
  excused: "#9CA3AF",
  pending: "#9CA3AF",
};

function StatusPill({ value }: { value: string }) {
  const color = statusColor[value] ?? "#9CA3AF";
  return <span style={{ display: "inline-flex", border: `1px solid ${color}66`, color, background: `${color}12`, borderRadius: 999, padding: "5px 9px", fontSize: 10, fontWeight: 850, textTransform: "uppercase", letterSpacing: ".06em" }}>{humanize(value)}</span>;
}

export default async function MyEducationApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "clamp(18px,4vw,44px)" }}>
        <section style={{ maxWidth: 720, margin: "8vh auto 0", border: "1px solid var(--border-subtle)", borderRadius: 18, padding: 26, background: "var(--bg-card)" }}>
          <Link href="/education" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, textDecoration: "none", color: "var(--text-secondary)" }}><ArrowLeft size={15}/> Education programmes</Link>
          <h1 style={{ fontSize: 28, fontWeight: 850, marginTop: 22 }}>My education applications</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, marginTop: 10 }}>Sign in with your phone OTP to see application references, decisions, enrolment details, published sessions and your recorded attendance.</p>
          <Link href="/login?next=%2Feducation%2Fmy-applications" className="btn-primary" style={{ display: "inline-flex", marginTop: 18, textDecoration: "none" }}>Sign in securely</Link>
        </section>
      </main>
    );
  }

  let applications: EducationApplication[] = [];
  let programs = new Map<string,Program>();
  let enrollments: Enrollment[] = [];
  let cohorts = new Map<string,Cohort>();
  let sessions: Session[] = [];
  let attendance = new Map<string,Attendance>();
  let loadFailed = false;

  try {
    const [{ data: appRows, error: appError }, { data: enrollmentRows, error: enrollmentError }] = await Promise.all([
      supabase.from("education_applications")
        .select("id,reference_code,program_id,status,consent_version,submitted_at")
        .eq("applicant_user_id", user.id)
        .order("submitted_at", { ascending: false })
        .limit(100),
      supabase.from("education_enrollments")
        .select("id,cohort_id,learner_user_id,application_id,status,created_at")
        .eq("learner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (appError || enrollmentError) throw new Error("Education records unavailable");
    applications = (appRows ?? []) as EducationApplication[];
    enrollments = (enrollmentRows ?? []) as Enrollment[];

    const programIds = [...new Set(applications.map((application) => application.program_id))];
    if (programIds.length > 0) {
      const { data, error } = await supabase.from("education_programs")
        .select("id,title,slug,summary").in("id", programIds);
      if (error) throw new Error("Programme details unavailable");
      programs = new Map(((data ?? []) as Program[]).map((program) => [program.id, program]));
    }

    const cohortIds = [...new Set(enrollments.map((enrollment) => enrollment.cohort_id))];
    if (cohortIds.length > 0) {
      const [{ data: cohortRows, error: cohortError }, { data: sessionRows, error: sessionError }] = await Promise.all([
        supabase.from("education_cohorts")
          .select("id,program_id,title,start_date,end_date,timezone,delivery_mode,status")
          .in("id", cohortIds),
        supabase.from("education_sessions")
          .select("id,cohort_id,title,description,starts_at,ends_at,delivery_mode,location_label")
          .eq("published", true)
          .in("cohort_id", cohortIds)
          .order("starts_at", { ascending: true }),
      ]);
      if (cohortError || sessionError) throw new Error("Cohort schedule unavailable");
      cohorts = new Map(((cohortRows ?? []) as Cohort[]).map((cohort) => [cohort.id, cohort]));
      sessions = (sessionRows ?? []) as Session[];

      const sessionIds = [...new Set(sessions.map((session) => session.id))];
      if (sessionIds.length > 0) {
        const { data: attendanceRows, error: attendanceError } = await supabase.from("education_attendance")
          .select("session_id,learner_user_id,attendance_status,recorded_at,correction_reason,last_corrected_at")
          .eq("learner_user_id", user.id)
          .in("session_id", sessionIds);
        if (attendanceError) throw new Error("Attendance records unavailable");
        attendance = new Map(((attendanceRows ?? []) as Attendance[]).map((row) => [row.session_id, row]));
      }
    }
  } catch {
    loadFailed = true;
    applications = [];
    enrollments = [];
    programs = new Map();
    cohorts = new Map();
    sessions = [];
    attendance = new Map();
  }

  const enrollmentsByApplication = new Map<string,Enrollment[]>();
  for (const enrollment of enrollments) {
    if (enrollment.application_id) {
      const list = enrollmentsByApplication.get(enrollment.application_id) ?? [];
      list.push(enrollment);
      enrollmentsByApplication.set(enrollment.application_id, list);
    }
  }
  const enrollmentsWithoutApplication = enrollments.filter((enrollment) => !enrollment.application_id);
  const sessionsByCohort = new Map<string,Session[]>();
  for (const session of sessions) {
    const list = sessionsByCohort.get(session.cohort_id) ?? [];
    list.push(session);
    sessionsByCohort.set(session.cohort_id, list);
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "clamp(18px,4vw,44px)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <Link href="/education" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, textDecoration: "none", color: "var(--text-secondary)" }}><ArrowLeft size={15}/> Education programmes</Link>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 }}>
          <Link href="/education/learning" className="btn-primary" style={{ display: "inline-flex", textDecoration: "none" }}>Learning & assignments</Link>
        </div>
        <header style={{ marginTop: 22 }}>
          <p style={{ color: "var(--brand-secondary)", fontSize: 11, fontWeight: 850, letterSpacing: ".14em", textTransform: "uppercase" }}>TIVA World Foundation</p>
          <h1 style={{ fontSize: "clamp(27px, 5vw, 40px)", fontWeight: 850, letterSpacing: "-.035em", marginTop: 6 }}>My education applications</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>Signed in account: {user.phone ?? "phone verified"}. This page shows only your application and enrolment records.</p>
        </header>

        {loadFailed ? (
          <section style={{ border: "1px solid rgba(212,167,44,.35)", background: "rgba(212,167,44,.06)", borderRadius: 14, padding: 20, marginTop: 22 }}>
            <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 800 }}><ShieldCheck size={18} color="#D4A72C"/> Records temporarily unavailable</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>We could not verify the latest application, cohort, or attendance records. No application status is inferred from a failed request. Please retry later.</p>
          </section>
        ) : (
          <>
            <section style={{ marginTop: 24 }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 20, fontWeight: 850, marginBottom: 13 }}><GraduationCap size={20} color="#8B7CF6"/> Applications ({applications.length})</h2>
              {applications.length === 0 ? (
                <div style={{ border: "1px solid var(--border-subtle)", borderRadius: 14, padding: 22, background: "var(--bg-card)" }}>
                  <p style={{ fontWeight: 800, fontSize: 17 }}>No education applications found</p>
                  <p style={{ color: "var(--text-secondary)", fontSize: 13, marginTop: 7, lineHeight: 1.7 }}>When you apply to a published programme, its reference and review status will appear here.</p>
                  <Link href="/education" className="btn-primary" style={{ display: "inline-flex", marginTop: 14, textDecoration: "none" }}>Explore programmes</Link>
                </div>
              ) : (
                <div style={{ display: "grid", gap: 14 }}>
                  {applications.map((application) => {
                    const program = programs.get(application.program_id);
                    const linkedEnrollments = enrollmentsByApplication.get(application.id) ?? [];
                    return <article key={application.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: 15, padding: "clamp(15px,3vw,22px)", background: "var(--bg-card)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <p style={{ color: "var(--brand-secondary)", fontSize: 10, fontWeight: 850, letterSpacing: ".12em", textTransform: "uppercase" }}>{application.reference_code}</p>
                          <h3 style={{ fontSize: 18, fontWeight: 850, marginTop: 5 }}>{program?.title ?? "Programme details unavailable"}</h3>
                          {program?.summary && <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.7, marginTop: 6 }}>{program.summary}</p>}
                        </div>
                        <StatusPill value={application.status}/>
                      </div>
                      <div style={{ display: "flex", gap: 15, flexWrap: "wrap", color: "var(--text-muted)", fontSize: 11, marginTop: 12 }}>
                        <span>Submitted {formatDateTime(application.submitted_at)}</span>
                        <span>Consent version {application.consent_version}</span>
                        {program && <Link href={`/education/privacy/${program.slug}`} style={{ color: "var(--brand-secondary)", textDecoration: "none", fontWeight: 700 }}>View privacy notice ↗</Link>}
                      </div>

                      {application.status === "accepted" && linkedEnrollments.length === 0 && <p style={{ marginTop: 14, color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.7 }}>Your application is accepted. Cohort assignment is still pending; the Foundation will publish enrolment and session details when assigned.</p>}

                      {linkedEnrollments.length > 0 && (
                        <div style={{ marginTop: 17, display: "grid", gap: 12 }}>
                          {linkedEnrollments.map((enrollment) => {
                            const cohort = cohorts.get(enrollment.cohort_id);
                            const cohortSessions = sessionsByCohort.get(enrollment.cohort_id) ?? [];
                            return <section key={enrollment.id} style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 14 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
                                <div>
                                  <h4 style={{ fontSize: 15, fontWeight: 850 }}>{cohort?.title ?? "Cohort schedule pending"}</h4>
                                  {cohort && <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>{formatDate(cohort.start_date)} – {formatDate(cohort.end_date)} · {humanize(cohort.delivery_mode)} · {cohort.timezone}</p>}
                                </div>
                                <StatusPill value={enrollment.status}/>
                              </div>
                              <div style={{ display: "grid", gap: 9, marginTop: 11 }}>
                                {cohortSessions.length === 0 ? (
                                  <p style={{ color: "var(--text-muted)", fontSize: 12 }}>No published sessions are available yet.</p>
                                ) : cohortSessions.map((session) => {
                                  const mark = attendance.get(session.id);
                                  return <div key={session.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", border: "1px solid var(--border-subtle)", borderRadius: 10, padding: 12 }}>
                                    <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}><CalendarDays size={15} color="#8B7CF6" style={{ marginTop: 2 }}/><div><p style={{ fontSize: 13, fontWeight: 750 }}>{session.title}</p><p style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", gap: 5 }}><Clock3 size={12}/>{formatDateTime(session.starts_at)} – {formatDateTime(session.ends_at)}</p>{session.location_label && <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>{session.location_label}</p>}{session.description && <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.6, marginTop: 6 }}>{session.description}</p>}</div></div>
                                    {mark ? <StatusPill value={mark.attendance_status}/> : <span style={{ color: "var(--text-muted)", fontSize: 10 }}>Attendance not recorded</span>}
                                  </div>;
                                })}
                              </div>
                            </section>;
                          })}
                        </div>
                      )}
                    </article>;
                  })}
                </div>
              )}
            </section>

            {enrollmentsWithoutApplication.length > 0 && <section style={{ marginTop: 26 }}>
              <h2 style={{ fontSize: 19, fontWeight: 850, marginBottom: 12 }}>Other enrolments</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {enrollmentsWithoutApplication.map((enrollment) => {
                  const cohort = cohorts.get(enrollment.cohort_id);
                  const cohortSessions = sessionsByCohort.get(enrollment.cohort_id) ?? [];
                  return <article key={enrollment.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 15, background: "var(--bg-card)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><h3 style={{ fontSize: 15, fontWeight: 800 }}>{cohort?.title ?? "Enrolment"}</h3><StatusPill value={enrollment.status}/></div>
                    <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 7 }}>{cohortSessions.length} published session(s)</p>
                  </article>;
                })}
              </div>
            </section>}
          </>
        )}

        <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.7, marginTop: 26 }}>Applications, enrolments and attendance are read from the authenticated account. Internal reviewer notes, records belonging to other learners and safeguarding case notes are never displayed on this page.</p>
      </div>
    </main>
  );
}
