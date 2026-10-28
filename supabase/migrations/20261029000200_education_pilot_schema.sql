-- TIVA World Foundation education pilot schema.
-- Creates new isolated education tables; it does not migrate or alter legacy user, donor,
-- payment, KYC, or referral rows. Apply in staging first and test every RLS boundary.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.education_programs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 180),
  description text,
  language_codes text[] NOT NULL DEFAULT ARRAY['en']::text[] CHECK (cardinality(language_codes) > 0),
  delivery_mode text NOT NULL DEFAULT 'hybrid' CHECK (delivery_mode IN ('hybrid','online','in_person','offline')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','paused','closed')),
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  starts_on date,
  ends_on date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS public.education_cohorts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL REFERENCES public.education_programs(id) ON DELETE RESTRICT,
  code text NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','open','active','completed','paused','cancelled')),
  capacity integer CHECK (capacity IS NULL OR capacity > 0),
  starts_on date,
  ends_on date,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, code),
  CHECK (starts_on IS NULL OR ends_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS public.education_staff_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('education_admin','program_coordinator','instructor','mentor','registrar','auditor','safeguarding_officer')),
  program_id uuid REFERENCES public.education_programs(id) ON DELETE CASCADE,
  cohort_id uuid REFERENCES public.education_cohorts(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (cohort_id IS NULL OR program_id IS NOT NULL),
  UNIQUE NULLS NOT DISTINCT (user_id, role, program_id, cohort_id)
);

CREATE TABLE IF NOT EXISTS public.education_applications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 12)),
  program_id uuid NOT NULL REFERENCES public.education_programs(id) ON DELETE RESTRICT,
  applicant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 160),
  contact_email text NOT NULL CHECK (position('@' IN contact_email) > 1),
  institution_name text,
  graduation_year smallint CHECK (graduation_year IS NULL OR graduation_year BETWEEN 1990 AND 2100),
  motivation text,
  consent_version text NOT NULL CHECK (length(trim(consent_version)) > 0),
  consented_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','needs_information','accepted','waitlisted','rejected','withdrawn')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_application_reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id uuid NOT NULL REFERENCES public.education_applications(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('under_review','needs_information','accepted','waitlisted','rejected')),
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id uuid NOT NULL REFERENCES public.education_cohorts(id) ON DELETE RESTRICT,
  learner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.education_applications(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'enrolled' CHECK (status IN ('invited','enrolled','active','completed','incomplete','withdrawn')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cohort_id, learner_id)
);

CREATE TABLE IF NOT EXISTS public.education_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id uuid NOT NULL REFERENCES public.education_cohorts(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  delivery_mode text NOT NULL DEFAULT 'hybrid' CHECK (delivery_mode IN ('hybrid','online','in_person','offline')),
  location_label text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','completed','cancelled')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.education_attendance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid NOT NULL REFERENCES public.education_sessions(id) ON DELETE RESTRICT,
  learner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present','late','absent','excused','remote_participation')),
  correction_reason text,
  marked_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  marked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, learner_id)
);

CREATE TABLE IF NOT EXISTS public.education_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cohort_id uuid NOT NULL REFERENCES public.education_cohorts(id) ON DELETE RESTRICT,
  title text NOT NULL,
  instructions text,
  rubric jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(rubric) IN ('array','object')),
  due_at timestamptz,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','closed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.education_submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid NOT NULL REFERENCES public.education_assignments(id) ON DELETE RESTRICT,
  learner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_markdown text,
  evidence_object_path text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','under_review','resubmission_requested','accepted')),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, learner_id)
);

CREATE TABLE IF NOT EXISTS public.education_assessments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid NOT NULL REFERENCES public.education_assignments(id) ON DELETE RESTRICT,
  learner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  score numeric(7,2),
  max_score numeric(7,2),
  rubric_results jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(rubric_results) IN ('array','object')),
  feedback text,
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review','reviewed','resubmission_requested','finalized')),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, learner_id),
  CHECK (score IS NULL OR score >= 0),
  CHECK (max_score IS NULL OR max_score > 0),
  CHECK (score IS NULL OR max_score IS NULL OR score <= max_score)
);

CREATE TABLE IF NOT EXISTS public.education_certificates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id uuid NOT NULL UNIQUE REFERENCES public.education_enrollments(id) ON DELETE RESTRICT,
  cohort_id uuid NOT NULL REFERENCES public.education_cohorts(id) ON DELETE RESTRICT,
  learner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(uuid_generate_v4()::text, '-', ''), 1, 16)),
  title text NOT NULL,
  issued_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  issued_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (revoked_at IS NULL OR revoked_at >= issued_at)
);

CREATE TABLE IF NOT EXISTS public.education_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  program_id uuid REFERENCES public.education_programs(id) ON DELETE SET NULL,
  cohort_id uuid REFERENCES public.education_cohorts(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS education_programs_status_idx ON public.education_programs(status);
CREATE INDEX IF NOT EXISTS education_cohorts_program_status_idx ON public.education_cohorts(program_id, status);
CREATE INDEX IF NOT EXISTS education_staff_user_role_idx ON public.education_staff_assignments(user_id, role);
CREATE INDEX IF NOT EXISTS education_applications_applicant_status_idx ON public.education_applications(applicant_id, status);
CREATE INDEX IF NOT EXISTS education_applications_program_status_idx ON public.education_applications(program_id, status);
CREATE INDEX IF NOT EXISTS education_enrollments_learner_status_idx ON public.education_enrollments(learner_id, status);
CREATE INDEX IF NOT EXISTS education_enrollments_cohort_status_idx ON public.education_enrollments(cohort_id, status);
CREATE INDEX IF NOT EXISTS education_sessions_cohort_start_idx ON public.education_sessions(cohort_id, starts_at);
CREATE INDEX IF NOT EXISTS education_attendance_learner_idx ON public.education_attendance(learner_id, session_id);
CREATE INDEX IF NOT EXISTS education_assignments_cohort_status_idx ON public.education_assignments(cohort_id, status);
CREATE INDEX IF NOT EXISTS education_submissions_learner_idx ON public.education_submissions(learner_id, assignment_id);
CREATE INDEX IF NOT EXISTS education_assessments_learner_idx ON public.education_assessments(learner_id, assignment_id);
CREATE INDEX IF NOT EXISTS education_certificates_learner_idx ON public.education_certificates(learner_id);

-- RLS helper functions. Fixed search_path and SECURITY DEFINER avoid recursive policies and
-- ensure policy evaluation never depends on untrusted user-created objects in search_path.
CREATE OR REPLACE FUNCTION public.education_has_access(
  p_program_id uuid,
  p_cohort_id uuid,
  p_roles text[]
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.education_staff_assignments s
      WHERE s.user_id = auth.uid()
        AND s.role = ANY(p_roles)
        AND (s.program_id IS NULL OR (p_program_id IS NOT NULL AND s.program_id = p_program_id))
        AND (s.cohort_id IS NULL OR (p_cohort_id IS NOT NULL AND s.cohort_id = p_cohort_id))
    );
$function$;

CREATE OR REPLACE FUNCTION public.education_has_cohort_access(p_cohort_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.education_cohorts c
    WHERE c.id = p_cohort_id
      AND public.education_has_access(c.program_id, c.id, p_roles)
  );
$function$;

CREATE OR REPLACE FUNCTION public.education_is_enrolled(p_cohort_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.education_enrollments e
    WHERE e.cohort_id = p_cohort_id
      AND e.learner_id = auth.uid()
      AND e.status IN ('enrolled','active','completed')
  );
$function$;

CREATE OR REPLACE FUNCTION public.education_has_session_access(p_session_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.education_sessions s
    WHERE s.id = p_session_id
      AND public.education_has_cohort_access(s.cohort_id, p_roles)
  );
$function$;

CREATE OR REPLACE FUNCTION public.education_is_session_member(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.education_sessions s
    WHERE s.id = p_session_id
      AND public.education_is_enrolled(s.cohort_id)
  );
$function$;

CREATE OR REPLACE FUNCTION public.education_has_assignment_access(p_assignment_id uuid, p_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.education_assignments a
    WHERE a.id = p_assignment_id
      AND public.education_has_cohort_access(a.cohort_id, p_roles)
  );
$function$;

CREATE OR REPLACE FUNCTION public.education_is_assignment_member(p_assignment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.education_assignments a
    WHERE a.id = p_assignment_id
      AND public.education_is_enrolled(a.cohort_id)
  );
$function$;

-- Explicit grants: do not depend on project-level default table privileges.
REVOKE ALL ON TABLE
  public.education_programs, public.education_cohorts, public.education_staff_assignments,
  public.education_applications, public.education_application_reviews, public.education_enrollments,
  public.education_sessions, public.education_attendance, public.education_assignments,
  public.education_submissions, public.education_assessments, public.education_certificates,
  public.education_audit_events
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.education_programs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.education_programs, public.education_cohorts, public.education_staff_assignments,
  public.education_applications, public.education_application_reviews, public.education_enrollments,
  public.education_sessions, public.education_attendance, public.education_assignments,
  public.education_submissions, public.education_assessments, public.education_certificates
TO authenticated;
GRANT SELECT ON public.education_audit_events TO authenticated;
GRANT ALL ON TABLE
  public.education_programs, public.education_cohorts, public.education_staff_assignments,
  public.education_applications, public.education_application_reviews, public.education_enrollments,
  public.education_sessions, public.education_attendance, public.education_assignments,
  public.education_submissions, public.education_assessments, public.education_certificates,
  public.education_audit_events
TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.education_audit_events_id_seq TO service_role;

REVOKE ALL ON FUNCTION public.education_has_access(uuid, uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.education_has_cohort_access(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.education_is_enrolled(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.education_has_session_access(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.education_is_session_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.education_has_assignment_access(uuid, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.education_is_assignment_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.education_has_access(uuid, uuid, text[]) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.education_has_cohort_access(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.education_is_enrolled(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.education_has_session_access(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.education_is_session_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.education_has_assignment_access(uuid, text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.education_is_assignment_member(uuid) TO authenticated, service_role;

ALTER TABLE public.education_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_application_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_audit_events ENABLE ROW LEVEL SECURITY;

-- Published programme catalogue is the only unauthenticated education data.
CREATE POLICY education_programs_public_read ON public.education_programs
  FOR SELECT TO anon USING (status = 'published');
CREATE POLICY education_programs_authenticated_read ON public.education_programs
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.education_has_access(id, NULL, ARRAY['education_admin','program_coordinator','instructor','mentor','registrar','auditor','safeguarding_officer']));
CREATE POLICY education_programs_insert ON public.education_programs
  FOR INSERT TO authenticated
  WITH CHECK (public.education_has_access(NULL, NULL, ARRAY['education_admin']));
CREATE POLICY education_programs_update ON public.education_programs
  FOR UPDATE TO authenticated
  USING (public.education_has_access(id, NULL, ARRAY['education_admin','program_coordinator']))
  WITH CHECK (public.education_has_access(id, NULL, ARRAY['education_admin','program_coordinator']));

CREATE POLICY education_staff_select_self_or_admin ON public.education_staff_assignments
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.education_has_access(NULL, NULL, ARRAY['education_admin']));
CREATE POLICY education_staff_insert_admin ON public.education_staff_assignments
  FOR INSERT TO authenticated WITH CHECK (public.education_has_access(NULL, NULL, ARRAY['education_admin']));
CREATE POLICY education_staff_update_admin ON public.education_staff_assignments
  FOR UPDATE TO authenticated
  USING (public.education_has_access(NULL, NULL, ARRAY['education_admin']))
  WITH CHECK (public.education_has_access(NULL, NULL, ARRAY['education_admin']));
CREATE POLICY education_staff_delete_admin ON public.education_staff_assignments
  FOR DELETE TO authenticated USING (public.education_has_access(NULL, NULL, ARRAY['education_admin']));

CREATE POLICY education_cohorts_read ON public.education_cohorts
  FOR SELECT TO authenticated
  USING (
    public.education_is_enrolled(id)
    OR public.education_has_cohort_access(id, ARRAY['education_admin','program_coordinator','instructor','mentor','registrar','auditor','safeguarding_officer'])
  );
CREATE POLICY education_cohorts_insert ON public.education_cohorts
  FOR INSERT TO authenticated
  WITH CHECK (public.education_has_access(program_id, NULL, ARRAY['education_admin','program_coordinator']));
CREATE POLICY education_cohorts_update ON public.education_cohorts
  FOR UPDATE TO authenticated
  USING (public.education_has_cohort_access(id, ARRAY['education_admin','program_coordinator']))
  WITH CHECK (public.education_has_cohort_access(id, ARRAY['education_admin','program_coordinator']));

CREATE POLICY education_applications_read_own_or_staff ON public.education_applications
  FOR SELECT TO authenticated
  USING (
    applicant_id = auth.uid()
    OR public.education_has_access(program_id, NULL, ARRAY['education_admin','program_coordinator'])
  );
CREATE POLICY education_applications_insert_own ON public.education_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    applicant_id = auth.uid()
    AND status IN ('draft','submitted')
    AND length(trim(consent_version)) > 0
    AND consented_at IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.education_programs p WHERE p.id = program_id AND p.status = 'published')
  );
CREATE POLICY education_applications_update_own_draft ON public.education_applications
  FOR UPDATE TO authenticated
  USING (applicant_id = auth.uid() AND status IN ('draft','needs_information'))
  WITH CHECK (applicant_id = auth.uid() AND status IN ('draft','submitted','needs_information','withdrawn'));
CREATE POLICY education_applications_update_staff ON public.education_applications
  FOR UPDATE TO authenticated
  USING (public.education_has_access(program_id, NULL, ARRAY['education_admin','program_coordinator']))
  WITH CHECK (public.education_has_access(program_id, NULL, ARRAY['education_admin','program_coordinator']));

CREATE POLICY education_reviews_select_staff ON public.education_application_reviews
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.education_applications a
    WHERE a.id = application_id
      AND public.education_has_access(a.program_id, NULL, ARRAY['education_admin','program_coordinator'])
  ));
CREATE POLICY education_reviews_insert_staff ON public.education_application_reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.education_applications a
      WHERE a.id = application_id
        AND public.education_has_access(a.program_id, NULL, ARRAY['education_admin','program_coordinator'])
    )
  );

CREATE POLICY education_enrollments_read_own_or_staff ON public.education_enrollments
  FOR SELECT TO authenticated
  USING (
    learner_id = auth.uid()
    OR public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator','instructor','mentor','registrar','auditor'])
  );
CREATE POLICY education_enrollments_insert_staff ON public.education_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator']));
CREATE POLICY education_enrollments_update_staff ON public.education_enrollments
  FOR UPDATE TO authenticated
  USING (public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator']))
  WITH CHECK (public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator']));

CREATE POLICY education_sessions_read_member_or_staff ON public.education_sessions
  FOR SELECT TO authenticated
  USING (
    public.education_is_enrolled(cohort_id)
    OR public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator','instructor','mentor','registrar','auditor'])
  );
CREATE POLICY education_sessions_insert_staff ON public.education_sessions
  FOR INSERT TO authenticated
  WITH CHECK (public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator','instructor']));
CREATE POLICY education_sessions_update_staff ON public.education_sessions
  FOR UPDATE TO authenticated
  USING (public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator','instructor']))
  WITH CHECK (public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator','instructor']));

CREATE POLICY education_attendance_read_own_or_staff ON public.education_attendance
  FOR SELECT TO authenticated
  USING (
    learner_id = auth.uid()
    OR public.education_has_session_access(session_id, ARRAY['education_admin','program_coordinator','instructor','mentor','auditor'])
  );
CREATE POLICY education_attendance_insert_staff ON public.education_attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    marked_by = auth.uid()
    AND public.education_has_session_access(session_id, ARRAY['education_admin','program_coordinator','instructor'])
  );
CREATE POLICY education_attendance_update_staff ON public.education_attendance
  FOR UPDATE TO authenticated
  USING (public.education_has_session_access(session_id, ARRAY['education_admin','program_coordinator','instructor']))
  WITH CHECK (public.education_has_session_access(session_id, ARRAY['education_admin','program_coordinator','instructor']));

CREATE POLICY education_assignments_read_member_or_staff ON public.education_assignments
  FOR SELECT TO authenticated
  USING (
    (status = 'published' AND public.education_is_enrolled(cohort_id))
    OR public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator','instructor','mentor','registrar','auditor'])
  );
CREATE POLICY education_assignments_insert_staff ON public.education_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator','instructor']));
CREATE POLICY education_assignments_update_staff ON public.education_assignments
  FOR UPDATE TO authenticated
  USING (public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator','instructor']))
  WITH CHECK (public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator','instructor']));

CREATE POLICY education_submissions_read_own_or_staff ON public.education_submissions
  FOR SELECT TO authenticated
  USING (
    learner_id = auth.uid()
    OR public.education_has_assignment_access(assignment_id, ARRAY['education_admin','program_coordinator','instructor','mentor','registrar','auditor'])
  );
CREATE POLICY education_submissions_insert_own ON public.education_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    learner_id = auth.uid()
    AND status IN ('draft','submitted')
    AND public.education_is_assignment_member(assignment_id)
    AND EXISTS (
      SELECT 1 FROM public.education_assignments a
      WHERE a.id = assignment_id AND a.status = 'published'
        AND (a.due_at IS NULL OR a.due_at >= now())
    )
  );
CREATE POLICY education_submissions_update_own ON public.education_submissions
  FOR UPDATE TO authenticated
  USING (learner_id = auth.uid() AND status IN ('draft','resubmission_requested'))
  WITH CHECK (
    learner_id = auth.uid()
    AND status IN ('draft','submitted','resubmission_requested')
    AND public.education_is_assignment_member(assignment_id)
    AND EXISTS (
      SELECT 1 FROM public.education_assignments a
      WHERE a.id = assignment_id AND a.status = 'published'
        AND (a.due_at IS NULL OR a.due_at >= now())
    )
  );
CREATE POLICY education_submissions_update_staff ON public.education_submissions
  FOR UPDATE TO authenticated
  USING (public.education_has_assignment_access(assignment_id, ARRAY['education_admin','program_coordinator','instructor','mentor']))
  WITH CHECK (public.education_has_assignment_access(assignment_id, ARRAY['education_admin','program_coordinator','instructor','mentor']));

CREATE POLICY education_assessments_read_own_or_staff ON public.education_assessments
  FOR SELECT TO authenticated
  USING (
    learner_id = auth.uid()
    OR public.education_has_assignment_access(assignment_id, ARRAY['education_admin','program_coordinator','instructor','mentor','registrar','auditor'])
  );
CREATE POLICY education_assessments_insert_staff ON public.education_assessments
  FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_id = auth.uid()
    AND public.education_has_assignment_access(assignment_id, ARRAY['education_admin','program_coordinator','instructor','mentor'])
  );
CREATE POLICY education_assessments_update_staff ON public.education_assessments
  FOR UPDATE TO authenticated
  USING (public.education_has_assignment_access(assignment_id, ARRAY['education_admin','program_coordinator','instructor','mentor']))
  WITH CHECK (public.education_has_assignment_access(assignment_id, ARRAY['education_admin','program_coordinator','instructor','mentor']));

CREATE POLICY education_certificates_read_own_or_staff ON public.education_certificates
  FOR SELECT TO authenticated
  USING (
    learner_id = auth.uid()
    OR public.education_has_cohort_access(cohort_id, ARRAY['education_admin','program_coordinator','registrar','auditor'])
  );
CREATE POLICY education_certificates_insert_registrar ON public.education_certificates
  FOR INSERT TO authenticated
  WITH CHECK (
    issued_by = auth.uid()
    AND public.education_has_cohort_access(cohort_id, ARRAY['education_admin','registrar'])
  );

CREATE POLICY education_audit_read_admin_auditor ON public.education_audit_events
  FOR SELECT TO authenticated
  USING (
    public.education_has_access(program_id, cohort_id, ARRAY['education_admin','auditor'])
  );

-- Updated timestamp helper for new mutable records.
CREATE OR REPLACE FUNCTION public.set_education_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DO $block$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'education_programs',
    'education_cohorts',
    'education_applications',
    'education_enrollments',
    'education_sessions',
    'education_attendance',
    'education_assignments',
    'education_submissions',
    'education_assessments'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', table_name);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_education_updated_at()',
      table_name
    );
  END LOOP;
END;
$block$;

COMMENT ON TABLE public.education_applications IS 'Restricted applicant PII; internal review notes live separately in education_application_reviews.';
COMMENT ON TABLE public.education_submissions IS 'Restricted learner submissions; evidence_object_path must reference private storage only, never a public URL.';
COMMENT ON TABLE public.education_certificates IS 'Certificate register; issuing and revocation flows require a reviewed server action and an audit event.';
COMMENT ON TABLE public.education_audit_events IS 'Restricted audit ledger; only trusted server-side workflows should insert events.';
