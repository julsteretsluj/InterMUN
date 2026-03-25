-- Further fix for infinite recursion in `profiles` RLS policies.
-- Some Postgres setups still apply RLS inside SECURITY DEFINER functions,
-- so we explicitly disable row_security for the helper function.

CREATE OR REPLACE FUNCTION public.current_user_profile_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

DROP POLICY IF EXISTS "Chairs and SMT can read all profiles" ON public.profiles;

CREATE POLICY "Chairs and SMT can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  );

