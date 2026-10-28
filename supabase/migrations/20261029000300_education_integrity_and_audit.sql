-- Education data integrity and append-only audit controls.
-- Applies only to new education tables. Test in staging before production.
CREATE OR REPLACE FUNCTION public.education_guard_relationships()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_program_id uuid;
  v_application_program_id uuid;
  v_application_learner_id uuid;
  v_application_status text;
  v_cohort_id uuid;
  v_assignment_status text;
  v_due_at timestamptz;
  v_enrollment_cohort_id uuid;
  v_enrollment_learner_id uuid;
  v_enrollment_status text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'education_cohorts'
       AND NEW.program_id IS DISTINCT FROM OLD.program_id THEN
      RAISE EXCEPTION 'A cohort cannot be moved to another programme'
        USING ERRCODE = '23514';
    ELSIF TG_TABLE_NAME = 'education_staff_assignments'
       AND (NEW.user_id IS DISTINCT FROM OLD.user_id
         OR NEW.role IS DISTINCT FROM OLD.role
         OR NEW.program_id IS DISTINCT FROM OLD.program_id
         OR NEW.cohort_id IS DISTINCT FROM OLD.cohort_id) THEN
      RAISE EXCEPTION 'Change staff scope by revoking and re-assigning with approval'
        USING ERRCODE = '23514';
    ELSIF TG_TABLE_NAME = 'education_applications'
       AND (NEW.program_id IS DISTINCT FROM OLD.program_id
         OR NEW.applicant_id IS DISTINCT FROM OLD.applicant_id) THEN
      RAISE EXCEPTION 'Application ownership and programme are immutable'
        USING ERRCODE = '23514';
    ELSIF TG_TABLE_NAME = 'education_application_reviews'
       AND (NEW.application_id IS DISTINCT FROM OLD.application_id
         OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id) THEN
      RAISE EXCEPTION 'Review ownership is immutable'
        USING ERRCODE = '23514';
    ELSIF TG_TABLE_NAME = 'education_enrollments'
       AND (NEW.cohort_id IS DISTINCT FROM OLD.cohort_id
         OR NEW.learner_id IS DISTINCT FROM OLD.learner_id
         OR NEW.application_id IS DISTINCT FROM OLD.application_id) THEN
      RAISE EXCEPTION 'Enrollment links are immutable'
        USING ERRCODE = '23514';
    ELSIF TG_TABLE_NAME = 'education_sessions'
       AND NEW.cohort_id IS DISTINCT FROM OLD.cohort_id THEN
      RAISE EXCEPTION 'A session cannot be moved to another cohort'
        USING ERRCODE = '23514';
    ELSIF TG_TABLE_NAME = 'education_attendance'
       AND (NEW.session_id IS DISTINCT FROM OLD.session_id
         OR NEW.learner_id IS DISTINCT FROM OLD.learner_id
         OR NEW.marked_by IS DISTINCT FROM OLD.marked_by
         OR NEW.marked_at IS DISTINCT FROM OLD.marked_at) THEN
      RAISE EXCEPTION 'Attendance identity is immutable; record a correction instead'
        USING ERRCODE = '23514';
    ELSIF TG_TABLE_NAME = 'education_assignments'
       AND NEW.cohort_id IS DISTINCT FROM OLD.cohort_id THEN
      RAISE EXCEPTION 'An assignment cannot be moved to another cohort'
        USING ERRCODE = '23514';
    ELSIF TG_TABLE_NAME = 'education_submissions'
       AND (NEW.assignment_id IS DISTINCT FROM OLD.assignment_id
         OR NEW.learner_id IS DISTINCT FROM OLD.learner_id) THEN
      RAISE EXCEPTION 'Submission ownership is immutable'
        USING ERRCODE = '23514';
    ELSIF TG_TABLE_NAME = 'education_assessments'
       AND (NEW.assignment_id IS DISTINCT FROM OLD.assignment_id
         OR NEW.learner_id IS DISTINCT FROM OLD.learner_id
         OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id) THEN
      RAISE EXCEPTION 'Assessment ownership is immutable'
        USING ERRCODE = '23514';
    ELSIF TG_TABLE_NAME = 'education_certificates'
       AND (NEW.enrollment_id IS DISTINCT FROM OLD.enrollment_id
         OR NEW.cohort_id IS DISTINCT FROM OLD.cohort_id
         OR NEW.learner_id IS DISTINCT FROM OLD.learner_id
         OR NEW.certificate_code IS DISTINCT FROM OLD.certificate_code
         OR NEW.title IS DISTINCT FROM OLD.title
         OR NEW.issued_by IS DISTINCT FROM OLD.issued_by
         OR NEW.issued_at IS DISTINCT FROM OLD.issued_at) THEN
      RAISE EXCEPTION 'Issued certificate identity is immutable'
        USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'education_enrollments' AND NEW.application_id IS NOT NULL THEN
    SELECT c.program_id INTO v_program_id
      FROM public.education_cohorts c WHERE c.id = NEW.cohort_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Enrollment cohort does not exist' USING ERRCODE = '23503';
    END IF;

    SELECT a.program_id, a.applicant_id, a.status
      INTO v_application_program_id, v_application_learner_id, v_application_status
      FROM public.education_applications a WHERE a.id = NEW.application_id;
    IF NOT FOUND
       OR v_application_program_id IS DISTINCT FROM v_program_id
       OR v_application_learner_id IS DISTINCT FROM NEW.learner_id
       OR v_application_status <> 'accepted' THEN
      RAISE EXCEPTION 'Enrollment application must be accepted and match learner and programme'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'education_attendance' THEN
    SELECT s.cohort_id INTO v_cohort_id
      FROM public.education_sessions s WHERE s.id = NEW.session_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Attendance session does not exist' USING ERRCODE = '23503';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.education_enrollments e
       WHERE e.cohort_id = v_cohort_id
         AND e.learner_id = NEW.learner_id
         AND e.status IN ('enrolled','active','completed')
    ) THEN
      RAISE EXCEPTION 'Attendance requires learner enrolment in the session cohort'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME IN ('education_submissions','education_assessments') THEN
    SELECT a.cohort_id, a.status, a.due_at
      INTO v_cohort_id, v_assignment_status, v_due_at
      FROM public.education_assignments a WHERE a.id = NEW.assignment_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Assignment does not exist' USING ERRCODE = '23503';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.education_enrollments e
       WHERE e.cohort_id = v_cohort_id
         AND e.learner_id = NEW.learner_id
         AND e.status IN ('enrolled','active','completed')
    ) THEN
      RAISE EXCEPTION 'Submission or assessment requires learner enrolment in the assignment cohort'
        USING ERRCODE = '23514';
    END IF;
    IF TG_TABLE_NAME = 'education_submissions'
       AND (v_assignment_status <> 'published' OR (v_due_at IS NOT NULL AND v_due_at < now())) THEN
      RAISE EXCEPTION 'Submission requires an open, published assignment'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'education_certificates' THEN
    SELECT e.cohort_id, e.learner_id, e.status
      INTO v_enrollment_cohort_id, v_enrollment_learner_id, v_enrollment_status
      FROM public.education_enrollments e WHERE e.id = NEW.enrollment_id;
    IF NOT FOUND
       OR v_enrollment_status <> 'completed'
       OR v_enrollment_cohort_id IS DISTINCT FROM NEW.cohort_id
       OR v_enrollment_learner_id IS DISTINCT FROM NEW.learner_id THEN
      RAISE EXCEPTION 'Certificate requires a matching completed enrollment'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS education_cohort_link_guard ON public.education_cohorts;
CREATE TRIGGER education_cohort_link_guard BEFORE UPDATE ON public.education_cohorts
FOR EACH ROW EXECUTE FUNCTION public.education_guard_relationships();

DROP TRIGGER IF EXISTS education_staff_link_guard ON public.education_staff_assignments;
CREATE TRIGGER education_staff_link_guard BEFORE UPDATE ON public.education_staff_assignments
FOR EACH ROW EXECUTE FUNCTION public.education_guard_relationships();

DROP TRIGGER IF EXISTS education_application_link_guard ON public.education_applications;
CREATE TRIGGER education_application_link_guard BEFORE UPDATE ON public.education_applications
FOR EACH ROW EXECUTE FUNCTION public.education_guard_relationships();

DROP TRIGGER IF EXISTS education_review_link_guard ON public.education_application_reviews;
CREATE TRIGGER education_review_link_guard BEFORE UPDATE ON public.education_application_reviews
FOR EACH ROW EXECUTE FUNCTION public.education_guard_relationships();

DROP TRIGGER IF EXISTS education_enrollment_link_guard ON public.education_enrollments;
CREATE TRIGGER education_enrollment_link_guard BEFORE INSERT OR UPDATE ON public.education_enrollments
FOR EACH ROW EXECUTE FUNCTION public.education_guard_relationships();

DROP TRIGGER IF EXISTS education_session_link_guard ON public.education_sessions;
CREATE TRIGGER education_session_link_guard BEFORE UPDATE ON public.education_sessions
FOR EACH ROW EXECUTE FUNCTION public.education_guard_relationships();

DROP TRIGGER IF EXISTS education_attendance_integrity_guard ON public.education_attendance;
CREATE TRIGGER education_attendance_integrity_guard BEFORE INSERT OR UPDATE ON public.education_attendance
FOR EACH ROW EXECUTE FUNCTION public.education_guard_relationships();

DROP TRIGGER IF EXISTS education_assignment_link_guard ON public.education_assignments;
CREATE TRIGGER education_assignment_link_guard BEFORE UPDATE ON public.education_assignments
FOR EACH ROW EXECUTE FUNCTION public.education_guard_relationships();

DROP TRIGGER IF EXISTS education_submission_integrity_guard ON public.education_submissions;
CREATE TRIGGER education_submission_integrity_guard BEFORE INSERT OR UPDATE ON public.education_submissions
FOR EACH ROW EXECUTE FUNCTION public.education_guard_relationships();

DROP TRIGGER IF EXISTS education_assessment_integrity_guard ON public.education_assessments;
CREATE TRIGGER education_assessment_integrity_guard BEFORE INSERT OR UPDATE ON public.education_assessments
FOR EACH ROW EXECUTE FUNCTION public.education_guard_relationships();

DROP TRIGGER IF EXISTS education_certificate_integrity_guard ON public.education_certificates;
CREATE TRIGGER education_certificate_integrity_guard BEFORE INSERT OR UPDATE ON public.education_certificates
FOR EACH ROW EXECUTE FUNCTION public.education_guard_relationships();

-- Automatic, low-PII audit events for meaningful education data changes.
CREATE OR REPLACE FUNCTION public.education_write_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_row jsonb;
  v_old jsonb;
  v_entity_id uuid;
  v_program_id uuid;
  v_cohort_id uuid;
  v_session_id uuid;
  v_assignment_id uuid;
  v_application_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_row := to_jsonb(OLD);
    v_old := to_jsonb(OLD);
  ELSE
    v_row := to_jsonb(NEW);
    IF TG_OP = 'UPDATE' THEN v_old := to_jsonb(OLD); END IF;
  END IF;

  v_entity_id := NULLIF(v_row ->> 'id','')::uuid;
  v_program_id := NULLIF(v_row ->> 'program_id','')::uuid;
  v_cohort_id := NULLIF(v_row ->> 'cohort_id','')::uuid;
  v_session_id := NULLIF(v_row ->> 'session_id','')::uuid;
  v_assignment_id := NULLIF(v_row ->> 'assignment_id','')::uuid;
  v_application_id := NULLIF(v_row ->> 'application_id','')::uuid;

  IF TG_TABLE_NAME = 'education_programs' THEN
    v_program_id := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE v_entity_id END;
  ELSIF TG_TABLE_NAME = 'education_cohorts' THEN
    v_cohort_id := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE v_entity_id END;
  END IF;

  IF v_cohort_id IS NULL AND v_session_id IS NOT NULL THEN
    SELECT s.cohort_id INTO v_cohort_id FROM public.education_sessions s WHERE s.id = v_session_id;
  END IF;
  IF v_cohort_id IS NULL AND v_assignment_id IS NOT NULL THEN
    SELECT a.cohort_id INTO v_cohort_id FROM public.education_assignments a WHERE a.id = v_assignment_id;
  END IF;
  IF v_program_id IS NULL AND v_application_id IS NOT NULL THEN
    SELECT a.program_id INTO v_program_id FROM public.education_applications a WHERE a.id = v_application_id;
  END IF;
  IF v_program_id IS NULL AND v_cohort_id IS NOT NULL THEN
    SELECT c.program_id INTO v_program_id FROM public.education_cohorts c WHERE c.id = v_cohort_id;
  END IF;

  INSERT INTO public.education_audit_events
    (actor_id, program_id, cohort_id, event_type, entity_type, entity_id, metadata)
  VALUES (
    auth.uid(),
    v_program_id,
    v_cohort_id,
    lower(TG_OP),
    TG_TABLE_NAME,
    v_entity_id,
    jsonb_build_object(
      'status_before', v_old ->> 'status',
      'status_after', v_row ->> 'status'
    )
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;

DO $triggers$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'education_programs',
    'education_cohorts',
    'education_staff_assignments',
    'education_applications',
    'education_application_reviews',
    'education_enrollments',
    'education_sessions',
    'education_attendance',
    'education_assignments',
    'education_submissions',
    'education_assessments',
    'education_certificates'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS education_audit_change ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER education_audit_change AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.education_write_audit_event()',
      table_name
    );
  END LOOP;
END;
$triggers$;

REVOKE ALL ON FUNCTION public.education_guard_relationships() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.education_write_audit_event() FROM PUBLIC;
