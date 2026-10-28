-- PostgreSQL 16 smoke tests for the existing 202610290001_foundation_education.sql schema.
-- Use only with the isolated disposable CI database; everything rolls back.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
 ('10000000-0000-4000-8000-000000000001', 'learner-a@example.test'),
 ('10000000-0000-4000-8000-000000000002', 'learner-b@example.test'),
 ('10000000-0000-4000-8000-000000000003', 'admin@example.test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, phone, full_name, role)
VALUES
 ('10000000-0000-4000-8000-000000000001', '+910000000001', 'Learner A', 'user'),
 ('10000000-0000-4000-8000-000000000002', '+910000000002', 'Learner B', 'user'),
 ('10000000-0000-4000-8000-000000000003', '+910000000003', 'Test Admin', 'admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_programs
  (id, slug, title, summary, languages, delivery_mode, eligibility, capacity,
   application_opens_at, application_closes_at, status, created_by,
   privacy_notice_version, privacy_contact_email, retention_statement,
   privacy_notice_attested_by, privacy_notice_attested_at,
   safeguarding_owner_user_id, lms_course_ref,
   launch_ready_attested_by, launch_ready_attested_at)
VALUES
  ('20000000-0000-4000-8000-000000000001',
   'test-program', 'Test Education Programme', 'Synthetic CI-only programme',
   ARRAY['en','kn','hi'], 'hybrid', 'CI test identity only', 50,
   now() - interval '1 day', now() + interval '10 days', 'published',
   '10000000-0000-4000-8000-000000000003',
   'test-v1', 'privacy@example.test',
   'Synthetic CI data is removed at the end of this isolated test transaction.',
   '10000000-0000-4000-8000-000000000003', now(),
   '10000000-0000-4000-8000-000000000003', 'moodle-test-course-001',
   '10000000-0000-4000-8000-000000000003', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_cohorts
  (id, program_id, slug, title, start_date, end_date, status, capacity, created_by)
VALUES
  ('30000000-0000-4000-8000-000000000001',
   '20000000-0000-4000-8000-000000000001', 'test-001', 'Test Cohort',
   current_date, current_date + 9, 'active', 50,
   '10000000-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_applications
  (id, reference_code, program_id, applicant_user_id, applicant_full_name,
   applicant_email, consent_version, consent_at, status, submitted_at)
VALUES
  ('40000000-0000-4000-8000-000000000001', 'TESTAPP000001',
   '20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 'Learner A',
   'learner-a@example.test', 'test-v1', now(), 'submitted', now()),
  ('40000000-0000-4000-8000-000000000002', 'TESTAPP000002',
   '20000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000002', 'Learner B',
   'learner-b@example.test', 'test-v1', now(), 'submitted', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_enrollments
  (id, cohort_id, learner_user_id, status, created_by)
VALUES
  ('50000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 'active',
   '10000000-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_sessions
  (id, cohort_id, title, starts_at, ends_at, published, created_by)
VALUES
  ('60000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001', 'Test Session',
   now() - interval '1 day', now() - interval '23 hours', true,
   '10000000-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_assessments
  (id, cohort_id, title, description, rubric, due_at, status, created_by)
VALUES
  ('70000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001', 'Test Assignment',
   'Synthetic test only',
   '[{"title":"Evidence quality","max_points":25},{"title":"Execution","max_points":25},{"title":"Communication","max_points":25},{"title":"Reflection","max_points":25}]'::jsonb,
   now() + interval '2 days',
   'published', '10000000-0000-4000-8000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- Learner A: setting a forged JWT subject is confined to this disposable test DB;
-- verifies the policies as PostgREST would evaluate the request identity.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

-- A non-admin cannot escalate profile.role.
DO $test$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.profiles SET role = 'admin'
     WHERE id = '10000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'SECURITY FAILURE: learner escalated profile.role'; END IF;
END
$test$;

-- Legitimate profile presentation change continues to work.
UPDATE public.profiles
SET full_name = 'Learner A Updated'
WHERE id = '10000000-0000-4000-8000-000000000001';

DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = '10000000-0000-4000-8000-000000000001'
       AND full_name = 'Learner A Updated' AND role = 'user'
  ) THEN
    RAISE EXCEPTION 'Functional regression: safe profile edit failed or role changed';
  END IF;
END
$test$;

-- A non-admin cannot change moderation or referral integrity attributes.
DO $test$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.profiles SET is_flagged = true
     WHERE id = '10000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'SECURITY FAILURE: learner changed is_flagged'; END IF;
END
$test$;

-- Learner can read only their own application. Status updates are revoked and must use the review RPC.
DO $test$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.education_applications
       SET status = 'accepted'
     WHERE id = '40000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'SECURITY FAILURE: learner updated application status outside review RPC';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.education_applications
     WHERE id = '40000000-0000-4000-8000-000000000002'
  ) THEN RAISE EXCEPTION 'SECURITY FAILURE: learner read another learner application'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.education_applications
     WHERE id = '40000000-0000-4000-8000-000000000001' AND status = 'submitted'
  ) THEN RAISE EXCEPTION 'SECURITY FAILURE: learner self-approved application or own record not visible'; END IF;
END
$test$;

-- Learner A can submit their own work to a published assessment for their active cohort.
INSERT INTO public.education_submissions
  (assessment_id, cohort_id, enrollment_id, learner_user_id, submission_text)
VALUES
  ('70000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001',
   '50000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 'Synthetic CI submission');

-- A learner cannot assign themselves an education staff role.
DO $test$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.education_staff_memberships (user_id, role, granted_by)
    VALUES ('10000000-0000-4000-8000-000000000001', 'education_lead',
            '10000000-0000-4000-8000-000000000001');
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'SECURITY FAILURE: learner self-assigned education_lead'; END IF;
END
$test$;

-- Admin can review an application through the atomic, audited status-transition RPC.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

-- Enrollment must not be created from an unaccepted application.
DO $test$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.education_enrollments
      (cohort_id, learner_user_id, application_id, status, created_by)
    VALUES
      ('30000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000002',
       '40000000-0000-4000-8000-000000000002',
       'enrolled',
       '10000000-0000-4000-8000-000000000003');
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'SECURITY FAILURE: enrollment created from a non-accepted application';
  END IF;
END
$test$;

SELECT public.review_education_application(
  '40000000-0000-4000-8000-000000000001', 'under_review', 'Synthetic CI reviewer note'
);
SELECT public.review_education_application(
  '40000000-0000-4000-8000-000000000001', 'accepted', 'Synthetic CI acceptance'
);

DO $test$
DECLARE review_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.education_applications
     WHERE id = '40000000-0000-4000-8000-000000000001' AND status = 'accepted'
  ) THEN RAISE EXCEPTION 'Functional regression: authorised review did not update application'; END IF;

  SELECT count(*) INTO review_count
    FROM public.education_application_reviews
   WHERE application_id = '40000000-0000-4000-8000-000000000001'
     AND reviewer_user_id = '10000000-0000-4000-8000-000000000003';
  IF review_count <> 2 THEN
    RAISE EXCEPTION 'Functional regression: application status history is incomplete';
  END IF;
END
$test$;

-- Assign Learner A as a test mentor, then verify they still cannot review their own submission.
INSERT INTO public.education_staff_memberships
  (user_id, role, program_id, cohort_id, is_active, granted_by)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'mentor',
   '20000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001', true,
   '10000000-0000-4000-8000-000000000003');

RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

DO $test$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.education_assessment_reviews
      (submission_id, cohort_id, reviewer_user_id, score, max_score, feedback, outcome, rubric_version)
    SELECT s.id, s.cohort_id, '10000000-0000-4000-8000-000000000001',
           80, 100, 'Self review should be rejected.', 'needs_revision', 'rubric-v1'
      FROM public.education_submissions s
     WHERE s.assessment_id = '70000000-0000-4000-8000-000000000001'
       AND s.learner_user_id = '10000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN insufficient_privilege THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'SECURITY FAILURE: learner reviewed their own submission'; END IF;
END
$test$;

-- The authorised reviewer may record rubric-scored feedback with a revision decision.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

INSERT INTO public.education_assessment_reviews
  (submission_id, cohort_id, reviewer_user_id, score, max_score, feedback, outcome, rubric_version)
SELECT s.id, s.cohort_id, '10000000-0000-4000-8000-000000000003',
       80, 100, 'Add a source for your key claim and clarify the evidence.', 'needs_revision', 'rubric-v1'
FROM public.education_submissions s
WHERE s.assessment_id = '70000000-0000-4000-8000-000000000001'
  AND s.learner_user_id = '10000000-0000-4000-8000-000000000001';

-- A learner can submit a second attempt only after a reviewer requests revision.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

INSERT INTO public.education_submissions
  (assessment_id, cohort_id, enrollment_id, learner_user_id, attempt_number, submission_text)
VALUES
  ('70000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001',
   '50000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001', 2,
   'Revised evidence with source attribution and a clear explanation of the finding.');

-- Attempt three is blocked while attempt two is awaiting review.
DO $test$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.education_submissions
      (assessment_id, cohort_id, enrollment_id, learner_user_id, attempt_number, submission_text)
    VALUES
      ('70000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001', 3,
       'This third attempt must be rejected until the second is reviewed.');
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'SECURITY FAILURE: resubmission bypassed review gate'; END IF;
END
$test$;

-- Switch back to an administrator for attendance and certificate tests.
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

-- Attendance is tied to the correct published session and enrolment.
INSERT INTO public.education_attendance
  (session_id, cohort_id, enrollment_id, learner_user_id, attendance_status, recorded_by, recorded_at)
VALUES
  ('60000000-0000-4000-8000-000000000001',
   '30000000-0000-4000-8000-000000000001',
   '50000000-0000-4000-8000-000000000001',
   '10000000-0000-4000-8000-000000000001',
   'present', '10000000-0000-4000-8000-000000000003', now());

-- A correction without a reason must be rejected.
DO $test$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.education_attendance
       SET attendance_status = 'absent',
           correction_reason = NULL,
           last_corrected_by = '10000000-0000-4000-8000-000000000003',
           last_corrected_at = now()
     WHERE session_id = '60000000-0000-4000-8000-000000000001'
       AND enrollment_id = '50000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'SECURITY FAILURE: attendance status changed without correction reason';
  END IF;
END
$test$;

UPDATE public.education_attendance
   SET attendance_status = 'late',
       correction_reason = 'Corrected after mentor review',
       last_corrected_by = '10000000-0000-4000-8000-000000000003',
       last_corrected_at = now()
 WHERE session_id = '60000000-0000-4000-8000-000000000001'
   AND enrollment_id = '50000000-0000-4000-8000-000000000001';

DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.education_attendance
     WHERE session_id = '60000000-0000-4000-8000-000000000001'
       AND enrollment_id = '50000000-0000-4000-8000-000000000001'
       AND attendance_status = 'late'
       AND recorded_by = '10000000-0000-4000-8000-000000000003'
       AND last_corrected_by = '10000000-0000-4000-8000-000000000003'
       AND last_corrected_at IS NOT NULL
       AND correction_reason = 'Corrected after mentor review'
  ) THEN
    RAISE EXCEPTION 'Functional regression: attendance correction audit fields were not saved';
  END IF;
END
$test$;

-- Admin can approve completion; certificate issuance is blocked before approval and allowed after.
DO $test$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.education_certificates
      (program_id, cohort_id, enrollment_id, learner_user_id, award_title, issued_by)
    VALUES
      ('20000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000001',
       '50000000-0000-4000-8000-000000000001',
       '10000000-0000-4000-8000-000000000001',
       'Test Completion', '10000000-0000-4000-8000-000000000003');
  EXCEPTION WHEN insufficient_privilege OR check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN RAISE EXCEPTION 'SECURITY FAILURE: certificate issued before completion approval'; END IF;
END
$test$;

-- Completion is blocked while the latest assessment review requests a revision.
DO $test$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.education_enrollments
       SET status = 'completed',
           completion_approved_by = '10000000-0000-4000-8000-000000000003',
           completion_approved_at = now()
     WHERE id = '50000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN check_violation THEN blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'SECURITY FAILURE: completion bypassed unresolved assessment evidence';
  END IF;
END
$test$;

-- Mark the latest attempt accepted with a score matching the published rubric.
INSERT INTO public.education_assessment_reviews
  (submission_id, cohort_id, reviewer_user_id, score, max_score, feedback, outcome, rubric_version)
SELECT s.id, s.cohort_id, '10000000-0000-4000-8000-000000000003',
       96, 100, 'Final revision satisfies the published rubric and evidence requirements.', 'accepted', 'rubric-v1'
FROM public.education_submissions s
WHERE s.assessment_id = '70000000-0000-4000-8000-000000000001'
  AND s.learner_user_id = '10000000-0000-4000-8000-000000000001'
  AND s.attempt_number = 2;

-- The database RPC atomically approves the learner and issues one certificate.
SELECT public.approve_education_completion_and_issue_certificate(
  '50000000-0000-4000-8000-000000000001',
  'Test Completion'
);

DO $test$
DECLARE
  n integer;
  v_code uuid;
  v_verified boolean;
  v_award text;
  v_program text;
  v_status text;
BEGIN
  SELECT count(*), min(verification_code::text)::uuid
    INTO n, v_code
  FROM public.education_certificates
  WHERE enrollment_id = '50000000-0000-4000-8000-000000000001'
    AND learner_user_id = '10000000-0000-4000-8000-000000000001'
    AND status = 'issued';
  IF n <> 1 OR v_code IS NULL THEN
    RAISE EXCEPTION 'Functional regression: approved certificate issue failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.education_enrollments
    WHERE id = '50000000-0000-4000-8000-000000000001'
      AND status = 'completed'
      AND completion_approved_by = '10000000-0000-4000-8000-000000000003'
      AND completion_approved_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Functional regression: completion approval was not recorded';
  END IF;

  SELECT verified, award_title, program_title, certificate_status
    INTO v_verified, v_award, v_program, v_status
  FROM public.verify_education_certificate(v_code);

  IF NOT v_verified OR v_award <> 'Test Completion'
     OR v_program <> 'Test Education Programme'
     OR v_status <> 'issued' THEN
    RAISE EXCEPTION 'Functional regression: public certificate verification failed';
  END IF;

  PERFORM set_config('tiva_test.certificate_code', v_code::text, true);
END
$test$;

-- Anonymous visitors may see published programme metadata, never applicant records.
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'anon', true);
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

DO $test$
DECLARE
  can_see_applications boolean := false;
  v_verified boolean;
  v_status text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.education_programs
     WHERE id = '20000000-0000-4000-8000-000000000001'
  ) THEN RAISE EXCEPTION 'Functional regression: published programme is not public'; END IF;

  BEGIN
    SELECT EXISTS (SELECT 1 FROM public.education_applications) INTO can_see_applications;
  EXCEPTION WHEN insufficient_privilege THEN
    can_see_applications := false;
  END;

  IF can_see_applications THEN
    RAISE EXCEPTION 'SECURITY FAILURE: anonymous request can see applicant records';
  END IF;

  SELECT verified, certificate_status
    INTO v_verified, v_status
  FROM public.verify_education_certificate(current_setting('tiva_test.certificate_code', true)::uuid);

  IF NOT v_verified OR v_status <> 'issued' THEN
    RAISE EXCEPTION 'SECURITY FAILURE: anonymous certificate verification did not return the valid public status';
  END IF;
END
$test$;

RESET ROLE;
ROLLBACK;
