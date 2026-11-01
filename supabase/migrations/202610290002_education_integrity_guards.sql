-- TIVA Foundation education-pilot integrity and audit hardening.
-- Apply only in staging first. This migration deliberately does not change
-- any existing learner, payment, KYC, donor, or production records.

begin;

-- The public-programme RLS policy calls this boolean helper. Its result only
-- reveals whether the caller has an education role in the selected programme.
grant execute on function public.education_has_any_role(text[], uuid, uuid) to anon, authenticated;

-- RLS still limits membership changes to administrators.
grant insert, update, delete on public.education_staff_memberships to authenticated;

-- Guard cross-table references and the high-impact completion/certificate fields.
create or replace function public.tiva_guard_education_enrollment()
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

  if tg_op = 'UPDATE' then
    if new.cohort_id is distinct from old.cohort_id
       or new.learner_user_id is distinct from old.learner_user_id
       or new.application_id is distinct from old.application_id then
      raise exception 'Enrollment identity fields are immutable'
        using errcode = '42501';
    end if;
  end if;

  if not trusted_role and tg_op = 'UPDATE'
     and (new.completion_approved_by is distinct from old.completion_approved_by
       or new.completion_approved_at is distinct from old.completion_approved_at) then
    if not public.education_has_cohort_role(array['education_lead'], new.cohort_id) then
      raise exception 'Completion approval requires an education lead'
        using errcode = '42501';
    end if;
    if new.completion_approved_by is distinct from auth.uid() then
      raise exception 'The approving user must match the current user'
        using errcode = '42501';
    end if;
  end if;

  if new.status = 'completed' then
    if new.completion_approved_by is null or new.completion_approved_at is null then
      raise exception 'Completed enrollment requires recorded completion approval'
        using errcode = '23514';
    end if;
    if not trusted_role and not public.education_has_cohort_role(array['education_lead'], new.cohort_id) then
      raise exception 'Only an education lead may complete an enrollment'
        using errcode = '42501';
    end if;
  end if;

  if new.completion_approved_at is not null and new.status <> 'completed' then
    raise exception 'Completion approval is valid only for completed enrollment'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists tiva_guard_education_enrollment on public.education_enrollments;
create trigger tiva_guard_education_enrollment
before insert or update on public.education_enrollments
for each row execute function public.tiva_guard_education_enrollment();

create or replace function public.tiva_guard_education_application_review()
returns trigger
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  application_program uuid;
  trusted_role boolean;
begin
  trusted_role :=
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin');

  select a.program_id into application_program
    from public.education_applications a
    where a.id = new.application_id;

  if application_program is null or application_program is distinct from new.program_id then
    raise exception 'Application review programme must match the application programme'
      using errcode = '23514';
  end if;

  if not trusted_role then
    if new.reviewer_user_id is distinct from auth.uid() then
      raise exception 'Reviewer identity must match the signed-in user'
        using errcode = '42501';
    end if;
    if not public.education_has_any_role(array['education_lead','coordinator'], new.program_id, null) then
      raise exception 'Application review requires an authorised programme reviewer'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tiva_guard_education_application_review on public.education_application_reviews;
create trigger tiva_guard_education_application_review
before insert or update on public.education_application_reviews
for each row execute function public.tiva_guard_education_application_review();

create or replace function public.tiva_guard_education_attendance()
returns trigger
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  session_cohort uuid;
  enrollment_cohort uuid;
  enrollment_learner uuid;
  trusted_role boolean;
begin
  trusted_role :=
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin');

  select s.cohort_id into session_cohort
    from public.education_sessions s where s.id = new.session_id;
  select e.cohort_id, e.learner_user_id into enrollment_cohort, enrollment_learner
    from public.education_enrollments e where e.id = new.enrollment_id;

  if session_cohort is null or enrollment_cohort is null
     or session_cohort is distinct from new.cohort_id
     or enrollment_cohort is distinct from new.cohort_id
     or enrollment_learner is distinct from new.learner_user_id then
    raise exception 'Attendance session, cohort, enrollment and learner must match'
      using errcode = '23514';
  end if;

  if not trusted_role then
    if new.recorded_by is null then new.recorded_by := auth.uid(); end if;
    if new.recorded_by is distinct from auth.uid() then
      raise exception 'Attendance recorder must match the signed-in user'
        using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and new.attendance_status is distinct from old.attendance_status
       and length(trim(coalesce(new.correction_reason, ''))) = 0 then
      raise exception 'Changing attendance status requires a correction reason'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tiva_guard_education_attendance on public.education_attendance;
create trigger tiva_guard_education_attendance
before insert or update on public.education_attendance
for each row execute function public.tiva_guard_education_attendance();

create or replace function public.tiva_guard_education_submission()
returns trigger
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  assessment_cohort uuid;
  enrollment_cohort uuid;
  enrollment_learner uuid;
  assessment_status text;
  trusted_role boolean;
begin
  trusted_role :=
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin');

  select a.cohort_id, a.status into assessment_cohort, assessment_status
    from public.education_assessments a where a.id = new.assessment_id;
  select e.cohort_id, e.learner_user_id into enrollment_cohort, enrollment_learner
    from public.education_enrollments e where e.id = new.enrollment_id;

  if assessment_cohort is null or enrollment_cohort is null
     or assessment_cohort is distinct from new.cohort_id
     or enrollment_cohort is distinct from new.cohort_id
     or enrollment_learner is distinct from new.learner_user_id then
    raise exception 'Submission assessment, cohort, enrollment and learner must match'
      using errcode = '23514';
  end if;

  if assessment_status <> 'published' then
    raise exception 'Submissions can only target a published assessment'
      using errcode = '23514';
  end if;

  if not trusted_role and new.learner_user_id is distinct from auth.uid() then
    raise exception 'A learner may only submit their own work'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists tiva_guard_education_submission on public.education_submissions;
create trigger tiva_guard_education_submission
before insert on public.education_submissions
for each row execute function public.tiva_guard_education_submission();

create or replace function public.tiva_guard_education_assessment_review()
returns trigger
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  submission_cohort uuid;
  trusted_role boolean;
begin
  trusted_role :=
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin');

  select s.cohort_id into submission_cohort
    from public.education_submissions s where s.id = new.submission_id;

  if submission_cohort is null or submission_cohort is distinct from new.cohort_id then
    raise exception 'Assessment review cohort must match its submission'
      using errcode = '23514';
  end if;

  if not trusted_role then
    if new.reviewer_user_id is distinct from auth.uid() then
      raise exception 'Reviewer identity must match the signed-in user'
        using errcode = '42501';
    end if;
    if not public.education_has_cohort_role(array['education_lead','coordinator','educator','mentor'], new.cohort_id) then
      raise exception 'Assessment review requires an assigned educator or mentor'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tiva_guard_education_assessment_review on public.education_assessment_reviews;
create trigger tiva_guard_education_assessment_review
before insert on public.education_assessment_reviews
for each row execute function public.tiva_guard_education_assessment_review();

create or replace function public.tiva_guard_education_certificate()
returns trigger
language plpgsql
security invoker
set search_path = public, auth
as $$
declare
  enrollment_cohort uuid;
  enrollment_learner uuid;
  enrollment_status text;
  enrollment_approved_at timestamptz;
  cohort_program uuid;
  trusted_role boolean;
begin
  trusted_role :=
    coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    or current_user in ('postgres', 'supabase_admin');

  select e.cohort_id, e.learner_user_id, e.status, e.completion_approved_at
    into enrollment_cohort, enrollment_learner, enrollment_status, enrollment_approved_at
    from public.education_enrollments e where e.id = new.enrollment_id;
  select c.program_id into cohort_program
    from public.education_cohorts c where c.id = new.cohort_id;

  if enrollment_cohort is null or cohort_program is null
     or enrollment_cohort is distinct from new.cohort_id
     or enrollment_learner is distinct from new.learner_user_id
     or cohort_program is distinct from new.program_id then
    raise exception 'Certificate programme, cohort, enrollment and learner must match'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    if enrollment_status <> 'completed' or enrollment_approved_at is null then
      raise exception 'Certificate issuance requires approved completion'
        using errcode = '23514';
    end if;
    if not trusted_role and new.issued_by is distinct from auth.uid() then
      raise exception 'Certificate issuer must match the signed-in user'
        using errcode = '42501';
    end if;
    if not trusted_role and not public.education_has_cohort_role(array['education_lead'], new.cohort_id) then
      raise exception 'Certificate issuance requires an education lead'
        using errcode = '42501';
    end if;
  else
    if new.verification_code is distinct from old.verification_code
       or new.program_id is distinct from old.program_id
       or new.cohort_id is distinct from old.cohort_id
       or new.enrollment_id is distinct from old.enrollment_id
       or new.learner_user_id is distinct from old.learner_user_id
       or new.award_title is distinct from old.award_title
       or new.issued_by is distinct from old.issued_by
       or new.issued_at is distinct from old.issued_at then
      raise exception 'Issued certificate identity fields are immutable'
        using errcode = '42501';
    end if;

    if old.status = 'revoked' and new.status <> 'revoked' then
      raise exception 'A revoked certificate cannot be reactivated; issue a new record'
        using errcode = '42501';
    end if;

    if new.status = 'revoked' then
      if length(trim(coalesce(new.revocation_reason, ''))) = 0
         or new.revoked_by is null or new.revoked_at is null then
        raise exception 'Certificate revocation requires an actor, timestamp and reason'
          using errcode = '23514';
      end if;
      if not trusted_role and new.revoked_by is distinct from auth.uid() then
        raise exception 'Revocation actor must match the signed-in user'
          using errcode = '42501';
      end if;
      if not trusted_role and not public.education_has_cohort_role(array['education_lead'], new.cohort_id) then
        raise exception 'Certificate revocation requires an education lead'
          using errcode = '42501';
      end if;
    elsif new.revoked_by is not null or new.revoked_at is not null or new.revocation_reason is not null then
      raise exception 'Issued certificate cannot include revocation fields'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tiva_guard_education_certificate on public.education_certificates;
create trigger tiva_guard_education_certificate
before insert or update on public.education_certificates
for each row execute function public.tiva_guard_education_certificate();

-- Add audit coverage for programme/cohort configuration and review events.
drop trigger if exists education_programs_audit on public.education_programs;
create trigger education_programs_audit after insert or update or delete on public.education_programs
for each row execute function public.tiva_education_log_event();

drop trigger if exists education_cohorts_audit on public.education_cohorts;
create trigger education_cohorts_audit after insert or update or delete on public.education_cohorts
for each row execute function public.tiva_education_log_event();

drop trigger if exists education_staff_memberships_audit on public.education_staff_memberships;
create trigger education_staff_memberships_audit after insert or update or delete on public.education_staff_memberships
for each row execute function public.tiva_education_log_event();

drop trigger if exists education_application_reviews_audit on public.education_application_reviews;
create trigger education_application_reviews_audit after insert or update or delete on public.education_application_reviews
for each row execute function public.tiva_education_log_event();

drop trigger if exists education_sessions_audit on public.education_sessions;
create trigger education_sessions_audit after insert or update or delete on public.education_sessions
for each row execute function public.tiva_education_log_event();

drop trigger if exists education_assessments_audit on public.education_assessments;
create trigger education_assessments_audit after insert or update or delete on public.education_assessments
for each row execute function public.tiva_education_log_event();

drop trigger if exists education_submissions_audit on public.education_submissions;
create trigger education_submissions_audit after insert or update or delete on public.education_submissions
for each row execute function public.tiva_education_log_event();

drop trigger if exists education_assessment_reviews_audit on public.education_assessment_reviews;
create trigger education_assessment_reviews_audit after insert or update or delete on public.education_assessment_reviews
for each row execute function public.tiva_education_log_event();

commit;
