-- TIVA education: capacity, enrollment consistency, and review-path hardening.
-- No existing learner records are rewritten. New/updated enrollments are checked.
BEGIN;

-- Applications can be submitted by their owner, but status and reviewer history
-- may only be changed by the audited review RPC in migration 004.
DROP POLICY IF EXISTS education_application_staff_update ON public.education_applications;
REVOKE UPDATE ON public.education_applications FROM anon, authenticated;

-- Review-history rows are produced by review_education_application(), not by
-- direct client inserts or edits.
DROP POLICY IF EXISTS education_application_reviews_staff_insert ON public.education_application_reviews;
REVOKE INSERT, UPDATE, DELETE ON public.education_application_reviews FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.tiva_guard_education_enrollment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
DECLARE
  trusted_role boolean;
  v_program_id uuid;
  v_cohort_capacity integer;
  v_program_capacity integer;
  v_application_program uuid;
  v_application_learner uuid;
  v_application_status text;
  v_cohort_seats bigint;
  v_program_seats bigint;
BEGIN
  trusted_role :=
    COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin');

  IF TG_OP = 'UPDATE' THEN
    IF NEW.cohort_id IS DISTINCT FROM OLD.cohort_id
       OR NEW.learner_user_id IS DISTINCT FROM OLD.learner_user_id
       OR NEW.application_id IS DISTINCT FROM OLD.application_id THEN
      RAISE EXCEPTION 'Enrollment identity fields are immutable'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT c.program_id, c.capacity, p.capacity
    INTO v_program_id, v_cohort_capacity, v_program_capacity
  FROM public.education_cohorts c
  JOIN public.education_programs p ON p.id = c.program_id
  WHERE c.id = NEW.cohort_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment cohort does not exist'
      USING ERRCODE = '23503';
  END IF;

  -- When an enrollment is tied to an application, that application must have
  -- been accepted and belong to the same learner and programme.
  IF NEW.application_id IS NOT NULL THEN
    SELECT a.program_id, a.applicant_user_id, a.status
      INTO v_application_program, v_application_learner, v_application_status
    FROM public.education_applications a
    WHERE a.id = NEW.application_id;

    IF NOT FOUND
       OR v_application_program IS DISTINCT FROM v_program_id
       OR v_application_learner IS DISTINCT FROM NEW.learner_user_id
       OR v_application_status <> 'accepted' THEN
      RAISE EXCEPTION 'Enrollment application must be accepted and match the learner and programme'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  IF NOT trusted_role AND TG_OP = 'UPDATE'
     AND (NEW.completion_approved_by IS DISTINCT FROM OLD.completion_approved_by
       OR NEW.completion_approved_at IS DISTINCT FROM OLD.completion_approved_at) THEN
    IF NOT public.education_has_cohort_role(ARRAY['education_lead'], NEW.cohort_id) THEN
      RAISE EXCEPTION 'Completion approval requires an education lead'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.completion_approved_by IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'The approving user must match the current user'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.status = 'completed' THEN
    IF NEW.completion_approved_by IS NULL OR NEW.completion_approved_at IS NULL THEN
      RAISE EXCEPTION 'Completed enrollment requires recorded completion approval'
        USING ERRCODE = '23514';
    END IF;
    IF NOT trusted_role
       AND NOT public.education_has_cohort_role(ARRAY['education_lead'], NEW.cohort_id) THEN
      RAISE EXCEPTION 'Only an education lead may complete an enrollment'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF NEW.completion_approved_at IS NOT NULL AND NEW.status <> 'completed' THEN
    RAISE EXCEPTION 'Completion approval is valid only for completed enrollment'
      USING ERRCODE = '23514';
  END IF;

  -- Serialize capacity checks per programme and cohort so simultaneous
  -- registrations cannot race past the configured seat limits.
  IF NEW.status IN ('invited','enrolled','active') THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_program_id::text, 754321));
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.cohort_id::text, 754321));

    SELECT count(*) INTO v_cohort_seats
    FROM public.education_enrollments e
    WHERE e.cohort_id = NEW.cohort_id
      AND e.id IS DISTINCT FROM NEW.id
      AND e.status IN ('invited','enrolled','active');

    IF v_cohort_seats >= v_cohort_capacity THEN
      RAISE EXCEPTION 'Cohort capacity has been reached'
        USING ERRCODE = '23514';
    END IF;

    SELECT count(*) INTO v_program_seats
    FROM public.education_enrollments e
    JOIN public.education_cohorts c ON c.id = e.cohort_id
    WHERE c.program_id = v_program_id
      AND e.id IS DISTINCT FROM NEW.id
      AND e.status IN ('invited','enrolled','active');

    IF v_program_seats >= v_program_capacity THEN
      RAISE EXCEPTION 'Programme capacity has been reached'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tiva_guard_education_enrollment ON public.education_enrollments;
CREATE TRIGGER tiva_guard_education_enrollment
BEFORE INSERT OR UPDATE ON public.education_enrollments
FOR EACH ROW EXECUTE FUNCTION public.tiva_guard_education_enrollment();

REVOKE ALL ON FUNCTION public.tiva_guard_education_enrollment() FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
COMMIT;
