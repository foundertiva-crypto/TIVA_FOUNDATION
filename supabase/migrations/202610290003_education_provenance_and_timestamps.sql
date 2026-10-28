-- Education provenance, timestamps, and audit scope fixes.
-- Staging-only first: run the complete RLS and access-boundary test plan before production.

begin;

-- The audit helper initially logged program/cohort rows without their own scope
-- IDs because those two tables store the scope in "id", not "program_id" / "cohort_id".
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

  if tg_table_name = 'education_programs' then
    p_id := record_id;
  elsif tg_table_name = 'education_cohorts' then
    c_id := record_id;
    select program_id into p_id from public.education_cohorts where id = c_id;
    if tg_op = 'DELETE' then
      p_id := nullif(row_data ->> 'program_id','')::uuid;
    end if;
  end if;

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

-- Populate creator fields from the authenticated actor and prevent spoofing.
create or replace function public.tiva_guard_education_program_provenance()
returns trigger
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  trusted_role boolean;
begin
  trusted_role :=
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin');

  if tg_op = 'INSERT' then
    if not trusted_role then
      if new.created_by is null then new.created_by := auth.uid(); end if;
      if new.created_by is distinct from auth.uid() then
        raise exception 'Programme creator must match the signed-in user'
          using errcode = '42501';
      end if;
      if not public.education_has_any_role(array['education_lead'], new.id, null) then
        -- An education lead with programme-scoped membership cannot own a new
        -- programme until an admin grants a global education-lead membership.
        raise exception 'Creating programmes requires a global education lead or administrator'
          using errcode = '42501';
      end if;
    end if;
  elsif new.created_by is distinct from old.created_by then
    raise exception 'Programme creator is immutable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists tiva_guard_education_program_provenance on public.education_programs;
create trigger tiva_guard_education_program_provenance
before insert or update on public.education_programs
for each row execute function public.tiva_guard_education_program_provenance();

create or replace function public.tiva_guard_education_cohort_provenance()
returns trigger
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  trusted_role boolean;
begin
  trusted_role :=
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin');

  if tg_op = 'INSERT' then
    if not trusted_role then
      if new.created_by is null then new.created_by := auth.uid(); end if;
      if new.created_by is distinct from auth.uid() then
        raise exception 'Cohort creator must match the signed-in user'
          using errcode = '42501';
      end if;
    end if;
  elsif new.created_by is distinct from old.created_by then
    raise exception 'Cohort creator is immutable'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists tiva_guard_education_cohort_provenance on public.education_cohorts;
create trigger tiva_guard_education_cohort_provenance
before insert or update on public.education_cohorts
for each row execute function public.tiva_guard_education_cohort_provenance();

create or replace function public.tiva_guard_education_staff_provenance()
returns trigger
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  trusted_role boolean;
begin
  trusted_role :=
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin');

  if tg_op = 'INSERT' then
    if not trusted_role then
      if new.granted_by is null then new.granted_by := auth.uid(); end if;
      if new.granted_by is distinct from auth.uid() then
        raise exception 'Membership grantor must match the signed-in user'
          using errcode = '42501';
      end if;
    end if;
  elsif new.user_id is distinct from old.user_id
     or new.role is distinct from old.role
     or new.program_id is distinct from old.program_id
     or new.cohort_id is distinct from old.cohort_id
     or new.granted_by is distinct from old.granted_by
     or new.granted_at is distinct from old.granted_at then
    raise exception 'Education membership scope and grant metadata are immutable; revoke and issue a new grant'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists tiva_guard_education_staff_provenance on public.education_staff_memberships;
create trigger tiva_guard_education_staff_provenance
before insert or update on public.education_staff_memberships
for each row execute function public.tiva_guard_education_staff_provenance();

-- A single source of truth for updated_at on mutable education entities.
create or replace function public.tiva_education_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists education_programs_set_updated_at on public.education_programs;
create trigger education_programs_set_updated_at before update on public.education_programs
for each row execute function public.tiva_education_set_updated_at();

drop trigger if exists education_cohorts_set_updated_at on public.education_cohorts;
create trigger education_cohorts_set_updated_at before update on public.education_cohorts
for each row execute function public.tiva_education_set_updated_at();

drop trigger if exists education_applications_set_updated_at on public.education_applications;
create trigger education_applications_set_updated_at before update on public.education_applications
for each row execute function public.tiva_education_set_updated_at();

drop trigger if exists education_enrollments_set_updated_at on public.education_enrollments;
create trigger education_enrollments_set_updated_at before update on public.education_enrollments
for each row execute function public.tiva_education_set_updated_at();

drop trigger if exists education_sessions_set_updated_at on public.education_sessions;
create trigger education_sessions_set_updated_at before update on public.education_sessions
for each row execute function public.tiva_education_set_updated_at();

drop trigger if exists education_attendance_set_updated_at on public.education_attendance;
create trigger education_attendance_set_updated_at before update on public.education_attendance
for each row execute function public.tiva_education_set_updated_at();

drop trigger if exists education_assessments_set_updated_at on public.education_assessments;
create trigger education_assessments_set_updated_at before update on public.education_assessments
for each row execute function public.tiva_education_set_updated_at();

commit;
