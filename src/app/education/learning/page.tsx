import Link from "next/link";
import { ArrowLeft, BookOpenCheck, CalendarDays, CheckCircle2, Clock3, FileText, GraduationCap, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { submitEducationWork } from "@/app/actions/education";

type Enrollment = { id: string; cohort_id: string; learner_user_id: string; application_id: string | null; status: string };
type Cohort = { id: string; program_id: string; title: string; status: string; start_date: string | null; end_date: string | null; timezone: string; delivery_mode: string };
type Assessment = { id: string; cohort_id: string; title: string; description: string; rubric: unknown; due_at: string | null; status: string };
type Submission = { id: string; assessment_id: string; cohort_id: string; enrollment_id: string; attempt_number: number; submission_text: string; submitted_at: string };
type Review = { id: string; submission_id: string; score: number | null; max_score: number | null; feedback: string; outcome: string; rubric_version: string | null; created_at: string };

type Props = { searchParams: Promise<{ error?: string; submitted?: string }> };

const errorMessages: Record<string,string> = {
  "invalid-assessment": "The assessment reference is invalid.",
  "invalid-submission": "Your submission must contain 20–8,000 characters.",
  "assessment-unavailable": "Assessment details could not be loaded.",
  "assessment-not-open": "This assessment is not currently accepting work.",
  "deadline-passed": "The deadline has passed; new submissions are blocked.",
  "enrolment-required": "An active or enrolled learner record is required for this cohort.",
  "records-unavailable": "Submission or review history could not be loaded.",
  "already-submitted": "Your current attempt is already submitted. A new attempt opens only when a reviewer requests revisions.",
  "submission-gate": "The database blocked the submission because a deadline, cohort, enrolment or attempt rule was not met.",
  "not-authorized": "Your account is not authorised to submit this work.",
  "submit-failed": "The submission could not be saved. No successful submission is confirmed.",
};

function formatDate(value: string | null) {
  if (!value) return "No deadline";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(date);
}
function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(date);
}
function humanize(value: string) { return value.replaceAll("_", " "); }
function deadlineOpen(value: string | null) {
  return value === null || Date.parse(value) > Date.now();
}
function rubricItems(value: unknown): Array<{title:string;max_points:number}> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is {title:string;max_points:number} =>
    Boolean(item) && typeof item === "object" &&
    typeof (item as Record<string,unknown>).title === "string" &&
    typeof (item as Record<string,unknown>).max_points === "number"
  );
}
const statusColor: Record<string,string> = {
  draft:"#D4A72C", published:"#00C987", closed:"#9CA3AF",
  needs_revision:"#D4A72C", accepted:"#00C987", not_passed:"#F97373", pending_review:"#60A5FA",
  active:"#00C987", enrolled:"#60A5FA", completed:"#00C987", incomplete:"#D4A72C",
};
function StatusPill({ value }: { value: string }) {
  const color = statusColor[value] ?? "#9CA3AF";
  return <span style={{ display:"inline-flex", border:`1px solid ${color}66`, borderRadius:999, padding:"5px 9px", color, background:`${color}12`, fontSize:10, fontWeight:850, textTransform:"uppercase", letterSpacing:".06em" }}>{humanize(value)}</span>;
}

export default async function EducationLearningPage({ searchParams }: Props) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main style={{ minHeight:"100vh", background:"var(--bg-primary)", color:"var(--text-primary)", padding:"clamp(18px,4vw,44px)" }}>
        <section style={{ maxWidth:720, margin:"8vh auto 0", border:"1px solid var(--border-subtle)", borderRadius:18, padding:26, background:"var(--bg-card)" }}>
          <Link href="/education" style={{ display:"inline-flex", alignItems:"center", gap:7, fontSize:13, textDecoration:"none", color:"var(--text-secondary)" }}><ArrowLeft size={15}/> Education programmes</Link>
          <h1 style={{ fontSize:28, fontWeight:850, marginTop:22 }}>Learning & assignments</h1>
          <p style={{ color:"var(--text-secondary)", fontSize:14, lineHeight:1.7, marginTop:10 }}>Sign in with phone OTP to view your published learning tasks, submit work and read feedback on your own submissions.</p>
          <Link href="/login?next=%2Feducation%2Flearning" className="btn-primary" style={{ display:"inline-flex", marginTop:18, textDecoration:"none" }}>Sign in securely</Link>
        </section>
      </main>
    );
  }

  let enrollments: Enrollment[] = [];
  let cohorts = new Map<string,Cohort>();
  let assessments: Assessment[] = [];
  let submissions: Submission[] = [];
  let reviewsBySubmission = new Map<string,Review[]>();
  let ready = false;

  try {
    const { data: enrollmentRows, error: enrollmentError } = await supabase
      .from("education_enrollments")
      .select("id,cohort_id,learner_user_id,application_id,status")
      .eq("learner_user_id", user.id)
      .in("status", ["enrolled","active","completed","incomplete"])
      .order("created_at", { ascending: false })
      .limit(100);
    if (enrollmentError) throw new Error("Enrolments unavailable");
    enrollments = (enrollmentRows ?? []) as Enrollment[];

    const cohortIds = [...new Set(enrollments.map((enrollment) => enrollment.cohort_id))];
    if (cohortIds.length > 0) {
      const [{ data: cohortRows, error: cohortError }, { data: assessmentRows, error: assessmentError }] = await Promise.all([
        supabase.from("education_cohorts")
          .select("id,program_id,title,status,start_date,end_date,timezone,delivery_mode")
          .in("id", cohortIds),
        supabase.from("education_assessments")
          .select("id,cohort_id,title,description,rubric,due_at,status")
          .eq("status", "published")
          .in("cohort_id", cohortIds)
          .order("due_at", { ascending: true }),
      ]);
      if (cohortError || assessmentError) throw new Error("Cohort or assessment list unavailable");
      cohorts = new Map(((cohortRows ?? []) as Cohort[]).map((cohort) => [cohort.id, cohort]));
      assessments = (assessmentRows ?? []) as Assessment[];

      const assessmentIds = [...new Set(assessments.map((assessment) => assessment.id))];
      if (assessmentIds.length > 0) {
        const { data: submissionRows, error: submissionError } = await supabase
          .from("education_submissions")
          .select("id,assessment_id,cohort_id,enrollment_id,attempt_number,submission_text,submitted_at")
          .eq("learner_user_id", user.id)
          .in("assessment_id", assessmentIds)
          .order("submitted_at", { ascending: false })
          .limit(500);
        if (submissionError) throw new Error("Submission history unavailable");
        submissions = (submissionRows ?? []) as Submission[];

        const submissionIds = [...new Set(submissions.map((submission) => submission.id))];
        if (submissionIds.length > 0) {
          const { data: reviewRows, error: reviewError } = await supabase
            .from("education_assessment_reviews")
            .select("id,submission_id,score,max_score,feedback,outcome,rubric_version,created_at")
            .in("submission_id", submissionIds)
            .order("created_at", { ascending: false })
            .limit(1000);
          if (reviewError) throw new Error("Learner feedback unavailable");
          for (const review of (reviewRows ?? []) as Review[]) {
            const bucket = reviewsBySubmission.get(review.submission_id) ?? [];
            bucket.push(review);
            reviewsBySubmission.set(review.submission_id, bucket);
          }
        }
      }
    }
    ready = true;
  } catch {
    ready = false;
    enrollments = [];
    cohorts = new Map();
    assessments = [];
    submissions = [];
    reviewsBySubmission = new Map();
  }

  const submissionsByAssessment = new Map<string,Submission[]>();
  for (const submission of submissions) {
    const bucket = submissionsByAssessment.get(submission.assessment_id) ?? [];
    bucket.push(submission);
    submissionsByAssessment.set(submission.assessment_id, bucket);
  }
  const cohortsById = new Map(cohorts);
  const cohortsWithAssessments = [...cohortsById.values()];
  const errorText = query.error ? errorMessages[query.error] ?? "The request could not be completed." : null;

  return (
    <main style={{ minHeight:"100vh", background:"var(--bg-primary)", color:"var(--text-primary)", padding:"clamp(18px,4vw,44px)" }}>
      <div style={{ maxWidth:1150, margin:"0 auto" }}>
        <Link href="/education/my-applications" style={{ display:"inline-flex", alignItems:"center", gap:7, fontSize:13, textDecoration:"none", color:"var(--text-secondary)" }}><ArrowLeft size={15}/> My applications</Link>
        <header style={{ marginTop:22 }}>
          <p style={{ color:"var(--brand-secondary)", fontSize:11, fontWeight:850, letterSpacing:".14em", textTransform:"uppercase" }}>TIVA World Foundation</p>
          <h1 style={{ fontSize:"clamp(27px,5vw,40px)", fontWeight:850, letterSpacing:"-.035em", marginTop:6 }}>Learning & assignments</h1>
          <p style={{ color:"var(--text-secondary)", fontSize:13, lineHeight:1.7, marginTop:8 }}>Published assessments, submission attempts, rubric scores and reviewer feedback. Only your own work and feedback are visible here.</p>
        </header>

        {query.submitted && <div role="status" style={{ marginTop:17, padding:13, border:"1px solid rgba(0,201,135,.35)", background:"rgba(0,201,135,.07)", borderRadius:10, fontSize:13 }}>Your submission was saved. It will show as awaiting review until a reviewer records feedback.</div>}
        {errorText && <div role="alert" style={{ marginTop:17, padding:13, border:"1px solid rgba(255,107,107,.35)", background:"rgba(255,107,107,.07)", borderRadius:10, fontSize:13 }}>{errorText}</div>}

        {!ready ? (
          <section style={{ marginTop:22, padding:20, border:"1px solid rgba(212,167,44,.35)", borderRadius:14, background:"rgba(212,167,44,.06)" }}>
            <h2 style={{ display:"flex", alignItems:"center", gap:8, fontSize:17, fontWeight:850 }}><AlertTriangle size={18} color="#D4A72C"/> Learning records unavailable</h2>
            <p style={{ color:"var(--text-secondary)", fontSize:13, lineHeight:1.7, marginTop:8 }}>We could not verify enrolment, assessments or review history. No sample assignment or grade is shown as real.</p>
          </section>
        ) : enrollments.length === 0 ? (
          <section style={{ marginTop:22, padding:22, border:"1px solid var(--border-subtle)", borderRadius:14, background:"var(--bg-card)" }}>
            <h2 style={{ fontSize:19, fontWeight:850 }}>No cohort enrolment found</h2>
            <p style={{ color:"var(--text-secondary)", fontSize:13, lineHeight:1.7, marginTop:8 }}>After an application is accepted and the Foundation assigns you to an active cohort, your published learning tasks will appear here.</p>
            <Link href="/education/my-applications" className="btn-primary" style={{ display:"inline-flex", textDecoration:"none", marginTop:14 }}>Check application status</Link>
          </section>
        ) : assessments.length === 0 ? (
          <section style={{ marginTop:22, padding:22, border:"1px solid var(--border-subtle)", borderRadius:14, background:"var(--bg-card)" }}>
            <h2 style={{ fontSize:19, fontWeight:850 }}>No published assessments</h2>
            <p style={{ color:"var(--text-secondary)", fontSize:13, lineHeight:1.7, marginTop:8 }}>Your cohort is visible, but the education team has not published an assessment yet.</p>
            <div style={{ display:"grid", gap:8, marginTop:14 }}>
              {cohortsWithAssessments.map((cohort) => <p key={cohort.id} style={{ fontSize:12, color:"var(--text-muted)" }}>{cohort.title} · {humanize(cohort.status)} · {formatDate(cohort.start_date)} – {formatDate(cohort.end_date)}</p>)}
            </div>
          </section>
        ) : (
          <section style={{ display:"grid", gap:15, marginTop:22 }}>
            {assessments.map((assessment) => {
              const cohort = cohorts.get(assessment.cohort_id);
              const rubric = rubricItems(assessment.rubric);
              const maxScore = rubric.reduce((total,item)=>total+item.max_points,0);
              const attempts = (submissionsByAssessment.get(assessment.id) ?? []).slice().sort((a,b)=>b.attempt_number-a.attempt_number);
              const latest = attempts[0];
              const latestReview = latest ? (reviewsBySubmission.get(latest.id) ?? [])[0] : undefined;
              const canResubmit = latestReview?.outcome === "needs_revision";
              const canSubmit = !latest || canResubmit;
              const canAttempt = ["enrolled","active"].includes(enrollments.find((entry)=>entry.cohort_id===assessment.cohort_id)?.status ?? "");
              return <article key={assessment.id} style={{ border:"1px solid var(--border-subtle)", borderRadius:16, padding:"clamp(16px,3vw,23px)", background:"var(--bg-card)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
                  <div>
                    <p style={{ color:"var(--brand-secondary)", fontSize:10, fontWeight:850, textTransform:"uppercase", letterSpacing:".11em" }}>{cohort?.title ?? "Cohort"}</p>
                    <h2 style={{ fontSize:20, fontWeight:850, marginTop:5 }}>{assessment.title}</h2>
                    {assessment.description && <p style={{ color:"var(--text-secondary)", fontSize:13, lineHeight:1.7, marginTop:8 }}>{assessment.description}</p>}
                  </div>
                  <StatusPill value={assessment.status}/>
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:12, fontSize:11, color:"var(--text-muted)", marginTop:12 }}>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}><CalendarDays size={13}/> Due {formatDateTime(assessment.due_at ?? "")}</span>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}><FileText size={13}/> {rubric.length} rubric criteria</span>
                  <span style={{ display:"inline-flex", alignItems:"center", gap:5 }}><CheckCircle2 size={13}/> Max {maxScore} points</span>
                </div>
                {rubric.length > 0 && <details style={{ borderTop:"1px solid var(--border-subtle)", marginTop:13, paddingTop:10 }}><summary style={{ cursor:"pointer", color:"var(--text-secondary)", fontSize:12, fontWeight:800 }}>View grading rubric</summary><div style={{ display:"grid", gap:7, marginTop:10 }}>{rubric.map((item,index)=><div key={`${assessment.id}-${index}`} style={{ display:"flex", justifyContent:"space-between", gap:10, border:"1px solid var(--border-subtle)", borderRadius:8, padding:9, fontSize:12 }}><span>{item.title}</span><strong>{item.max_points} points</strong></div>)}</div></details>}

                {attempts.length > 0 && <div style={{ display:"grid", gap:10, marginTop:15 }}>
                  {attempts.map((submission) => {
                    const history = reviewsBySubmission.get(submission.id) ?? [];
                    const review = history[0];
                    return <details key={submission.id} style={{ border:"1px solid var(--border-subtle)", borderRadius:11, padding:12 }} open={submission.id===latest?.id}>
                      <summary style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap", cursor:"pointer" }}>
                        <span style={{ fontSize:12, fontWeight:850 }}>Attempt {submission.attempt_number} · submitted {formatDateTime(submission.submitted_at)}</span>
                        <span style={{ display:"inline-flex", gap:8, alignItems:"center" }}>{review ? <StatusPill value={review.outcome}/> : <StatusPill value="pending_review"/>}{review && <strong style={{ fontSize:12 }}>{review.score ?? "—"} / {review.max_score ?? maxScore}</strong>}</span>
                      </summary>
                      <pre style={{ whiteSpace:"pre-wrap", overflowWrap:"anywhere", fontFamily:"inherit", color:"var(--text-secondary)", fontSize:12, lineHeight:1.7, marginTop:10 }}>{submission.submission_text}</pre>
                      {review && <div style={{ borderTop:"1px solid var(--border-subtle)", marginTop:11, paddingTop:10 }}>
                        <h3 style={{ display:"flex", alignItems:"center", gap:7, fontSize:12, fontWeight:850 }}><ShieldCheck size={14} color="#8B7CF6"/> Reviewer feedback</h3>
                        <p style={{ color:"var(--text-secondary)", fontSize:12, lineHeight:1.7, marginTop:7 }}>{review.feedback}</p>
                        <p style={{ color:"var(--text-muted)", fontSize:10, marginTop:5 }}>{formatDateTime(review.created_at)} · Rubric {review.rubric_version ?? "version not recorded"}</p>
                      </div>}
                    </details>;
                  })}
                </div>}

                {canSubmit && canAttempt && (
                  <form action={submitEducationWork} style={{ marginTop:15, borderTop:"1px solid var(--border-subtle)", paddingTop:15, display:"grid", gap:10 }}>
                    <input type="hidden" name="assessment_id" value={assessment.id}/>
                    <h3 style={{ display:"flex", alignItems:"center", gap:8, fontSize:15, fontWeight:850 }}><FileText size={16}/>{latest ? "Submit requested revision" : "Submit your work"}</h3>
                    <p style={{ color:"var(--text-secondary)", fontSize:12, lineHeight:1.6 }}>This pilot accepts text submissions only. Do not include identity documents, financial credentials or unrelated sensitive personal information.</p>
                    <textarea name="submission_text" required minLength={20} maxLength={8000} rows={6} placeholder="Describe your work, evidence, source links and reflection." style={{...inputStyle,resize:"vertical"}}/>
                    <button type="submit" className="btn-primary" style={{ border:0, borderRadius:9, padding:12, fontWeight:850, cursor:"pointer" }}>{latest ? "Submit revised attempt" : "Submit assessment"}</button>
                  </form>
                )}
              </article>;
            })}
          </section>
        )}

        <p style={{ color:"var(--text-muted)", fontSize:11, lineHeight:1.7, marginTop:25 }}>Scores and feedback are read from the assessment-review register scoped to your own submissions. Outcomes do not automatically grant completion or issue certificates; those decisions remain separately authorised.</p>
      </div>
    </main>
  );
}
