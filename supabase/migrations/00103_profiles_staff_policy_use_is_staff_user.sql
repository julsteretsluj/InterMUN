-- Hardening: staff "read all profiles" must not invoke profiles RLS during the check.
-- Policy expressions are evaluated such that current_user_profile_role() can still recurse
-- if row_security is not off in some environments. Use is_staff_user() (same pattern as 00032).

CREATE OR REPLACE FUNCTION public.is_staff_user(p_uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_uid
      AND p.role::text IN ('chair', 'smt', 'admin')
  );
$$;

ALTER FUNCTION public.is_staff_user(uuid) OWNER TO postgres;

DROP POLICY IF EXISTS "Chairs and SMT can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;

CREATE POLICY "Staff can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_staff_user(auth.uid()));
