-- TIVA World Foundation Education Pilot
-- Review in staging before applying to a live project.
-- This migration adds education-specific tables and a guard against profile-role self-escalation.
begin;

-- Prevent authenticated non-admins from changing profiles.role through their own profile update policy.
-- The function is SECURITY INVOKER on purpose; current_user remains the caller.
create or replace function public.tiva_protect_profile_role_change()
returns trigger
language plpgsql
set search_path = public, auth
as $$
declare
  jwt_role text;
  caller_id uuid;
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  jwt_role := coalesce(current_setting('request.jwt.claim.role', true), '');
  caller_id := auth.uid();

  if jwt_role = 'service_role' or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if caller_id is null or not exists (
    select 1 from public.profiles p
    where p.id = caller_id and p.role = 'admin'
  ) then
    raise exception 'Changing profile role requires an authorised administrator'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists tiva_protect_profile_role_change on public.profiles;
create trigger tiva_protect_profile_role_change
before update of role on public.profiles
for each row execute function public.tiva_protect_profile_role_change();

create table if not exists public.education_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) between 3 and 180),
  summary text not null default '',
  languages text[] not null default array['en']::text[],
  delivery_mode text not null default 'hybrid' check (delivery_mode in ('online','hybrid','in_person','offline')),
  eligibility text not null default '',
  capacity integer not null default 50 check (capacity between 1 and 100000),
  application_opens_at timestamptz,
  application_closes_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published','paused','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (application_closes_at is null or application_opens_at is null or application_closes_at > application_opens_at)
);

create table if not exists public.education_cohorts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.education_programs(id) on delete restrict,
  slug text not null,
  title text not null,
  start_date date,
  end_date date,
  timezone text not null default 'Asia/Kolkata',
  delivery_mode text not null default 'hybrid' check (delivery_mode in ('online','hybrid','in_person','offline')),
  capacity integer not null default 50 check (capacity between 1 and 100000),
  status text not null default 'draft' check (status in ('draft','active','completed','cancelled')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, slug),
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table if not exists public.education_staff_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('education_lead','coordinator','educator','mentor','auditor','safeguarding_officer')),
  program_id uuid references public.education_programs(id) on delete cascade,
  cohort_id uuid references public.education_cohorts(id) on delete cascade,
  is_active boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  check (cohort_id is null or program_id is not null)
);

create index if not exists education_staff_user_active_idx
  on public.education_staff_memberships(user_id, is_active, role);

create table if not exists public.education_applications (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique default ('TWF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  program_id uuid not null references public.education_programs(id) on delete restrict,
  applicant_user_id uuid not null references auth.users(id) on delete restrict,
  applicant_full_name text not null check (length(trim(applicant_full_name)) between 2 and 180),
  applicant_email text not null,
  applicant_phone text,
  college_name text,
  consent_version text not null,
  consent_at timestamptz not null,
  status text not null default 'submitted' check (status in ('draft','submitted','under_review','needs_information','accepted','waitlisted','rejected','withdrawn')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_id, applicant_user_id)
);

create index if not exists education_applications_program_status_idx
  on public.education_applications(program_id, status, submitted_at desc);
create index if not exists education_applications_owner_idx
  on public.education_applications(applicant_user_id, created_at desc);

create table if not exists public.education_application_reviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.education_applications(id) on delete restrict,
  program_id uuid not null references public.education_programs(id) on delete restrict,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  from_status text,
  to_status text not null check (to_status in ('under_review','needs_information','accepted','waitlisted','rejected','withdrawn')),
  private_note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists education_application_reviews_app_idx
  on public.education_application_reviews(application_id, created_at desc);

create table if not exists public.education_enrollments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.education_cohorts(id) on delete restrict,
  learner_user_id uuid not null references auth.users(id) on delete restrict,
  application_id uuid unique references public.education_applications(id) on delete set null,
  status text not null default 'enrolled' check (status in ('invited','enrolled','active','completed','incomplete','withdrawn')),
  completion_approved_by uuid references auth.users(id) on delete set null,
  completion_approved_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cohort_id, learner_user_id),
  check ((completion_approved_by is null) = (completion_approved_at is null))
);

create index if not exists education_enrollments_cohort_status_idx
  on public.education_enrollments(cohort_id, status);
create index if not exists education_enrollments_learner_idx
  on public.education_enrollments(learner_user_id, created_at desc);

create table if not exists public.education_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.education_cohorts(id) on delete restrict,
  title text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  delivery_mode text not null default 'hybrid' check (delivery_mode in ('online','hybrid','in_person','offline')),
  location_label text,
  published boolean not null default false,
  facilitator_user_id uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists education_sessions_cohort_time_idx
  on public.education_sessions(cohort_id, starts_at);

create table if not exists public.education_attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.education_sessions(id) on delete restrict,
  cohort_id uuid not null references public.education_cohorts(id) on delete restrict,
  enrollment_id uuid not null references public.education_enrollments(id) on delete restrict,
  learner_user_id uuid not null references auth.users(id) on delete restrict,
  attendance_status text not null default 'pending' check (attendance_status in ('pending','present','late','absent','excused')),
  correction_reason text,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, enrollment_id)
);

create index if not exists education_attendance_cohort_status_idx
  on public.education_attendance(cohort_id, attendance_status);
create index if not exists education_attendance_learner_idx
  on public.education_attendance(learner_user_id, recorded_at desc);

create table if not exists public.education_assessments (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.education_cohorts(id) on delete restrict,
  title text not null,
  description text not null default '',
  rubric jsonb not null default '[]'::jsonb check (jsonb_typeof(rubric) = 'array'),
  due_at timestamptz,
  status text not null default 'draft' check (status in ('draft','published','closed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists education_assessments_cohort_status_idx
  on public.education_assessments(cohort_id, status);

create table if not exists public.education_submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.education_assessments(id) on delete restrict,
  cohort_id uuid not null references public.education_cohorts(id) on delete restrict,
  enrollment_id uuid not null references public.education_enrollments(id) on delete restrict,
  learner_user_id uuid not null references auth.users(id) on delete restrict,
  submission_text text not null default '',
  private_storage_path text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists education_submissions_assessment_idx
  on public.education_submissions(assessment_id, submitted_at desc);
create index if not exists education_submissions_learner_idx
  on public.education_submissions(learner_user_id, submitted_at desc);

create table if not exists public.education_assessment_reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.education_submissions(id) on delete restrict,
  cohort_id uuid not null references public.education_cohorts(id) on delete restrict,
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  score numeric(7,2) check (score is null or score >= 0),
  max_score numeric(7,2) check (max_score is null or max_score > 0),
  feedback text not null default '',
  outcome text not null default 'pending_review' check (outcome in ('pending_review','needs_revision','accepted','not_passed')),
  rubric_version text,
  created_at timestamptz not null default now(),
  check (score is null or max_score is not null and score <= max_score)
);

create index if not exists education_assessment_reviews_submission_idx
  on public.education_assessment_reviews(submission_id, created_at desc);

create table if not exists public.education_certificates (
  id uuid primary key default gen_random_uuid(),
  verification_code uuid not null unique default gen_random_uuid(),
  program_id uuid not null references public.education_programs(id) on delete restrict,
  cohort_id uuid not null references public.education_cohorts(id) on delete restrict,
  enrollment_id uuid not null unique references public.education_enrollments(id) on delete restrict,
  learner_user_id uuid not null references auth.users(id) on delete restrict,
  award_title text not null,
  status text not null default 'issued' check (status in ('issued','revoked')),
  issued_by uuid not null references auth.users(id) on delete restrict,
  issued_at timestamptz not null default now(),
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revocation_reason text,
  check ((status = 'revoked') = (revoked_at is not null and revoked_by is not null)),
  check (status <> 'revoked' or length(trim(coalesce(revocation_reason, ''))) > 0)
);

create index if not exists education_certificates_learner_idx
  on public.education_certificates(learner_user_id, issued_at desc);

create table if not exists public.education_audit_events (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid not null,
  program_id uuid references public.education_programs(id) on delete set null,
  cohort_id uuid references public.education_cohorts(id) on delete set null,
  action text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists education_audit_events_time_idx
  on public.education_audit_events(created_at desc);
create index if not exists education_audit_events_scope_idx
  on public.education_audit_events(program_id, cohort_id, created_at desc);

-- Helpers are SECURITY DEFINER to evaluate scope without RLS recursion.
create or replace function public.education_has_any_role(
  allowed_roles text[],
  p_program_id uuid default null,
  p_cohort_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) or exists (
    select 1 from public.education_staff_memberships m
    where m.user_id = auth.uid()
      and m.is_active = true
      and m.revoked_at is null
      and m.role = any(allowed_roles)
      and (
        (p_program_id is null and m.program_id is null)
        or (p_program_id is not null and (m.program_id is null or m.program_id = p_program_id))
      )
      and (
        (p_cohort_id is null and m.cohort_id is null)
        or (p_cohort_id is not null and (m.cohort_id is null or m.cohort_id = p_cohort_id))
      )
  );
$$;

create or replace function public.education_has_cohort_role(allowed_roles text[], p_cohort_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) or exists (
    select 1
    from public.education_staff_memberships m
    join public.education_cohorts c on c.id = p_cohort_id
    where m.user_id = auth.uid()
      and m.is_active = true
      and m.revoked_at is null
      and m.role = any(allowed_roles)
      and (m.program_id is null or m.program_id = c.program_id)
      and (m.cohort_id is null or m.cohort_id = c.id)
  );
$$;

create or replace function public.education_is_enrolled(p_cohort_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.education_enrollments e
    where e.cohort_id = p_cohort_id
      and e.learner_user_id = p_user_id
      and e.status in ('enrolled','active','completed','incomplete')
  );
$$;

create or replace function public.tiva_education_log_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb;
  old_data jsonb;
  record_id uuid;
  p_id uuid;
  c_id uuid;
  actor_id uuid;
  safe_summary jsonb := '{}'::jsonb;
begin
  actor_id := auth.uid();
  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
    old_data := row_data;
  else
    row_data := to_jsonb(new);
    if tg_op = 'UPDATE' then old_data := to_jsonb(old); end if;
  end if;

  record_id := nullif(row_data ->> 'id','')::uuid;
  p_id := nullif(row_data ->> 'program_id','')::uuid;
  c_id := nullif(row_data ->> 'cohort_id','')::uuid;

  if c_id is not null and p_id is null then
    select program_id into p_id from public.education_cohorts where id = c_id;
  end if;

  if tg_op = 'UPDATE' then
    safe_summary := jsonb_build_object(
      'old_status', old_data ->> 'status',
      'new_status', row_data ->> 'status',
      'old_attendance_status', old_data ->> 'attendance_status',
      'new_attendance_status', row_data ->> 'attendance_status'
    );
  else
    safe_summary := jsonb_build_object(
      'status', row_data ->> 'status',
      'attendance_status', row_data ->> 'attendance_status'
    );
  end if;

  insert into public.education_audit_events(entity_type, entity_id, program_id, cohort_id, action, actor_user_id, summary)
  values (tg_table_name, record_id, p_id, c_id, lower(tg_op), actor_id, safe_summary);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists education_applications_audit on public.education_applications;
create trigger education_applications_audit
after insert or update or delete on public.education_applications
for each row execute function public.tiva_education_log_event();

drop trigger if exists education_enrollments_audit on public.education_enrollments;
create trigger education_enrollments_audit
after insert or update or delete on public.education_enrollments
for each row execute function public.tiva_education_log_event();

drop trigger if exists education_attendance_audit on public.education_attendance;
create trigger education_attendance_audit
after insert or update or delete on public.education_attendance
for each row execute function public.tiva_education_log_event();

drop trigger if exists education_certificates_audit on public.education_certificates;
create trigger education_certificates_audit
after insert or update or delete on public.education_certificates
for each row execute function public.tiva_education_log_event();

-- Public verification returns no learner PII.
create or replace function public.verify_education_certificate(p_code uuid)
returns table (
  verified boolean,
  award_title text,
  program_title text,
  issued_on date,
  certificate_status text
)
language sql
stable
security definer
set search_path = public
as $$
  select (c.status = 'issued') as verified,
         c.award_title,
         p.title as program_title,
         c.issued_at::date as issued_on,
         c.status as certificate_status
  from public.education_certificates c
  join public.education_programs p on p.id = c.program_id
  where c.verification_code = p_code
  limit 1;
$$;

-- RLS: all education tables are private except published programme metadata and the verification function.
alter table public.education_programs enable row level security;
alter table public.education_cohorts enable row level security;
alter table public.education_staff_memberships enable row level security;
alter table public.education_applications enable row level security;
alter table public.education_application_reviews enable row level security;
alter table public.education_enrollments enable row level security;
alter table public.education_sessions enable row level security;
alter table public.education_attendance enable row level security;
alter table public.education_assessments enable row level security;
alter table public.education_submissions enable row level security;
alter table public.education_assessment_reviews enable row level security;
alter table public.education_certificates enable row level security;
alter table public.education_audit_events enable row level security;

drop policy if exists education_program_public_read on public.education_programs;
create policy education_program_public_read on public.education_programs
for select to anon, authenticated
using (
  status = 'published'
  or public.education_has_any_role(array['education_lead','coordinator','educator','mentor','auditor'], id, null)
);

drop policy if exists education_program_insert on public.education_programs;
create policy education_program_insert on public.education_programs
for insert to authenticated
with check (public.education_has_any_role(array['education_lead'], id, null));

drop policy if exists education_program_update on public.education_programs;
create policy education_program_update on public.education_programs
for update to authenticated
using (public.education_has_any_role(array['education_lead'], id, null))
with check (public.education_has_any_role(array['education_lead'], id, null));

drop policy if exists education_cohort_read on public.education_cohorts;
create policy education_cohort_read on public.education_cohorts
for select to authenticated
using (
  public.education_has_cohort_role(array['education_lead','coordinator','educator','mentor','auditor'], id)
  or public.education_is_enrolled(id, auth.uid())
);

drop policy if exists education_cohort_insert on public.education_cohorts;
create policy education_cohort_insert on public.education_cohorts
for insert to authenticated
with check (public.education_has_any_role(array['education_lead','coordinator'], program_id, null));

drop policy if exists education_cohort_update on public.education_cohorts;
create policy education_cohort_update on public.education_cohorts
for update to authenticated
using (public.education_has_any_role(array['education_lead','coordinator'], program_id, null))
with check (public.education_has_any_role(array['education_lead','coordinator'], program_id, null));

drop policy if exists education_staff_memberships_self_read on public.education_staff_memberships;
create policy education_staff_memberships_self_read on public.education_staff_memberships
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists education_staff_memberships_admin_manage on public.education_staff_memberships;
create policy education_staff_memberships_admin_manage on public.education_staff_memberships
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists education_application_owner_insert on public.education_applications;
create policy education_application_owner_insert on public.education_applications
for insert to authenticated
with check (
  applicant_user_id = auth.uid()
  and status in ('draft','submitted')
  and consent_version <> ''
  and exists (select 1 from public.education_programs p where p.id = program_id and p.status = 'published')
);

drop policy if exists education_application_owner_read on public.education_applications;
create policy education_application_owner_read on public.education_applications
for select to authenticated
using (
  applicant_user_id = auth.uid()
  or public.education_has_any_role(array['education_lead','coordinator','auditor'], program_id, null)
);

drop policy if exists education_application_staff_update on public.education_applications;
create policy education_application_staff_update on public.education_applications
for update to authenticated
using (public.education_has_any_role(array['education_lead','coordinator'], program_id, null))
with check (public.education_has_any_role(array['education_lead','coordinator'], program_id, null));

drop policy if exists education_application_reviews_staff_read on public.education_application_reviews;
create policy education_application_reviews_staff_read on public.education_application_reviews
for select to authenticated
using (public.education_has_any_role(array['education_lead','coordinator','auditor'], program_id, null));

drop policy if exists education_application_reviews_staff_insert on public.education_application_reviews;
create policy education_application_reviews_staff_insert on public.education_application_reviews
for insert to authenticated
with check (
  reviewer_user_id = auth.uid()
  and public.education_has_any_role(array['education_lead','coordinator'], program_id, null)
);

drop policy if exists education_enrollment_read on public.education_enrollments;
create policy education_enrollment_read on public.education_enrollments
for select to authenticated
using (
  learner_user_id = auth.uid()
  or public.education_has_cohort_role(array['education_lead','coordinator','educator','mentor','auditor'], cohort_id)
);

drop policy if exists education_enrollment_insert on public.education_enrollments;
create policy education_enrollment_insert on public.education_enrollments
for insert to authenticated
with check (
  public.education_has_cohort_role(array['education_lead','coordinator'], cohort_id)
  and (created_by is null or created_by = auth.uid())
);

drop policy if exists education_enrollment_update on public.education_enrollments;
create policy education_enrollment_update on public.education_enrollments
for update to authenticated
using (public.education_has_cohort_role(array['education_lead','coordinator'], cohort_id))
with check (public.education_has_cohort_role(array['education_lead','coordinator'], cohort_id));

drop policy if exists education_session_read on public.education_sessions;
create policy education_session_read on public.education_sessions
for select to authenticated
using (
  (published and public.education_is_enrolled(cohort_id, auth.uid()))
  or public.education_has_cohort_role(array['education_lead','coordinator','educator','mentor','auditor'], cohort_id)
);

drop policy if exists education_session_insert on public.education_sessions;
create policy education_session_insert on public.education_sessions
for insert to authenticated
with check (public.education_has_cohort_role(array['education_lead','coordinator','educator'], cohort_id));

drop policy if exists education_session_update on public.education_sessions;
create policy education_session_update on public.education_sessions
for update to authenticated
using (public.education_has_cohort_role(array['education_lead','coordinator','educator'], cohort_id))
with check (public.education_has_cohort_role(array['education_lead','coordinator','educator'], cohort_id));

drop policy if exists education_attendance_read on public.education_attendance;
create policy education_attendance_read on public.education_attendance
for select to authenticated
using (
  learner_user_id = auth.uid()
  or public.education_has_cohort_role(array['education_lead','coordinator','educator','mentor','auditor'], cohort_id)
);

drop policy if exists education_attendance_insert on public.education_attendance;
create policy education_attendance_insert on public.education_attendance
for insert to authenticated
with check (
  public.education_has_cohort_role(array['education_lead','coordinator','educator'], cohort_id)
  and (recorded_by is null or recorded_by = auth.uid())
);

drop policy if exists education_attendance_update on public.education_attendance;
create policy education_attendance_update on public.education_attendance
for update to authenticated
using (public.education_has_cohort_role(array['education_lead','coordinator','educator'], cohort_id))
with check (public.education_has_cohort_role(array['education_lead','coordinator','educator'], cohort_id));

drop policy if exists education_assessment_read on public.education_assessments;
create policy education_assessment_read on public.education_assessments
for select to authenticated
using (
  (status = 'published' and public.education_is_enrolled(cohort_id, auth.uid()))
  or public.education_has_cohort_role(array['education_lead','coordinator','educator','mentor','auditor'], cohort_id)
);

drop policy if exists education_assessment_insert on public.education_assessments;
create policy education_assessment_insert on public.education_assessments
for insert to authenticated
with check (public.education_has_cohort_role(array['education_lead','coordinator','educator'], cohort_id));

drop policy if exists education_assessment_update on public.education_assessments;
create policy education_assessment_update on public.education_assessments
for update to authenticated
using (public.education_has_cohort_role(array['education_lead','coordinator','educator'], cohort_id))
with check (public.education_has_cohort_role(array['education_lead','coordinator','educator'], cohort_id));

drop policy if exists education_submission_owner_read on public.education_submissions;
create policy education_submission_owner_read on public.education_submissions
for select to authenticated
using (
  learner_user_id = auth.uid()
  or public.education_has_cohort_role(array['education_lead','coordinator','educator','mentor','auditor'], cohort_id)
);

drop policy if exists education_submission_owner_insert on public.education_submissions;
create policy education_submission_owner_insert on public.education_submissions
for insert to authenticated
with check (
  learner_user_id = auth.uid()
  and public.education_is_enrolled(cohort_id, auth.uid())
  and exists (
    select 1 from public.education_assessments a
    where a.id = assessment_id and a.cohort_id = cohort_id and a.status = 'published'
  )
);

drop policy if exists education_assessment_review_staff_read on public.education_assessment_reviews;
create policy education_assessment_review_staff_read on public.education_assessment_reviews
for select to authenticated
using (public.education_has_cohort_role(array['education_lead','coordinator','educator','mentor','auditor'], cohort_id));

drop policy if exists education_assessment_review_staff_insert on public.education_assessment_reviews;
create policy education_assessment_review_staff_insert on public.education_assessment_reviews
for insert to authenticated
with check (
  reviewer_user_id = auth.uid()
  and public.education_has_cohort_role(array['education_lead','coordinator','educator','mentor'], cohort_id)
);

drop policy if exists education_certificate_read on public.education_certificates;
create policy education_certificate_read on public.education_certificates
for select to authenticated
using (
  learner_user_id = auth.uid()
  or public.education_has_cohort_role(array['education_lead','coordinator','auditor'], cohort_id)
);

drop policy if exists education_certificate_insert on public.education_certificates;
create policy education_certificate_insert on public.education_certificates
for insert to authenticated
with check (
  issued_by = auth.uid()
  and public.education_has_any_role(array['education_lead'], program_id, cohort_id)
  and exists (
    select 1 from public.education_enrollments e
    where e.id = enrollment_id and e.learner_user_id = learner_user_id and e.status = 'completed'
      and e.completion_approved_at is not null
  )
);

drop policy if exists education_certificate_update on public.education_certificates;
create policy education_certificate_update on public.education_certificates
for update to authenticated
using (public.education_has_any_role(array['education_lead'], program_id, cohort_id))
with check (public.education_has_any_role(array['education_lead'], program_id, cohort_id));

drop policy if exists education_audit_read on public.education_audit_events;
create policy education_audit_read on public.education_audit_events
for select to authenticated
using (
  public.is_admin()
  or public.education_has_any_role(array['education_lead','auditor'], program_id, cohort_id)
);

-- Grant only the table privileges needed; RLS remains the data boundary.
grant select on public.education_programs to anon, authenticated;
grant insert, update on public.education_programs to authenticated;
grant select, insert, update on public.education_cohorts to authenticated;
grant select on public.education_staff_memberships to authenticated;
grant select, insert, update on public.education_applications to authenticated;
grant select, insert on public.education_application_reviews to authenticated;
grant select, insert, update on public.education_enrollments to authenticated;
grant select, insert, update on public.education_sessions to authenticated;
grant select, insert, update on public.education_attendance to authenticated;
grant select, insert, update on public.education_assessments to authenticated;
grant select, insert on public.education_submissions to authenticated;
grant select, insert on public.education_assessment_reviews to authenticated;
grant select, insert, update on public.education_certificates to authenticated;
grant select on public.education_audit_events to authenticated;

revoke all on function public.verify_education_certificate(uuid) from public;
grant execute on function public.verify_education_certificate(uuid) to anon, authenticated;
revoke all on function public.education_has_any_role(text[], uuid, uuid) from public;
grant execute on function public.education_has_any_role(text[], uuid, uuid) to authenticated;
revoke all on function public.education_has_cohort_role(text[], uuid) from public;
grant execute on function public.education_has_cohort_role(text[], uuid) to authenticated;
revoke all on function public.education_is_enrolled(uuid, uuid) from public;
grant execute on function public.education_is_enrolled(uuid, uuid) to authenticated;

commit;
