-- PostgreSQL 16 isolated smoke tests. Run only in a disposable test database.
BEGIN;

INSERT INTO auth.users (id, email) VALUES
 ('10000000-0000-4000-8000-000000000001', 'learner-a@example.test'),
 ('10000000-0000-4000-8000-000000000002', 'learner-b@example.test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, phone, full_name)
VALUES
 ('10000000-0000-4000-8000-000000000001', '+910000000001', 'Learner A'),
 ('10000000-0000-4000-8000-000000000002', '+910000000002', 'Learner B')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_programs (id, slug, title, status, capacity, language_codes, created_by)
VALUES ('20000000-0000-4000-8000-000000000001', 'test-program', 'Test Education Programme', 'published', 50, ARRAY['en','kn','hi'], '10000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_cohorts (id, program_id, code, title, status, capacity, created_by)
VALUES ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'TEST-001', 'Test Cohort', 'active', 50, '10000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.education_applications
 (id, reference_code, program_id, applicant_id, full_name, contact_email, consent_version, consented_at, status, submitted_at)
VALUES
 ('40000000-0000-4000-8000-000000000001', 'TESTAPP000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Learner A', 'learner-a@example.test', 'test-v1', now(), 'submitted', now()),
 ('40000000-0000-4000-8000-000000000002', 'TESTAPP000002', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Learner B', 'learner-b@example.test', 'test-v1', now(), 'submitted', now())
ON CONFLICT (id) DO NOTHING;

-- Learner A cannot elevate own profile privileges.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

DO $test$
DECLARE
  blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.profiles
       SET role = 'admin'
     WHERE id = '10000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'SECURITY FAILURE: learner escalated profile.role';
  END IF;
END
$test$;

-- Ordinary profile presentation edits remain available.
UPDATE public.profiles
SET full_name = 'Learner A Updated'
WHERE id = '10000000-0000-4000-8000-000000000001';

DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
     WHERE id = '10000000-0000-4000-8000-000000000001'
       AND full_name = 'Learner A Updated'
       AND role = 'user'
  ) THEN
    RAISE EXCEPTION 'Functional regression: permitted profile edit failed or role changed';
  END IF;
END
$test$;

-- Learner A cannot change moderation/referral-integrity fields.
DO $test$
DECLARE
  blocked boolean := false;
BEGIN
  BEGIN
    UPDATE public.profiles
       SET is_flagged = true
     WHERE id = '10000000-0000-4000-8000-000000000001';
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'SECURITY FAILURE: learner changed is_flagged';
  END IF;
END
$test$;

-- Learner A cannot read Learner B's application.
DO $test$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.education_applications
     WHERE id = '40000000-0000-4000-8000-000000000002'
  ) THEN
    RAISE EXCEPTION 'SECURITY FAILURE: learner can read another learner application';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.education_applications
     WHERE id = '40000000-0000-4000-8000-000000000001'
  ) THEN
    RAISE EXCEPTION 'Functional regression: learner cannot read own application';
  END IF;
END
$test$;

-- Learner A cannot grant themselves staff/admin permissions.
DO $test$
DECLARE
  blocked boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.education_staff_assignments
      (user_id, role, assigned_by)
    VALUES
      ('10000000-0000-4000-8000-000000000001', 'education_admin', '10000000-0000-4000-8000-000000000001');
  EXCEPTION WHEN insufficient_privilege THEN
    blocked := true;
  END;
  IF NOT blocked THEN
    RAISE EXCEPTION 'SECURITY FAILURE: learner assigned self education_admin';
  END IF;
END
$test$;

-- Anonymous users may see only the published programme catalogue, not applications.
RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
SELECT set_config('request.jwt.claim.role', 'anon', true);
DO $test$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.education_programs
     WHERE id = '20000000-0000-4000-8000-000000000001'
  ) THEN
    RAISE EXCEPTION 'Functional regression: published programme is not public';
  END IF;
  IF EXISTS (SELECT 1 FROM public.education_applications) THEN
    RAISE EXCEPTION 'SECURITY FAILURE: anonymous user can read applications';
  END IF;
END
$test$;

RESET ROLE;
ROLLBACK;
