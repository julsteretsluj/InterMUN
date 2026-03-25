-- Postgres treats any self-reference to `profiles` inside a `profiles` RLS policy as recursion,
-- including via SECURITY DEFINER helper functions. Remove staff-read-all policies to restore
-- basic profile reads (own profile + co-delegate reads).

DROP POLICY IF EXISTS "Staff can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Chairs and SMT can read all profiles" ON public.profiles;

-- Optional cleanup: helpers created during prior attempts (safe to drop if present).
DROP FUNCTION IF EXISTS public.is_staff_user(uuid);
DROP FUNCTION IF EXISTS public.current_user_profile_role();

