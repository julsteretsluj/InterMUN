-- Fix: "infinite recursion detected in policy for relation profiles"
-- current_user_profile_role() reads public.profiles while RLS is still enforced, so evaluating
-- "Chairs and SMT can read all profiles" re-enters profiles policies. Bypass RLS inside the helper
-- (same pattern as public.is_staff_user in 00032).

CREATE OR REPLACE FUNCTION public.current_user_profile_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

ALTER FUNCTION public.current_user_profile_role() OWNER TO postgres;
