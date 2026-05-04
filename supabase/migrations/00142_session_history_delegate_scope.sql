BEGIN;

DROP POLICY IF EXISTS committee_session_history_select_staff ON public.committee_session_history;

CREATE POLICY committee_session_history_select_staff
  ON public.committee_session_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('smt', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.allocations a ON a.user_id = p.id
      JOIN public.conferences ac ON ac.id = a.conference_id
      JOIN public.conferences hc ON hc.id = committee_session_history.conference_id
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'delegate')
        AND ac.event_id = hc.event_id
        AND public.committee_session_group_key(ac.committee) IS NOT NULL
        AND public.committee_session_group_key(ac.committee) = public.committee_session_group_key(hc.committee)
    )
  );

COMMIT;
