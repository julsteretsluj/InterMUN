-- Fix infinite recursion in RLS policies caused by policies querying `profiles` from within `profiles`.
-- This affects staff/admin reads used by the app header and /api/me debugging.

-- SECURITY DEFINER function to fetch current user's role without re-entering the same policy evaluation path.
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

-- Replace the recursive "Chairs and SMT can read all profiles" policy.
DROP POLICY IF EXISTS "Chairs and SMT can read all profiles" ON public.profiles;

CREATE POLICY "Chairs and SMT can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  );

