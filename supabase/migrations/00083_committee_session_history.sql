BEGIN;

CREATE TABLE IF NOT EXISTS public.committee_session_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  title text NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NULL,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_committee_session_history_conference_started
  ON public.committee_session_history (conference_id, started_at DESC);

ALTER TABLE public.committee_session_history ENABLE ROW LEVEL SECURITY;

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
      WHERE p.id = auth.uid()
        AND p.role::text = 'chair'
        AND a.conference_id = committee_session_history.conference_id
    )
  );

DROP POLICY IF EXISTS committee_session_history_insert_staff ON public.committee_session_history;
CREATE POLICY committee_session_history_insert_staff
  ON public.committee_session_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
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
      WHERE p.id = auth.uid()
        AND p.role::text = 'chair'
        AND a.conference_id = committee_session_history.conference_id
    )
  );

DROP POLICY IF EXISTS committee_session_history_update_staff ON public.committee_session_history;
CREATE POLICY committee_session_history_update_staff
  ON public.committee_session_history
  FOR UPDATE
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
      WHERE p.id = auth.uid()
        AND p.role::text = 'chair'
        AND a.conference_id = committee_session_history.conference_id
    )
  )
  WITH CHECK (
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
      WHERE p.id = auth.uid()
        AND p.role::text = 'chair'
        AND a.conference_id = committee_session_history.conference_id
    )
  );

DROP POLICY IF EXISTS committee_session_history_delete_smt_admin ON public.committee_session_history;
CREATE POLICY committee_session_history_delete_smt_admin
  ON public.committee_session_history
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('smt', 'admin')
    )
  );

COMMIT;
