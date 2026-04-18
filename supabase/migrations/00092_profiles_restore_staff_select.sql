-- 00034 dropped all profiles policies and only restored self-read. SMT/chair/admin dashboards
-- need to read delegate names (e.g. award nominations, allocation matrix). Restore staff read-all
-- using a postgres-owned SECURITY DEFINER role helper so evaluating this policy does not recurse
-- into profiles RLS (see 00030).

CREATE OR REPLACE FUNCTION public.current_user_profile_role()
RETURNS public.user_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

ALTER FUNCTION public.current_user_profile_role() OWNER TO postgres;

DROP POLICY IF EXISTS "Chairs and SMT can read all profiles" ON public.profiles;

CREATE POLICY "Chairs and SMT can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  );
