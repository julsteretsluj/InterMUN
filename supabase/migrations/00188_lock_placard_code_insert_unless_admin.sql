-- Placard codes may only be created or changed by website admins (or service role).

CREATE OR REPLACE FUNCTION public.allocation_gate_codes_lock_code_unless_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.code IS NOT DISTINCT FROM OLD.code THEN
    RETURN NEW;
  END IF;

  -- Service role / migrations: auth.uid() is null.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.current_user_profile_role()::text = 'admin' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Placard codes can only be changed by a site admin'
    USING ERRCODE = '42501';
END;
$$;

ALTER FUNCTION public.allocation_gate_codes_lock_code_unless_admin() OWNER TO postgres;

DROP TRIGGER IF EXISTS tr_allocation_gate_codes_lock_code ON public.allocation_gate_codes;
DROP TRIGGER IF EXISTS tr_allocation_gate_codes_lock_code_insert ON public.allocation_gate_codes;

CREATE TRIGGER tr_allocation_gate_codes_lock_code
  BEFORE UPDATE OF code ON public.allocation_gate_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.allocation_gate_codes_lock_code_unless_admin();

CREATE TRIGGER tr_allocation_gate_codes_lock_code_insert
  BEFORE INSERT ON public.allocation_gate_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.allocation_gate_codes_lock_code_unless_admin();
