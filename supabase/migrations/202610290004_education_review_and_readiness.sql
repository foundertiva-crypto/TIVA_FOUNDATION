-- TIVA World Foundation: publication readiness gate and audited application review.
-- Apply in staging first. Does not alter existing learner, donor, payment or KYC records.
BEGIN;

ALTER TABLE public.education_programs
  ADD COLUMN IF NOT EXISTS privacy_notice_version text,
  ADD COLUMN IF NOT EXISTS privacy_contact_email text,
  ADD COLUMN IF NOT EXISTS retention_statement text,
  ADD COLUMN IF NOT EXISTS privacy_notice_attested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS privacy_notice_attested_at timestamptz,
  ADD COLUMN IF NOT EXISTS safeguarding_owner_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lms_course_ref text,
  ADD COLUMN IF NOT EXISTS launch_ready_attested_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS launch_ready_attested_at timestamptz;

COMMENT ON COLUMN public.education_programs.privacy_notice_version IS 'Version identifier of the reviewed learner notice presented at application time.';
COMMENT ON COLUMN public.education_programs.privacy_contact_email IS 'Foundation-approved public contact for learner privacy requests.';
COMMENT ON COLUMN public.education_programs.retention_statement IS 'Programme-specific, reviewed retention statement shown before application submission.';
COMMENT ON COLUMN public.education_programs.safeguarding_owner_user_id IS 'Assigned human escalation owner; not an external certification.';
COMMENT ON COLUMN public.education_programs.lms_course_ref IS 'Reference to a separately hosted and verified learning course.';
COMMENT ON COLUMN public.education_programs.launch_ready_attested_at IS 'Timestamp when an authorised Foundation admin recorded the launch readiness check.';

CREATE OR REPLACE FUNCTION public.review_education_application(
  p_application_id uuid,
  p_to_status text,
  p_private_note text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $function$
DECLARE
  v_actor uuid;
  v_program_id uuid;
  v_from_status text;
  v_reference text;
  v_private_note text;
  v_allowed boolean := false;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_application_id IS NULL THEN
    RAISE EXCEPTION 'Application reference required' USING ERRCODE = '22023';
  END IF;
  IF p_to_status NOT IN ('under_review','needs_information','accepted','waitlisted','rejected','withdrawn') THEN
    RAISE EXCEPTION 'Unsupported application status' USING ERRCODE = '22023';
  END IF;

  v_private_note := COALESCE(p_private_note, '');
  IF length(v_private_note) > 2000 THEN
    RAISE EXCEPTION 'Review note exceeds 2000 characters' USING ERRCODE = '22023';
  END IF;

  SELECT a.program_id, a.status, a.reference_code
    INTO v_program_id, v_from_status, v_reference
  FROM public.education_applications AS a
  WHERE a.id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.education_has_any_role(ARRAY['education_lead','coordinator'], v_program_id, NULL) THEN
    RAISE EXCEPTION 'Application review requires an authorised education reviewer'
      USING ERRCODE = '42501';
  END IF;

  v_allowed := CASE v_from_status
    WHEN 'submitted' THEN p_to_status IN ('under_review','needs_information','accepted','waitlisted','rejected')
    WHEN 'under_review' THEN p_to_status IN ('needs_information','accepted','waitlisted','rejected')
    WHEN 'needs_information' THEN p_to_status IN ('under_review','accepted','waitlisted','rejected','withdrawn')
    WHEN 'waitlisted' THEN p_to_status IN ('under_review','accepted','rejected','withdrawn')
    WHEN 'accepted' THEN p_to_status = 'withdrawn'
    WHEN 'rejected' THEN p_to_status = 'under_review'
    ELSE false
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid application status transition: % to %', v_from_status, p_to_status
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.education_applications
     SET status = p_to_status,
         updated_at = now()
   WHERE id = p_application_id;

  INSERT INTO public.education_application_reviews
    (application_id, program_id, reviewer_user_id, from_status, to_status, private_note)
  VALUES
    (p_application_id, v_program_id, v_actor, v_from_status, p_to_status, v_private_note);

  RETURN jsonb_build_object(
    'application_id', p_application_id,
    'reference_code', v_reference,
    'from_status', v_from_status,
    'to_status', p_to_status,
    'reviewed_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.review_education_application(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_education_application(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tiva_guard_education_publication_readiness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $function$
DECLARE
  trusted_role boolean;
  identity_changed boolean := false;
BEGIN
  trusted_role :=
    COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR current_user IN ('postgres','supabase_admin');

  IF TG_OP = 'INSERT' THEN
    identity_changed := true;
  ELSE
    -- A second Foundation admin may publish a programme after readiness was
    -- attested. Re-attestation by the current admin is required only if the
    -- underlying notice/contact/retention/owner/course data changes.
    identity_changed :=
      OLD.privacy_notice_version IS DISTINCT FROM NEW.privacy_notice_version
      OR OLD.privacy_contact_email IS DISTINCT FROM NEW.privacy_contact_email
      OR OLD.retention_statement IS DISTINCT FROM NEW.retention_statement
      OR OLD.safeguarding_owner_user_id IS DISTINCT FROM NEW.safeguarding_owner_user_id
      OR OLD.lms_course_ref IS DISTINCT FROM NEW.lms_course_ref;
  END IF;

  IF NEW.status = 'published' THEN
    -- Even after a programme has been published, retain a defined application
    -- window. An elapsed close date is allowed; null or inverted bounds are not.
    IF NEW.application_opens_at IS NULL
       OR NEW.application_closes_at IS NULL
       OR NEW.application_opens_at >= NEW.application_closes_at THEN
      RAISE EXCEPTION 'A published programme must retain a valid application opening and closing window'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.privacy_notice_version IS NULL OR length(trim(NEW.privacy_notice_version)) = 0
       OR NEW.privacy_contact_email IS NULL
       OR length(trim(NEW.privacy_contact_email)) > 254
       OR position('@' in NEW.privacy_contact_email) <= 1
       OR position('.' in substring(NEW.privacy_contact_email from position('@' in NEW.privacy_contact_email) + 1)) = 0
       OR position(' ' in NEW.privacy_contact_email) > 0
       OR NEW.retention_statement IS NULL OR length(trim(NEW.retention_statement)) < 20
       OR length(NEW.retention_statement) > 1500
       OR NEW.privacy_notice_attested_by IS NULL OR NEW.privacy_notice_attested_at IS NULL
       OR NEW.safeguarding_owner_user_id IS NULL
       OR NEW.lms_course_ref IS NULL OR length(trim(NEW.lms_course_ref)) = 0
       OR NEW.launch_ready_attested_by IS NULL OR NEW.launch_ready_attested_at IS NULL THEN
      RAISE EXCEPTION 'Publication requires reviewed notice and retention terms, a privacy contact, safeguarding owner, verified LMS course and launch-readiness attestation'
        USING ERRCODE = '23514';
    END IF;

    IF (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
      IF NEW.application_opens_at IS NULL
         OR NEW.application_closes_at IS NULL
         OR NEW.application_opens_at >= NEW.application_closes_at
         OR NEW.application_closes_at <= now() THEN
        RAISE EXCEPTION 'Publication requires an application window with a future closing timestamp'
          USING ERRCODE = '23514';
      END IF;
    END IF;

    IF NOT trusted_role THEN
      IF identity_changed THEN
        IF NEW.launch_ready_attested_by IS DISTINCT FROM auth.uid()
           OR NEW.privacy_notice_attested_by IS DISTINCT FROM auth.uid() THEN
          RAISE EXCEPTION 'Readiness attestation must match the signed-in administrator'
            USING ERRCODE = '42501';
        END IF;
      END IF;
      IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Publishing education programmes requires a Foundation administrator'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tiva_guard_education_publication_readiness ON public.education_programs;
CREATE TRIGGER tiva_guard_education_publication_readiness
BEFORE INSERT OR UPDATE OF status, application_opens_at, application_closes_at,
  privacy_notice_version, privacy_contact_email, retention_statement,
  privacy_notice_attested_by, privacy_notice_attested_at,
  safeguarding_owner_user_id, lms_course_ref, launch_ready_attested_by,
  launch_ready_attested_at
ON public.education_programs
FOR EACH ROW EXECUTE FUNCTION public.tiva_guard_education_publication_readiness();

REVOKE ALL ON FUNCTION public.tiva_guard_education_publication_readiness() FROM PUBLIC;

NOTIFY pgrst, 'reload schema';
COMMIT;
