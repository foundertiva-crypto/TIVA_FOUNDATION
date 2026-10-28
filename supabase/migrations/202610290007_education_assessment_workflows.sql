-- TIVA education: assessed work, controlled resubmissions and learner feedback.
-- Apply to staging first; all access remains scoped by the existing cohort RLS helpers.
BEGIN;

ALTER TABLE public.education_submissions
  ADD COLUMN IF NOT EXISTS attempt_number integer NOT NULL DEFAULT 1;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'education_submissions_attempt_number_positive'
      AND conrelid = 'public.education_submissions'::regclass
  ) THEN
    ALTER TABLE public.education_submissions
      ADD CONSTRAINT education_submissions_attempt_number_positive
      CHECK (attempt_number >= 1);
  END IF;
END;
$constraint$;

CREATE UNIQUE INDEX IF NOT EXISTS education_submissions_attempt_unique
  ON public.education_submissions(assessment_id, learner_user_id, attempt_number);

-- Students may read feedback tied to their own submission, never another student's review.
DROP POLICY IF EXISTS education_assessment_review_owner_read ON public.education_assessment_reviews;
CREATE POLICY education_assessment_review_owner_read ON public.education_assessment_reviews
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.education_submissions AS s
    WHERE s.id = education_assessment_reviews.submission_id
      AND s.learner_user_id = auth.uid()
  )
);

-- Assessments can only be published for active cohorts under currently published programmes.
-- Rubrics use an array of {title, max_points}; each item is validated at the database boundary.
CREATE OR REPLACE FUNCTION public.tiva_guard_education_assessment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $function$
DECLARE
  cohort_status text;
  program_status text;
  rubric_item jsonb;
  item_title text;
  item_points numeric;
  total_points numeric := 0;
  trusted_role boolean;
BEGIN
  trusted_role :=
    COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin');

  IF TG_OP = 'UPDATE' AND NEW.cohort_id IS DISTINCT FROM OLD.cohort_id THEN
    RAISE EXCEPTION 'An assessment cannot be moved to another cohort'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'published' THEN
    SELECT c.status, p.status
      INTO cohort_status, program_status
    FROM public.education_cohorts c
    JOIN public.education_programs p ON p.id = c.program_id
    WHERE c.id = NEW.cohort_id;

    IF NOT FOUND OR cohort_status <> 'active' OR program_status <> 'published' THEN
      RAISE EXCEPTION 'Publishing an assessment requires an active cohort and published programme'
        USING ERRCODE = '23514';
    END IF;

    IF jsonb_typeof(NEW.rubric) <> 'array' OR jsonb_array_length(NEW.rubric) < 1
       OR jsonb_array_length(NEW.rubric) > 20 THEN
      RAISE EXCEPTION 'A published assessment requires 1–20 rubric criteria'
        USING ERRCODE = '23514';
    END IF;

    total_points := 0;
    FOR rubric_item IN SELECT value FROM jsonb_array_elements(NEW.rubric)
    LOOP
      item_title := COALESCE(rubric_item ->> 'title', '');
      IF length(trim(item_title)) < 2 OR length(item_title) > 120
         OR jsonb_typeof(rubric_item -> 'max_points') <> 'number' THEN
        RAISE EXCEPTION 'Each rubric criterion needs a title and numeric max_points'
          USING ERRCODE = '23514';
      END IF;

      item_points := (rubric_item ->> 'max_points')::numeric;
      IF item_points <= 0 OR item_points > 100 THEN
        RAISE EXCEPTION 'Each rubric criterion must be worth between 0 and 100 points'
          USING ERRCODE = '23514';
      END IF;
      total_points := total_points + item_points;
    END LOOP;

    IF total_points <= 0 OR total_points > 1000 THEN
      RAISE EXCEPTION 'Rubric total must be between 1 and 1000 points'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.due_at IS NOT NULL
       AND (TG_OP = 'INSERT'
         OR OLD.status IS DISTINCT FROM 'published'
         OR NEW.due_at IS DISTINCT FROM OLD.due_at)
       AND NEW.due_at <= now() THEN
      RAISE EXCEPTION 'A newly published assessment or changed deadline must be in the future'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NOT trusted_role
     AND NOT public.education_has_cohort_role(
       ARRAY['education_lead','coordinator','educator'],
       NEW.cohort_id
     ) THEN
    RAISE EXCEPTION 'Assessment changes require an authorised education staff member'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tiva_guard_education_assessment ON public.education_assessments;
CREATE TRIGGER tiva_guard_education_assessment
BEFORE INSERT OR UPDATE ON public.education_assessments
FOR EACH ROW EXECUTE FUNCTION public.tiva_guard_education_assessment();

-- A learner can submit only their own work, for an active enrolment, before
-- the deadline. A new attempt is allowed only after an authorised reviewer
-- records the immediately previous attempt as needs_revision.
CREATE OR REPLACE FUNCTION public.tiva_guard_education_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $function$
DECLARE
  assessment_cohort uuid;
  assessment_status text;
  assessment_due_at timestamptz;
  enrollment_cohort uuid;
  enrollment_learner uuid;
  enrollment_status text;
  trusted_role boolean;
  previous_attempt integer := 0;
  previous_submission_id uuid;
  previous_outcome text;
BEGIN
  trusted_role :=
    COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin');

  SELECT a.cohort_id, a.status, a.due_at
    INTO assessment_cohort, assessment_status, assessment_due_at
  FROM public.education_assessments a
  WHERE a.id = NEW.assessment_id;

  SELECT e.cohort_id, e.learner_user_id, e.status
    INTO enrollment_cohort, enrollment_learner, enrollment_status
  FROM public.education_enrollments e
  WHERE e.id = NEW.enrollment_id;

  IF assessment_cohort IS NULL OR enrollment_cohort IS NULL
     OR assessment_cohort IS DISTINCT FROM NEW.cohort_id
     OR enrollment_cohort IS DISTINCT FROM NEW.cohort_id
     OR enrollment_learner IS DISTINCT FROM NEW.learner_user_id THEN
    RAISE EXCEPTION 'Submission assessment, cohort, enrolment and learner must match'
      USING ERRCODE = '23514';
  END IF;

  IF enrollment_status NOT IN ('enrolled','active','completed','incomplete') THEN
    RAISE EXCEPTION 'Submission requires an eligible learner enrolment'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.attempt_number IS NULL OR NEW.attempt_number < 1 THEN
    RAISE EXCEPTION 'Submission attempt number must be positive'
      USING ERRCODE = '23514';
  END IF;

  IF NOT trusted_role THEN
    IF NEW.learner_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'A learner may only submit their own work'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.private_storage_path IS NOT NULL THEN
      RAISE EXCEPTION 'Private file paths can only be added by the approved upload service'
        USING ERRCODE = '42501';
    END IF;
    IF assessment_status <> 'published'
       OR (assessment_due_at IS NOT NULL AND assessment_due_at <= now()) THEN
      RAISE EXCEPTION 'Submissions require a published assessment before the deadline'
        USING ERRCODE = '23514';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended(
      NEW.assessment_id::text || ':' || NEW.learner_user_id::text, 912345
    ));

    SELECT COALESCE(MAX(s.attempt_number), 0)
      INTO previous_attempt
    FROM public.education_submissions s
    WHERE s.assessment_id = NEW.assessment_id
      AND s.learner_user_id = NEW.learner_user_id;

    IF NEW.attempt_number <> previous_attempt + 1 THEN
      RAISE EXCEPTION 'Submission attempt number must be the next sequential attempt'
        USING ERRCODE = '23514';
    END IF;

    IF previous_attempt > 0 THEN
      SELECT s.id INTO previous_submission_id
      FROM public.education_submissions s
      WHERE s.assessment_id = NEW.assessment_id
        AND s.learner_user_id = NEW.learner_user_id
      ORDER BY s.attempt_number DESC
      LIMIT 1;

      SELECT r.outcome INTO previous_outcome
      FROM public.education_assessment_reviews r
      WHERE r.submission_id = previous_submission_id
      ORDER BY r.created_at DESC
      LIMIT 1;

      IF previous_outcome IS DISTINCT FROM 'needs_revision' THEN
        RAISE EXCEPTION 'A resubmission is allowed only after a needs_revision review'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    NEW.submitted_at := now();
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tiva_guard_education_submission ON public.education_submissions;
CREATE TRIGGER tiva_guard_education_submission
BEFORE INSERT ON public.education_submissions
FOR EACH ROW EXECUTE FUNCTION public.tiva_guard_education_submission();

-- Harden the pre-existing review guard: reviewer must be authorised for this
-- cohort, cannot review their own work, and the recorded score must match the
-- published assessment's rubric maximum. Reviews remain append-only.
CREATE OR REPLACE FUNCTION public.tiva_guard_education_assessment_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $function$
DECLARE
  submission_cohort uuid;
  submission_learner uuid;
  assessment_rubric jsonb;
  rubric_item jsonb;
  rubric_max numeric := 0;
  trusted_role boolean;
BEGIN
  trusted_role :=
    COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR current_user IN ('postgres', 'supabase_admin');

  SELECT s.cohort_id, s.learner_user_id
    INTO submission_cohort, submission_learner
  FROM public.education_submissions s
  WHERE s.id = NEW.submission_id;

  IF submission_cohort IS NULL
     OR submission_cohort IS DISTINCT FROM NEW.cohort_id THEN
    RAISE EXCEPTION 'Assessment review cohort must match its submission'
      USING ERRCODE = '23514';
  END IF;

  SELECT a.rubric INTO assessment_rubric
  FROM public.education_assessments a
  WHERE a.id = (
    SELECT s.assessment_id
    FROM public.education_submissions s
    WHERE s.id = NEW.submission_id
  );

  IF assessment_rubric IS NULL OR jsonb_typeof(assessment_rubric) <> 'array'
     OR jsonb_array_length(assessment_rubric) < 1 THEN
    RAISE EXCEPTION 'Assessment review requires a valid rubric'
      USING ERRCODE = '23514';
  END IF;

  FOR rubric_item IN SELECT value FROM jsonb_array_elements(assessment_rubric)
  LOOP
    IF jsonb_typeof(rubric_item -> 'max_points') <> 'number' THEN
      RAISE EXCEPTION 'Assessment rubric contains an invalid point value'
        USING ERRCODE = '23514';
    END IF;
    rubric_max := rubric_max + (rubric_item ->> 'max_points')::numeric;
  END LOOP;

  IF NEW.score IS NULL OR NEW.max_score IS NULL
     OR NEW.score < 0 OR NEW.score > rubric_max
     OR NEW.max_score IS DISTINCT FROM rubric_max THEN
    RAISE EXCEPTION 'Review score and maximum must match the assessment rubric'
      USING ERRCODE = '23514';
  END IF;
  IF length(trim(COALESCE(NEW.feedback, ''))) < 5
     OR length(NEW.feedback) > 5000 THEN
    RAISE EXCEPTION 'Review feedback must contain 5–5000 characters'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.rubric_version IS NULL
     OR NEW.rubric_version !~ '^[A-Za-z0-9._-]{3,80}
NOTIFY pgrst, 'reload schema';
COMMIT;
 THEN
    RAISE EXCEPTION 'Review rubric version is invalid'
      USING ERRCODE = '23514';
  END IF;

  IF NOT trusted_role THEN
    IF NEW.reviewer_user_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Reviewer identity must match the signed-in user'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.reviewer_user_id IS NOT DISTINCT FROM submission_learner THEN
      RAISE EXCEPTION 'A learner cannot review their own submission'
        USING ERRCODE = '42501';
    END IF;
    IF NOT public.education_has_cohort_role(
      ARRAY['education_lead','coordinator','educator','mentor'],
      NEW.cohort_id
    ) THEN
      RAISE EXCEPTION 'Assessment review requires an assigned educator or mentor'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tiva_guard_education_assessment_review ON public.education_assessment_reviews;
CREATE TRIGGER tiva_guard_education_assessment_review
BEFORE INSERT ON public.education_assessment_reviews
FOR EACH ROW EXECUTE FUNCTION public.tiva_guard_education_assessment_review();

REVOKE UPDATE, DELETE ON public.education_assessment_reviews FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.education_submissions FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.tiva_guard_education_assessment() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tiva_guard_education_submission() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tiva_guard_education_assessment_review() FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
COMMIT;
