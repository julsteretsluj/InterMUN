-- Fix postgres errors from production logs:
-- 1. 42703 column allocations.created_at does not exist (profile seats ordered by created_at)
-- 2. 54001 stack depth limit exceeded + 57014 statement timeout
--    profiles SELECT policy evaluated a 4-way allocations/conferences join FIRST for every row,
--    re-entering RLS. Move peer checks into a SECURITY DEFINER helper with cheap predicates first.

ALTER TABLE public.allocations
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS allocations_created_at_idx
  ON public.allocations (created_at);

CREATE OR REPLACE FUNCTION public.is_staff_user(p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
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

CREATE OR REPLACE FUNCTION public.can_read_profile(p_subject uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_subject IS NOT NULL
    AND (
      p_subject = (SELECT auth.uid())
      OR public.is_staff_user((SELECT auth.uid()))
      OR private.advisor_can_view_delegate_user((SELECT auth.uid()), p_subject)
      OR EXISTS (
        SELECT 1
        FROM public.allocations a_self
        JOIN public.conferences c_self ON c_self.id = a_self.conference_id
        JOIN public.allocations a_peer ON a_peer.user_id = p_subject
        JOIN public.conferences c_peer ON c_peer.id = a_peer.conference_id
        WHERE a_self.user_id = (SELECT auth.uid())
          AND c_self.event_id IS NOT NULL
          AND c_peer.event_id IS NOT NULL
          AND c_self.event_id = c_peer.event_id
          AND public.committee_tab_key(c_self) = public.committee_tab_key(c_peer)
      )
    );
$$;

ALTER FUNCTION public.can_read_profile(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_read_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_profile(uuid) TO service_role;

DROP POLICY IF EXISTS "profiles_select_merged" ON public.profiles;

CREATE POLICY "profiles_select_merged"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.can_read_profile(id));
