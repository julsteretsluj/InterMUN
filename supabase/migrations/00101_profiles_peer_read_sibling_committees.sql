-- Delegates (and anyone with an allocation) could not read chair profiles when the chair sat on a
-- different `conferences` row than the delegate (same committee / event, different topic row).
-- PostgREST embeds (`allocations → profiles`) still enforce per-row profile RLS, so chair feedback
-- and similar flows saw "no chair" despite a registered chair.

CREATE OR REPLACE FUNCTION public.committee_tab_key(c public.conferences)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(trim(c.committee), '') <> '' THEN 'c:' || lower(trim(c.committee))
    WHEN COALESCE(trim(c.name), '') <> '' THEN 'n:' || lower(trim(c.name))
    ELSE 'id:' || c.id::text
  END;
$$;

COMMENT ON FUNCTION public.committee_tab_key(public.conferences) IS
  'Matches lib/conference-committee-canonical.ts committeeTabKey for committee-scoped peer access.';

CREATE POLICY "Peers can read profiles across sibling committee conference rows"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.allocations a_self
      JOIN public.conferences c_self ON c_self.id = a_self.conference_id
      JOIN public.allocations a_peer ON a_peer.user_id = public.profiles.id
      JOIN public.conferences c_peer ON c_peer.id = a_peer.conference_id
      WHERE a_self.user_id = auth.uid()
        AND c_self.event_id IS NOT NULL
        AND c_peer.event_id IS NOT NULL
        AND c_self.event_id = c_peer.event_id
        AND public.committee_tab_key(c_self) = public.committee_tab_key(c_peer)
    )
  );
