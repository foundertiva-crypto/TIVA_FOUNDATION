import Link from "next/link";
import type { CSSProperties } from "react";
import { AlertTriangle, ArrowLeft, CalendarCheck, ClipboardCheck, Clock3, ShieldCheck } from "lucide-react";
import { recordEducationAttendance } from "@/app/actions/education";
import { createAdminClient } from "@/lib/supabase/admin";

type Session = {
  id: string;
  cohort_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  published: boolean;
};
type Cohort = { id: string; program_id: string; title: string; status: string; timezone: string };
type Enrollment = { id: string; cohort_id: string; learner_user_id: string; status: string };
type Profile = { id: string; full_name: string | null };
type Attendance = {
  id: string;
  session_id: string;
  enrollment_id: string;
  learner_user_id: string;
  attendance_status: string;
  correction_reason: string | null;
  recorded_by: string | null;
  recorded_at: string;
  last_corrected_by: string | null;
  last_corrected_at: string | null;
};

type Props = { searchParams: Promise<{ error?: string; saved?: string }> };

const errorMessages: Record<string,string> = {
  "invalid-reference": "The session or enrolment reference is invalid.",
  "invalid-status": "Select a valid attendance status.",
  "reason-too-long": "Correction reason must be 500 characters or fewer.",
  "session-unavailable": "The session could not be loaded.",
  "session-not-published": "Publish the session before recording attendance.",
  "session-not-started": "Attendance cannot be recorded before the session starts.",
  "enrollment-unavailable": "The learner enrolment could not be loaded.",
  "enrollment-mismatch": "The learner is not enrolled in this session's cohort.",
  "database": "The attendance query failed.",
  "correction-reason-required": "Enter a correction reason of at least five characters before changing an existing attendance status.",
  "not-authorized": "Your account is not authorised to record attendance for this cohort.",
  "correction-failed": "Attendance correction failed; the prior record remains unchanged.",
  "record-failed": "Attendance could not be saved.",
};

const statusOptions = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
];

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
  }).format(date);
}
function humanize(value: string) { return value.replaceAll("_", " "); }

const inputStyle: CSSProperties = {
  width: "100%", minHeight: 40, border: "1px solid var(--border-accent)",
  borderRadius: 8, padding: "8px 10px", background: "var(--bg-secondary)",
  color: "var(--text-primary)", outline: "none", fontSize: 12,
};

export default async function EducationAttendanceAdminPage({ searchParams }: Props) {
  const query = await searchParams;
  let ready = false;
  let sessions: Session[] = [];
  let cohorts: Cohort[] = [];
  let enrollments: Enrollment[] = [];
  let profiles = new Map<string,string>();
  let attendance = new Map<string,Attendance>();

  try {
    const admin = createAdminClient();
    const [sessionResult, cohortResult, enrollmentResult, attendanceResult] = await Promise.all([
      admin.from("education_sessions").select("id,cohort_id,title,starts_at,ends_at,published").eq("published", true).order("starts_at", { ascending: false }).limit(300),
      admin.from("education_cohorts").select("id,program_id,title,status,timezone").limit(500),
      admin.from("education_enrollments").select("id,cohort_id,learner_user_id,status").limit(5000),
      admin.from("education_attendance").select("id,session_id,enrollment_id,learner_user_id,attendance_status,correction_reason,recorded_by,recorded_at,last_corrected_by,last_corrected_at").limit(10000),
    ]);

    if (!sessionResult.error && !cohortResult.error && !enrollmentResult.error && !attendanceResult.error) {
      sessions = (sessionResult.data ?? []) as Session[];
      cohorts = (cohortResult.data ?? []) as Cohort[];
      enrollments = (enrollmentResult.data ?? []) as Enrollment[];
      for (const row of attendanceResult.data ?? []) {
        attendance.set(`${row.session_id}:${row.enrollment_id}`, row as Attendance);
      }

      const learnerIds = [...new Set(enrollments.map((row) => row.learner_user_id))];
      if (learnerIds.length > 0) {
        const { data: profileRows, error: profileError } = await admin
          .from("profiles").select("id,full_name").in("id", learnerIds.slice(0, 5000));
        if (!profileError) profiles = new Map((profileRows ?? []).map((p) => [p.id as string, (p.full_name as string | null) || `Learner ${String(p.id).slice(0,8)}`]));
      }
      ready = true;
    }
  } catch {
    ready = false;
  }

  const cohortMap = new Map(cohorts.map((cohort) => [cohort.id, cohort]));
  const eligibleEnrollments = enrollments.filter((row) => ["enrolled","active","completed","incomplete"].includes(row.status));
  const errorText = query.error ? errorMessages[query.error] ?? "The request could not be completed." : null;

  return (
    <div style={{ maxWidth: 1450, margin: "0 auto", padding: "clamp(16px, 3vw, 32px)", color: "var(--text-primary)" }}>
      <Link href="/admin/education" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, color: "var(--text-secondary)", textDecoration: "none" }}><ArrowLeft size={15} /> Education operations</Link>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginTop: 20 }}>
        <div>
          <p style={{ color: "var(--brand-secondary)", fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>TIVA World Foundation</p>
          <h1 style={{ fontSize: "clamp(25px, 4vw, 36px)", fontWeight: 850, letterSpacing: "-.035em", marginTop: 6 }}>Attendance register</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, maxWidth: 860, marginTop: 8 }}>Attendance is recorded against the actual session and learner enrolment. Corrections require a reason and capture the correcting account and timestamp.</p>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "8px 12px", fontSize: 11, fontWeight: 800, color: "var(--text-secondary)" }}><ShieldCheck size={15}/> PRIVATE STAFF DATA</span>
      </header>

      {query.saved && <div role="status" style={{ marginTop: 18, padding: 13, borderRadius: 10, border: "1px solid rgba(0,201,135,.35)", background: "rgba(0,201,135,.07)", fontSize: 13 }}>Attendance saved. The register below shows current recorded status.</div>}
      {errorText && <div role="alert" style={{ marginTop: 18, padding: 13, borderRadius: 10, border: "1px solid rgba(255,107,107,.35)", background: "rgba(255,107,107,.07)", fontSize: 13 }}>{errorText}</div>}

      {!ready ? (
        <section style={{ marginTop: 22, padding: 20, borderRadius: 14, border: "1px solid rgba(212,167,44,.35)", background: "rgba(212,167,44,.06)" }}>
          <h2 style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 17, fontWeight: 800 }}><AlertTriangle size={18} color="#D4A72C"/> Education database not verified</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>Sessions or attendance records could not be loaded. No example attendance is shown as real. Verify the education migrations and permissions in staging.</p>
        </section>
      ) : sessions.length === 0 ? (
        <section style={{ marginTop: 22, padding: 22, borderRadius: 14, border: "1px solid var(--border-subtle)", background: "var(--bg-card)" }}>
          <h2 style={{ fontSize: 19, fontWeight: 800 }}>No published sessions</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginTop: 8 }}>Publish a session in the cohort scheduler. Future sessions will appear here, but attendance cannot be recorded until the session start time.</p>
          <Link href="/admin/education/cohorts" className="btn-primary" style={{ display: "inline-flex", marginTop: 14, textDecoration: "none" }}>Open cohort scheduler</Link>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 18, marginTop: 24 }}>
          {sessions.map((session) => {
            const cohort = cohortMap.get(session.cohort_id);
            const roster = eligibleEnrollments.filter((enrollment) => enrollment.cohort_id === session.cohort_id);
            const marked = roster.filter((enrollment) => {
              const record = attendance.get(`${session.id}:${enrollment.id}`);
              return Boolean(record && record.attendance_status !== "pending");
            }).length;

            return (
              <section key={session.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: 16, padding: "clamp(15px, 3vw, 22px)", background: "var(--bg-card)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 15, alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div>
                    <p style={{ color: "var(--brand-secondary)", fontSize: 10, fontWeight: 850, letterSpacing: ".1em", textTransform: "uppercase" }}>{cohort?.title ?? "Cohort unavailable"}</p>
                    <h2 style={{ fontSize: 18, fontWeight: 850, marginTop: 5 }}>{session.title}</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 7, display: "flex", gap: 7, alignItems: "center" }}><Clock3 size={14}/>{formatDateTime(session.starts_at)} – {formatDateTime(session.ends_at)}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 850, color: marked === roster.length && roster.length > 0 ? "#00C987" : "var(--text-secondary)", border: "1px solid var(--border-subtle)", borderRadius: 999, padding: "6px 10px" }}>Marked {marked}/{roster.length}</span>
                </div>

                {roster.length === 0 ? (
                  <p style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 13, marginTop: 14, color: "var(--text-muted)", fontSize: 12 }}>No active or eligible enrolments in this cohort yet.</p>
                ) : (
                  <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
                    {roster.map((enrollment) => {
                      const key = `${session.id}:${enrollment.id}`;
                      const record = attendance.get(key);
                      const currentStatus = record?.attendance_status && statusOptions.some((option) => option.value === record.attendance_status)
                        ? record.attendance_status : "present";
                      return (
                        <form key={enrollment.id} action={recordEducationAttendance} style={{ display: "grid", gridTemplateColumns: "minmax(140px, 1.2fr) minmax(140px, .8fr) minmax(160px, 1fr) auto", gap: 9, alignItems: "end", borderTop: "1px solid var(--border-subtle)", paddingTop: 11 }}>
                          <input type="hidden" name="session_id" value={session.id}/>
                          <input type="hidden" name="enrollment_id" value={enrollment.id}/>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 750 }}>{profiles.get(enrollment.learner_user_id) ?? `Learner ${enrollment.learner_user_id.slice(0,8)}`}</p>
                            <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 3 }}>Enrolment {enrollment.id.slice(0,8)} · {humanize(enrollment.status)}</p>
                            {record && <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 3 }}>Last recorded {formatDateTime(record.recorded_at)}</p>}
                          </div>
                          <label style={{ display: "grid", gap: 5, color: "var(--text-secondary)", fontSize: 11 }}>Attendance status
                            <select name="attendance_status" defaultValue={currentStatus} style={inputStyle}>
                              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </label>
                          <label style={{ display: "grid", gap: 5, color: "var(--text-secondary)", fontSize: 11 }}>Correction reason (required when changing a saved status)
                            <input name="correction_reason" maxLength={500} placeholder="Reason for correction, if any" style={inputStyle}/>
                          </label>
                          <button type="submit" className="btn-primary" style={{ border: 0, borderRadius: 8, padding: "10px 12px", fontWeight: 800, fontSize: 11, cursor: "pointer" }}>Save</button>
                          {record?.last_corrected_at && <p style={{ gridColumn: "1 / -1", color: "var(--text-muted)", fontSize: 10 }}>Corrected {formatDateTime(record.last_corrected_at)} by {record.last_corrected_by?.slice(0,8) ?? "staff"} · {record.correction_reason}</p>}
                        </form>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
      <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.7, marginTop: 24 }}>Attendance records contain learner data and should not be copied into public reports. Any correction retains the original recorder, correction actor/time and a reason; cohort staff access remains enforced by RLS.</p>
    </div>
  );
}
