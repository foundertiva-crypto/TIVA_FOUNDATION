import { requireEducationAdmin } from "@/lib/education/admin-guard";
import Link from "next/link";
import type { CSSProperties } from "react";
import { AlertTriangle, ArrowLeft, BookOpenCheck, ExternalLink, FileText, Star } from "lucide-react";
import {
  createEducationAssessment,
  reviewEducationSubmission,
  setEducationAssessmentStatus,
} from "@/app/actions/education";
import { createAdminClient } from "@/lib/supabase/admin";

type Cohort = { id: string; title: string; program_id: string; status: string; start_date: string | null; end_date: string | null };
type Assessment = { id: string; cohort_id: string; title: string; description: string; rubric: unknown; due_at: string | null; status: string; created_at: string };
type Submission = { id: string; assessment_id: string; cohort_id: string; learner_user_id: string; attempt_number: number; submission_text: string; submitted_at: string };
type Review = { id: string; submission_id: string; reviewer_user_id: string; score: number | null; max_score: number | null; feedback: string; outcome: string; rubric_version: string | null; created_at: string };
type Program = { id: string; title: string };
type Profile = { id: string; full_name: string | null };

type Props = { searchParams: Promise<{ error?: string; created?: string; updated?: string; reviewed?: string; submitted?: string }> };

const errors: Record<string,string> = {
  "invalid-cohort": "Select a valid cohort.",
  "invalid-title": "Assessment title must be 3–180 characters.",
  "description-too-long": "Description must be 2,000 characters or fewer.",
  "invalid-rubric": "Rubric JSON must contain 1–20 criteria, each with a title and max_points between 1 and 100.",
  "invalid-deadline": "Enter a valid deadline in India time.",
  "deadline-in-past": "The assessment deadline must be in the future.",
  "cohort-unavailable": "The cohort could not be loaded.",
  "cohort-not-active": "Activate the cohort before publishing assessments.",
  "program-not-published": "The parent programme must be published.",
  "migration-required": "The assessment schema is not installed or the database API cache needs a reload.",
  "not-authorized": "Your account is not authorised for this education action.",
  "create-failed": "Assessment could not be created.",
  "invalid-assessment": "The assessment reference is invalid.",
  "invalid-status": "Choose a supported assessment status.",
  "assessment-unavailable": "The assessment could not be loaded.",
  "invalid-transition": "That assessment status transition is not allowed.",
  "update-failed": "Assessment status could not be saved.",
  "invalid-submission": "Submission reference or text is invalid.",
  "assessment-not-open": "The assessment is not accepting submissions.",
  "deadline-passed": "The submission deadline has passed.",
  "enrolment-required": "An eligible enrolment in this cohort is required.",
  "records-unavailable": "Submission or review history could not be loaded.",
  "already-submitted": "A new attempt is available only after a reviewer requests revisions.",
  "submission-gate": "The database rejected the submission because a deadline, enrolment or attempt rule was not met.",
  "submit-failed": "Submission could not be saved.",
  "invalid-outcome": "Choose a valid review outcome.",
  "invalid-score": "Enter a score greater than or equal to zero.",
  "invalid-feedback": "Feedback must be 5–5,000 characters.",
  "invalid-rubric-version": "Rubric version format is invalid.",
  "submission-unavailable": "The submission could not be loaded.",
  "self-review": "Reviewers cannot review their own submission.",
  "score-exceeds-rubric": "The score cannot exceed the total defined rubric points.",
  "review-failed": "Review could not be saved.",
};

const defaultRubric = JSON.stringify([
  { title: "Evidence quality", max_points: 25 },
  { title: "Execution and problem solving", max_points: 25 },
  { title: "Collaboration and communication", max_points: 25 },
  { title: "Reflection and learning", max_points: 25 },
], null, 2);

const inputStyle: CSSProperties = {
  width: "100%", minHeight: 42, border: "1px solid var(--border-accent)",
  borderRadius: 9, padding: "10px 12px", background: "var(--bg-secondary)",
  color: "var(--text-primary)", outline: "none", fontSize: 12,
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
function rubricTotal(value: unknown) {
  if (!Array.isArray(value)) return 0;
  return value.reduce((total, item) => {
    if (!item || typeof item !== "object") return total;
    const points = Number((item as Record<string,unknown>).max_points);
    return Number.isFinite(points) && points > 0 ? total + points : total;
  }, 0);
}
const statusColor: Record<string,string> = { draft: "#D4A72C", published: "#00C987", closed: "#9CA3AF", needs_revision: "#D4A72C", accepted: "#00C987", not_passed: "#F97373", pending_review: "#60A5FA" };

function Pill({ status }: { status: string }) {
  const color = statusColor[status] ?? "#9CA3AF";
  return <span style={{ display:"inline-flex", border:`1px solid ${color}66`, borderRadius:999, padding:"5px 9px", color, background:`${color}12`, fontSize:10, fontWeight:850, letterSpacing:".06em", textTransform:"uppercase" }}>{humanize(status)}</span>;
}

export default async function EducationAssessmentsAdminPage({ searchParams }: Props) {
  await requireEducationAdmin();
  const query = await searchParams;
  let ready = false;
  let cohorts: Cohort[] = [];
  let programs: Program[] = [];
  let assessments: Assessment[] = [];
  let submissions: Submission[] = [];
  let reviews: Review[] = [];
  const learnerNames = new Map<string,string>();

  try {
    const admin = createAdminClient();
    const [cohortResult, programResult, assessmentResult, submissionResult, reviewResult] = await Promise.all([
      admin.from("education_cohorts").select("id,title,program_id,status,start_date,end_date").order("created_at", { ascending: false }).limit(500),
      admin.from("education_programs").select("id,title").limit(500),
      admin.from("education_assessments").select("id,cohort_id,title,description,rubric,due_at,status,created_at").order("created_at", { ascending: false }).limit(500),
      admin.from("education_submissions").select("id,assessment_id,cohort_id,learner_user_id,attempt_number,submission_text,submitted_at").order("submitted_at", { ascending: false }).limit(3000),
      admin.from("education_assessment_reviews").select("id,submission_id,reviewer_user_id,score,max_score,feedback,outcome,rubric_version,created_at").order("created_at", { ascending: false }).limit(5000),
    ]);

    if (!cohortResult.error && !programResult.error && !assessmentResult.error && !submissionResult.error && !reviewResult.error) {
      ready = true;
      cohorts = (cohortResult.data ?? []) as Cohort[];
      programs = (programResult.data ?? []) as Program[];
      assessments = (assessmentResult.data ?? []) as Assessment[];
      submissions = (submissionResult.data ?? []) as Submission[];
      reviews = (reviewResult.data ?? []) as Review[];

      const learnerIds = [...new Set(submissions.map((submission) => submission.learner_user_id))];
      if (learnerIds.length > 0) {
        const { data } = await admin.from("profiles").select("id,full_name").in("id", learnerIds.slice(0, 5000));
        for (const row of (data ?? []) as Profile[]) learnerNames.set(row.id, row.full_name || `Learner ${row.id.slice(0,8)}`);
      }
    }
  } catch {
    ready = false;
  }

  const cohortMap = new Map(cohorts.map((cohort) => [cohort.id, cohort]));
  const programMap = new Map(programs.map((program) => [program.id, program]));
  const submissionsByAssessment = new Map<string,Submission[]>();
  for (const submission of submissions) {
    const bucket = submissionsByAssessment.get(submission.assessment_id) ?? [];
    bucket.push(submission);
    submissionsByAssessment.set(submission.assessment_id, bucket);
  }
  const reviewsBySubmission = new Map<string,Review[]>();
  for (const review of reviews) {
    const bucket = reviewsBySubmission.get(review.submission_id) ?? [];
    bucket.push(review);
    reviewsBySubmission.set(review.submission_id, bucket);
  }
  const errorText = query.error ? errors[query.error] ?? "The operation could not be completed." : null;
  const eligibleCohorts = cohorts.filter((cohort) => cohort.status === "active" && programMap.has(cohort.program_id));

  return (
    <div style={{ maxWidth: 1450, margin: "0 auto", padding: "clamp(16px, 3vw, 32px)", color: "var(--text-primary)" }}>
      <Link href="/admin/education" style={{ display:"inline-flex", alignItems:"center", gap:7, fontSize:13, textDecoration:"none", color:"var(--text-secondary)" }}><ArrowLeft size={15}/> Education operations</Link>
      <header style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:18, flexWrap:"wrap", marginTop:20 }}>
        <div>
          <p style={{ color:"var(--brand-secondary)", fontSize:11, fontWeight:850, letterSpacing:".14em", textTransform:"uppercase" }}>TIVA World Foundation</p>
          <h1 style={{ fontSize:"clamp(25px,4vw,36px)", fontWeight:850, letterSpacing:"-.035em", marginTop:6 }}>Assessments & learning evidence</h1>
          <p style={{ color:"var(--text-secondary)", fontSize:13, lineHeight:1.7, maxWidth:870, marginTop:8 }}>Create rubric-based assessments for active cohorts, publish a deadline, review submitted work and record revision/acceptance decisions. Learners see only their own feedback.</p>
        </div>
        <Link href="/education/learning" target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:7, border:"1px solid var(--border-subtle)", borderRadius:999, padding:"8px 12px", color:"var(--brand-secondary)", textDecoration:"none", fontSize:11, fontWeight:800 }}><ExternalLink size={14}/> Learner view</Link>
      </header>

      {query.created && <div role="status" style={{ marginTop:16, padding:13, border:"1px solid rgba(0,201,135,.35)", background:"rgba(0,201,135,.07)", borderRadius:10, fontSize:13 }}>Assessment created as a draft. Publish only after checking the rubric, deadline and cohort.</div>}
      {query.updated && <div role="status" style={{ marginTop:16, padding:13, border:"1px solid rgba(0,201,135,.35)", background:"rgba(0,201,135,.07)", borderRadius:10, fontSize:13 }}>Assessment status updated.</div>}
      {query.reviewed && <div role="status" style={{ marginTop:16, padding:13, border:"1px solid rgba(0,201,135,.35)", background:"rgba(0,201,135,.07)", borderRadius:10, fontSize:13 }}>Review saved. The learner will see this review on their Learning page.</div>}
      {query.submitted && <div role="status" style={{ marginTop:16, padding:13, border:"1px solid rgba(0,201,135,.35)", background:"rgba(0,201,135,.07)", borderRadius:10, fontSize:13 }}>Submission saved.</div>}
      {errorText && <div role="alert" style={{ marginTop:16, padding:13, border:"1px solid rgba(255,107,107,.35)", background:"rgba(255,107,107,.07)", borderRadius:10, fontSize:13 }}>{errorText}</div>}

      {!ready ? (
        <section style={{ marginTop:22, border:"1px solid rgba(212,167,44,.35)", borderRadius:14, padding:20, background:"rgba(212,167,44,.06)" }}>
          <h2 style={{ display:"flex", alignItems:"center", gap:8, fontSize:17, fontWeight:850 }}><AlertTriangle size={18} color="#D4A72C"/> Education database not verified</h2>
          <p style={{ color:"var(--text-secondary)", fontSize:13, lineHeight:1.7, marginTop:8 }}>Assessment, submission or review tables are unavailable. No sample submissions or grades are presented as real.</p>
        </section>
      ) : (
        <>
          <section className="glass-card" style={{ padding:20, marginTop:22 }}>
            <h2 style={{ display:"flex", alignItems:"center", gap:9, fontSize:20, fontWeight:850 }}><BookOpenCheck size={19}/> Create an assessment</h2>
            <p style={{ color:"var(--text-secondary)", fontSize:12, lineHeight:1.7, marginTop:7, marginBottom:14 }}>Assessments start as drafts. Rubric weights define the maximum score. Learners cannot submit until the assessment is published.</p>
            {eligibleCohorts.length === 0 ? (
              <p style={{ color:"var(--text-secondary)", fontSize:13 }}>Activate a cohort under a published programme before creating assessments.</p>
            ) : (
              <form action={createEducationAssessment} style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap:12 }}>
                <label style={{ display:"grid", gap:6, color:"var(--text-secondary)", fontSize:12, gridColumn:"1 / -1" }}>Active cohort
                  <select name="cohort_id" required defaultValue="" style={inputStyle}><option value="" disabled>Select cohort</option>{eligibleCohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{programMap.get(cohort.program_id)?.title ?? "Programme"} · {cohort.title}</option>)}</select>
                </label>
                <label style={{ display:"grid", gap:6, color:"var(--text-secondary)", fontSize:12, gridColumn:"1 / -1" }}>Assessment title
                  <input name="title" required minLength={3} maxLength={180} placeholder="Day 2 — Problem statement and stakeholder map" style={inputStyle}/>
                </label>
                <label style={{ display:"grid", gap:6, color:"var(--text-secondary)", fontSize:12, gridColumn:"1 / -1" }}>Instructions / evidence requirements
                  <textarea name="description" maxLength={2000} rows={3} placeholder="Explain what students must submit and what good evidence looks like." style={{...inputStyle,resize:"vertical"}}/>
                </label>
                <label style={{ display:"grid", gap:6, color:"var(--text-secondary)", fontSize:12 }}>Deadline (India time)
                  <input name="due_at" type="datetime-local" required style={inputStyle}/>
                </label>
                <div style={{ display:"grid", gap:6, color:"var(--text-secondary)", fontSize:12 }}>Rubric format
                  <p style={{ lineHeight:1.6 }}>JSON array; each criterion has a title and max_points. Total 1–1,000 points.</p>
                </div>
                <label style={{ display:"grid", gap:6, color:"var(--text-secondary)", fontSize:12, gridColumn:"1 / -1" }}>Rubric JSON
                  <textarea name="rubric_json" required defaultValue={defaultRubric} rows={8} spellCheck={false} style={{...inputStyle,resize:"vertical",fontFamily:"ui-monospace,monospace"}}/>
                </label>
                <button type="submit" className="btn-primary" style={{ border:0, borderRadius:10, padding:13, fontWeight:850, cursor:"pointer", gridColumn:"1 / -1" }}>Create draft assessment</button>
              </form>
            )}
          </section>

          <section style={{ marginTop:28 }}>
            <h2 style={{ fontSize:22, fontWeight:850, marginBottom:14 }}>Assessment register</h2>
            {assessments.length === 0 ? <div style={{ border:"1px solid var(--border-subtle)", borderRadius:14, padding:22, color:"var(--text-secondary)", fontSize:13 }}>No assessments created yet.</div> : (
              <div style={{ display:"grid", gap:16 }}>
                {assessments.map((assessment) => {
                  const cohort = cohortMap.get(assessment.cohort_id);
                  const maxScore = rubricTotal(assessment.rubric);
                  const assessmentSubmissions = submissionsByAssessment.get(assessment.id) ?? [];
                  return <article key={assessment.id} style={{ border:"1px solid var(--border-subtle)", borderRadius:16, padding:"clamp(16px,3vw,22px)", background:"var(--bg-card)" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start", flexWrap:"wrap" }}>
                      <div>
                        <p style={{ color:"var(--brand-secondary)", textTransform:"uppercase", letterSpacing:".1em", fontSize:10, fontWeight:850 }}>{programMap.get(cohort?.program_id ?? "")?.title ?? "Programme"} · {cohort?.title ?? "Cohort unavailable"}</p>
                        <h3 style={{ fontSize:18, fontWeight:850, marginTop:5 }}>{assessment.title}</h3>
                        {assessment.description && <p style={{ color:"var(--text-secondary)", fontSize:12, lineHeight:1.7, marginTop:7 }}>{assessment.description}</p>}
                        <p style={{ color:"var(--text-muted)", fontSize:11, marginTop:8 }}>Due {formatDateTime(assessment.due_at ?? assessment.created_at)} · Rubric max {maxScore} points · {assessmentSubmissions.length} submission(s)</p>
                      </div>
                      <Pill status={assessment.status}/>
                    </div>

                    {assessment.status === "draft" && <form action={setEducationAssessmentStatus} style={{ marginTop:14, borderTop:"1px solid var(--border-subtle)", paddingTop:12 }}><input type="hidden" name="assessment_id" value={assessment.id}/><input type="hidden" name="status" value="published"/><button type="submit" className="btn-primary" style={{ border:0, borderRadius:9, padding:"9px 12px", fontSize:12, fontWeight:850, cursor:"pointer" }}>Publish for learners</button></form>}
                    {assessment.status === "published" && <form action={setEducationAssessmentStatus} style={{ marginTop:14, borderTop:"1px solid var(--border-subtle)", paddingTop:12 }}><input type="hidden" name="assessment_id" value={assessment.id}/><input type="hidden" name="status" value="closed"/><button type="submit" style={{ border:"1px solid var(--border-subtle)", borderRadius:9, background:"transparent", color:"var(--text-secondary)", padding:"8px 11px", fontSize:11, fontWeight:800, cursor:"pointer" }}>Close assessment</button></form>}

                    <div style={{ display:"grid", gap:12, marginTop:17 }}>
                      {assessmentSubmissions.map((submission) => {
                        const reviewHistory = reviewsBySubmission.get(submission.id) ?? [];
                        const latestReview = reviewHistory[0];
                        return <details key={submission.id} style={{ border:"1px solid var(--border-subtle)", borderRadius:12, padding:13 }}>
                          <summary style={{ cursor:"pointer", display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                            <span style={{ fontSize:13, fontWeight:800 }}>{learnerNames.get(submission.learner_user_id) ?? `Learner ${submission.learner_user_id.slice(0,8)}`} · Attempt {submission.attempt_number}</span>
                            <span style={{ display:"inline-flex", gap:8, alignItems:"center" }}>{latestReview && <Pill status={latestReview.outcome}/>} <span style={{ color:"var(--text-muted)", fontSize:10 }}>{formatDateTime(submission.submitted_at)}</span></span>
                          </summary>
                          <div style={{ borderTop:"1px solid var(--border-subtle)", marginTop:12, paddingTop:12 }}>
                            <pre style={{ whiteSpace:"pre-wrap", overflowWrap:"anywhere", fontFamily:"inherit", color:"var(--text-secondary)", fontSize:12, lineHeight:1.7, margin:0 }}>{submission.submission_text}</pre>
                            {reviewHistory.length > 0 && <div style={{ display:"grid", gap:8, marginTop:12 }}>
                              <h4 style={{ fontSize:12, fontWeight:850, display:"flex", alignItems:"center", gap:7 }}><Star size={14} color="#D4A72C"/> Review history</h4>
                              {reviewHistory.map((review) => <div key={review.id} style={{ border:"1px solid var(--border-subtle)", borderRadius:9, padding:10 }}>
                                <div style={{ display:"flex", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}><Pill status={review.outcome}/><strong style={{ fontSize:12 }}>{review.score ?? "—"} / {review.max_score ?? maxScore}</strong></div>
                                <p style={{ fontSize:12, lineHeight:1.65, color:"var(--text-secondary)", marginTop:7 }}>{review.feedback}</p>
                                <p style={{ fontSize:10, color:"var(--text-muted)", marginTop:5 }}>{formatDateTime(review.created_at)} · Rubric {review.rubric_version ?? "version not recorded"}</p>
                              </div>)}
                            </div>}
                            <form action={reviewEducationSubmission} style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 170px), 1fr))", gap:10, marginTop:14, borderTop:"1px solid var(--border-subtle)", paddingTop:13 }}>
                              <input type="hidden" name="submission_id" value={submission.id}/>
                              <input type="hidden" name="rubric_version" value="rubric-v1"/>
                              <label style={{ display:"grid", gap:5, fontSize:11, color:"var(--text-secondary)" }}>Score (0–{maxScore})
                                <input type="number" name="score" required min={0} max={maxScore} step="0.01" style={inputStyle}/>
                              </label>
                              <label style={{ display:"grid", gap:5, fontSize:11, color:"var(--text-secondary)" }}>Decision
                                <select name="outcome" required defaultValue="needs_revision" style={inputStyle}>
                                  <option value="needs_revision">Needs revision</option><option value="accepted">Accepted</option><option value="not_passed">Not passed</option>
                                </select>
                              </label>
                              <label style={{ display:"grid", gap:5, fontSize:11, color:"var(--text-secondary)", gridColumn:"1 / -1" }}>Feedback
                                <textarea name="feedback" required minLength={5} maxLength={5000} rows={3} placeholder="Specific feedback against the rubric and next steps" style={{...inputStyle,resize:"vertical"}}/>
                              </label>
                              <button type="submit" className="btn-primary" style={{ border:0, borderRadius:9, padding:12, fontWeight:850, cursor:"pointer", gridColumn:"1 / -1" }}>Save review</button>
                            </form>
                          </div>
                        </details>;
                      })}
                      {assessmentSubmissions.length === 0 && <p style={{ color:"var(--text-muted)", fontSize:12 }}>No student submissions yet.</p>}
                    </div>
                  </article>;
                })}
              </div>
            )}
          </section>
        </>
      )}

      <p style={{ color:"var(--text-muted)", fontSize:11, lineHeight:1.7, marginTop:26 }}>This is an in-portal text-submission workflow. Attachments remain disabled until private object storage and upload policies are deployed. Review history is append-only; assessment outcomes never issue a certificate automatically.</p>
    </div>
  );
}
