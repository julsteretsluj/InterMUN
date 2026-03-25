-- Reset `profiles` RLS to eliminate any recursive policies.
-- Recreate a safe policy set, plus a SECURITY DEFINER helper for staff read-all.

-- Helper: check whether a user is staff (chair/smt/admin) without invoking profiles RLS.
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

-- Drop all existing policies on public.profiles (including problematic recursive ones).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

-- Users can always read their own profile.
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Delegates can read basic fields of anyone sharing a conference allocation.
CREATE POLICY "Delegates can read co-delegate profiles in same conference"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1
      FROM public.allocations a_self
      JOIN public.allocations a_peer ON a_self.conference_id = a_peer.conference_id
      WHERE a_self.user_id = auth.uid()
        AND a_peer.user_id = public.profiles.id
    )
  );

-- Staff (chair/smt/admin) can read all profiles (used by SMT/admin dashboards).
CREATE POLICY "Staff can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_staff_user(auth.uid()));

-- Users can update/insert their own profile row.
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

