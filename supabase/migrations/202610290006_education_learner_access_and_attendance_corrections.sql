-- TIVA education: learner programme visibility and attributable attendance corrections.
-- Staging-first migration; no existing production rows are rewritten.
BEGIN;

-- Applicants may continue seeing their programme title/status metadata if the
-- programme is later paused/closed. This policy does not grant access to other
-- applicants' PII; education_applications still has its own RLS owner rule.
DROP POLICY IF EXISTS education_program_application_owner_read ON public.education_programs;
CREATE POLICY education_program_application_owner_read ON public.education_programs
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.education_applications AS a
    WHERE a.program_id = education_programs.id
      AND a.applicant_user_id = auth.uid()
  )
);

ALTER TABLE public.education_attendance
  ADD COLUMN IF NOT EXISTS last_corrected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_corrected_at timestamptz;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'education_attendance_correction_pair'
      AND conrelid = 'public.education_attendance'::regclass
  ) THEN
    ALTER TABLE public.education_attendance
      ADD CONSTRAINT education_attendance_correction_pair
      CHECK (
        (last_corrected_by IS NULL AND last_corrected_at IS NULL)
        OR
        (last_corrected_by IS NOT NULL AND last_corrected_at IS NOT NULL)
      );
  END IF;
END;
$constraint$;

CREATE OR REPLACE FUNCTION public.tiva_guard_education_attendance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $function$
DECLARE
  session_cohort uuid;
  enrollment_cohort uuid;
  enrollment_learner uuid;
  trusted_role boolean;
BEGIN
  trusted_role :=
    COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR session_user IN ('postgres', 'supabase_admin');

  SELECT s.cohort_id INTO session_cohort
    FROM public.education_sessions s
    WHERE s.id = NEW.session_id;
  SELECT e.cohort_id, e.learner_user_id
    INTO enrollment_cohort, enrollment_learner
    FROM public.education_enrollments e
    WHERE e.id = NEW.enrollment_id;

  IF session_cohort IS NULL OR enrollment_cohort IS NULL
     OR session_cohort IS DISTINCT FROM NEW.cohort_id
     OR enrollment_cohort IS DISTINCT FROM NEW.cohort_id
     OR enrollment_learner IS DISTINCT FROM NEW.learner_user_id THEN
    RAISE EXCEPTION 'Attendance session, cohort, enrollment and learner must match'
      USING ERRCODE = '23514';
  END IF;

  IF NOT trusted_role THEN
    IF NOT public.education_has_cohort_role(
      ARRAY['education_lead','coordinator','educator'],
      NEW.cohort_id
    ) THEN
      RAISE EXCEPTION 'Attendance updates require an assigned education staff member'
        USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'INSERT' THEN
      IF NEW.recorded_by IS NULL THEN NEW.recorded_by := auth.uid(); END IF;
      IF NEW.recorded_by IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Initial attendance recorder must match the signed-in user'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.last_corrected_by IS NOT NULL OR NEW.last_corrected_at IS NOT NULL THEN
        RAISE EXCEPTION 'A new attendance row cannot contain correction metadata'
          USING ERRCODE = '23514';
      END IF;
    ELSE
      IF NEW.session_id IS DISTINCT FROM OLD.session_id
         OR NEW.cohort_id IS DISTINCT FROM OLD.cohort_id
         OR NEW.enrollment_id IS DISTINCT FROM OLD.enrollment_id
         OR NEW.learner_user_id IS DISTINCT FROM OLD.learner_user_id
         OR NEW.recorded_by IS DISTINCT FROM OLD.recorded_by
         OR NEW.recorded_at IS DISTINCT FROM OLD.recorded_at THEN
        RAISE EXCEPTION 'Attendance identity and original recorder are immutable'
          USING ERRCODE = '42501';
      END IF;

      IF NEW.attendance_status IS DISTINCT FROM OLD.attendance_status THEN
        IF length(trim(COALESCE(NEW.correction_reason, ''))) < 5 THEN
          RAISE EXCEPTION 'Changing attendance requires a correction reason of at least 5 characters'
            USING ERRCODE = '23514';
        END IF;
        IF NEW.last_corrected_by IS DISTINCT FROM auth.uid()
           OR NEW.last_corrected_at IS NULL THEN
          RAISE EXCEPTION 'Attendance correction must record the correcting staff member and timestamp'
            USING ERRCODE = '23514';
        END IF;
      ELSIF NEW.last_corrected_by IS DISTINCT FROM OLD.last_corrected_by
         OR NEW.last_corrected_at IS DISTINCT FROM OLD.last_corrected_at THEN
        RAISE EXCEPTION 'Correction metadata may change only with an attendance status correction'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tiva_guard_education_attendance ON public.education_attendance;
CREATE TRIGGER tiva_guard_education_attendance
BEFORE INSERT OR UPDATE ON public.education_attendance
FOR EACH ROW EXECUTE FUNCTION public.tiva_guard_education_attendance();

REVOKE ALL ON FUNCTION public.tiva_guard_education_attendance() FROM PUBLIC;
NOTIFY pgrst, 'reload schema';
COMMIT;
