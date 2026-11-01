-- Harden the existing policy helper: SECURITY DEFINER functions must pin search_path.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$function$;

-- TIVA Foundation security guard.
-- Protect both admin privileges and moderation/referral integrity fields.
-- Apply to staging first; do not run against production without a verified backup and release window.

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_protected_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  request_role text;
  caller_id uuid;
  caller_is_admin boolean := false;
BEGIN
  request_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  );
  caller_id := auth.uid();

  -- The Supabase service-role key must remain server-only. Server-side trusted
  -- workflows (e.g. protected admin actions) may update the protected fields.
  IF request_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- The row being updated still contains its old role during a BEFORE trigger.
  -- The definer context permits this existence check without relying on user RLS.
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = caller_id
      AND p.role = 'admin'
  )
  INTO caller_is_admin;

  IF caller_is_admin THEN
    RETURN NEW;
  END IF;

  -- Defense in depth: ordinary users may edit only their own display name and
  -- avatar through this row-update path. Identity, referral, moderation and
  -- authorization attributes must be updated by a trusted workflow.
  IF caller_id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Updating another profile requires administrator privileges'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by
     OR NEW.device_fingerprint IS DISTINCT FROM OLD.device_fingerprint
     OR NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_flagged IS DISTINCT FROM OLD.is_flagged
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Protected profile fields require an authorized server-side workflow'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_role_change_guard ON public.profiles;
DROP TRIGGER IF EXISTS profiles_protected_fields_guard ON public.profiles;

CREATE TRIGGER profiles_protected_fields_guard
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unauthorized_profile_protected_field_changes();

COMMENT ON FUNCTION public.prevent_unauthorized_profile_protected_field_changes()
IS 'Blocks ordinary authenticated users from editing identity, referral-integrity, moderation, and authorization fields on profiles. Admins and the server-only service role may perform authorized changes.';
