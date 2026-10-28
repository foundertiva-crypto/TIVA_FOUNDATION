-- TIVA World Foundation: evidence-gated completion and certificate issuance.
-- Apply in staging only after the prior education schema, attendance and assessment migrations.
-- The RPC is atomic: completion and certificate issuance either both commit or neither does.
BEGIN;

CREATE OR REPLACE FUNCTION public.tiva_guard_education_completion_evidence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $function$
DECLARE
  due_session_count bigint := 0;
  required_assessment_count bigint := 0;
  trusted_actor boolean := false;
BEGIN
  IF NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.completion_approved_by IS NULL OR NEW.completion_approved_at IS NULL THEN
    RAISE EXCEPTION 'Completion must record an authorised approver and timestamp'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.education_cohorts c
    JOIN public.education_programs p ON p.id = c.program_id
    WHERE c.id = NEW.cohort_id
      AND c.status IN ('active','completed')
      AND p.status IN ('published','paused','closed')
  ) THEN
    RAISE EXCEPTION 'Completion requires an active/completed cohort under a launched programme'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.completion_approved_by IS DISTINCT FROM auth.uid()
     AND current_user NOT IN ('postgres','supabase_admin') THEN
    RAISE EXCEPTION 'Completion approver must match the authenticated reviewer'
      USING ERRCODE = '42501';
  END IF;

  -- Completion requires at least one ended, published class session.
  SELECT count(*) INTO due_session_count
  FROM public.education_sessions s
  WHERE s.cohort_id = NEW.cohort_id
    AND s.published = true
    AND s.ends_at <= now();

  IF due_session_count < 1 THEN
    RAISE EXCEPTION 'Completion requires at least one completed published session'
      USING ERRCODE = '23514';
  END IF;

  -- Every ended, published session must have a satisfactory attendance mark.
  IF EXISTS (
    SELECT 1
    FROM public.education_sessions s
    LEFT JOIN public.education_attendance a
      ON a.session_id = s.id
     AND a.enrollment_id = NEW.id
     AND a.learner_user_id = NEW.learner_user_id
    WHERE s.cohort_id = NEW.cohort_id
      AND s.published = true
      AND s.ends_at <= now()
      AND (
        a.id IS NULL
        OR a.attendance_status NOT IN ('present','late','excused')
      )
  ) THEN
    RAISE EXCEPTION 'Completion is blocked until all ended published sessions have valid attendance'
      USING ERRCODE = '23514';
  END IF;

  -- Require at least one published/closed assessment and an accepted latest
  -- review for the learner's latest submission on each such assessment.
  SELECT count(*) INTO required_assessment_count
  FROM public.education_assessments a
  WHERE a.cohort_id = NEW.cohort_id
    AND a.status IN ('published','closed');

  IF required_assessment_count < 1 THEN
    RAISE EXCEPTION 'Completion requires at least one published assessment with reviewed work'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.education_assessments a
    LEFT JOIN LATERAL (
      SELECT s.id, s.attempt_number
      FROM public.education_submissions s
      WHERE s.assessment_id = a.id
        AND s.learner_user_id = NEW.learner_user_id
      ORDER BY s.attempt_number DESC, s.submitted_at DESC
      LIMIT 1
    ) latest_submission ON true
    LEFT JOIN LATERAL (
      SELECT r.outcome
      FROM public.education_assessment_reviews r
      WHERE r.submission_id = latest_submission.id
      ORDER BY r.created_at DESC
      LIMIT 1
    ) latest_review ON true
    WHERE a.cohort_id = NEW.cohort_id
      AND a.status IN ('published','closed')
      AND (
        latest_submission.id IS NULL
        OR latest_review.outcome IS DISTINCT FROM 'accepted'
      )
  ) THEN
    RAISE EXCEPTION 'Completion requires an accepted review for the latest submission on every cohort assessment'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tiva_guard_education_completion_evidence ON public.education_enrollments;
CREATE TRIGGER tiva_guard_education_completion_evidence
BEFORE INSERT OR UPDATE OF status, completion_approved_by, completion_approved_at
ON public.education_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.tiva_guard_education_completion_evidence();

CREATE OR REPLACE FUNCTION public.approve_education_completion_and_issue_certificate(
  p_enrollment_id uuid,
  p_award_title text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
DECLARE
  v_actor uuid;
  v_cohort_id uuid;
  v_program_id uuid;
  v_learner_id uuid;
  v_status text;
  v_award_title text;
  v_certificate_id uuid;
  v_verification_code uuid;
  v_issued_at timestamptz;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF p_enrollment_id IS NULL THEN
    RAISE EXCEPTION 'Enrollment reference is required'
      USING ERRCODE = '22023';
  END IF;

  v_award_title := trim(COALESCE(p_award_title, ''));
  IF length(v_award_title) < 3 OR length(v_award_title) > 180 THEN
    RAISE EXCEPTION 'Certificate title must contain 3–180 characters'
      USING ERRCODE = '22023';
  END IF;

  SELECT e.cohort_id, e.learner_user_id, e.status, c.program_id
    INTO v_cohort_id, v_learner_id, v_status, v_program_id
  FROM public.education_enrollments e
  JOIN public.education_cohorts c ON c.id = e.cohort_id
  WHERE e.id = p_enrollment_id
  FOR UPDATE OF e;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.education_has_cohort_role(ARRAY['education_lead'], v_cohort_id) THEN
    RAISE EXCEPTION 'Completion approval and certificate issuance require an education lead or Foundation administrator'
      USING ERRCODE = '42501';
  END IF;

  -- Make the action safely retryable if the client lost the response after a
  -- transaction had already succeeded.
  SELECT cert.id, cert.verification_code, cert.award_title, cert.issued_at
    INTO v_certificate_id, v_verification_code, v_award_title, v_issued_at
  FROM public.education_certificates cert
  WHERE cert.enrollment_id = p_enrollment_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'created', false,
      'certificate_id', v_certificate_id,
      'verification_code', v_verification_code,
      'award_title', v_award_title,
      'issued_at', v_issued_at,
      'certificate_status', 'already_exists'
    );
  END IF;

  IF v_status NOT IN ('enrolled','active','incomplete','completed') THEN
    RAISE EXCEPTION 'Only a current or completed enrolment can be certified'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.education_enrollments
     SET status = 'completed',
         completion_approved_by = v_actor,
         completion_approved_at = now(),
         updated_at = now()
   WHERE id = p_enrollment_id;

  INSERT INTO public.education_certificates
    (program_id, cohort_id, enrollment_id, learner_user_id, award_title, issued_by, status)
  VALUES
    (v_program_id, v_cohort_id, p_enrollment_id, v_learner_id, v_award_title, v_actor, 'issued')
  RETURNING id, verification_code, issued_at
    INTO v_certificate_id, v_verification_code, v_issued_at;

  RETURN jsonb_build_object(
    'created', true,
    'certificate_id', v_certificate_id,
    'verification_code', v_verification_code,
    'award_title', v_award_title,
    'issued_at', v_issued_at,
    'certificate_status', 'issued'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.tiva_guard_education_completion_evidence() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_education_completion_and_issue_certificate(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_education_completion_and_issue_certificate(uuid, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
