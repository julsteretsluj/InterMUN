-- Seat/position labels (allocations.country) may only be renamed by website admins.
-- SMT and chairs can still add/remove unassigned seats and edit placard codes.

CREATE OR REPLACE FUNCTION public.allocations_lock_country_unless_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.country IS NOT DISTINCT FROM OLD.country THEN
    RETURN NEW;
  END IF;

  -- Service role / migrations: auth.uid() is null.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.current_user_profile_role()::text = 'admin' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Position names can only be changed by a site admin'
    USING ERRCODE = '42501';
END;
$$;

ALTER FUNCTION public.allocations_lock_country_unless_admin() OWNER TO postgres;

DROP TRIGGER IF EXISTS tr_allocations_lock_country ON public.allocations;

CREATE TRIGGER tr_allocations_lock_country
  BEFORE UPDATE OF country ON public.allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.allocations_lock_country_unless_admin();
