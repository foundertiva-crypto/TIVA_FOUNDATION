-- TIVA Foundation security guard
-- Protect the profile role used by middleware and the admin layout.
-- Apply to staging first; do not run against production without a backup and a release window.

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_role_change()
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
  IF NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  request_role := current_setting('request.jwt.claim.role', true);
  caller_id := auth.uid();

  -- Service-role server workflows may set roles; keep the service key server-only.
  IF request_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Read the caller's pre-update role. The SECURITY DEFINER function avoids
  -- relying on the caller's own row-level SELECT policy to perform this check.
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = caller_id
      AND p.role = 'admin'
  )
  INTO caller_is_admin;

  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Changing profile role requires administrator privileges'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS profiles_role_change_guard ON public.profiles;

CREATE TRIGGER profiles_role_change_guard
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unauthorized_profile_role_change();

COMMENT ON FUNCTION public.prevent_unauthorized_profile_role_change()
IS 'Rejects profile role changes unless the JWT caller is already an administrator or the request uses the server-only service role.';
