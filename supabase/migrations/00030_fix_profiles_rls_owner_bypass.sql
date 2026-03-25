-- Fix profiles RLS recursion by ensuring the role helper runs as table owner.
-- Table owners bypass RLS unless FORCE ROW LEVEL SECURITY is enabled.

-- Recreate helper (idempotent) and force ownership to postgres.
CREATE OR REPLACE FUNCTION public.current_user_profile_role()
RETURNS user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

-- Ensure the function owner can bypass RLS on `profiles`.
ALTER FUNCTION public.current_user_profile_role() OWNER TO postgres;

-- Replace the staff select policy to use the helper.
DROP POLICY IF EXISTS "Chairs and SMT can read all profiles" ON public.profiles;

CREATE POLICY "Chairs and SMT can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  );

