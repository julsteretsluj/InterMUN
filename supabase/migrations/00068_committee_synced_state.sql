-- Committee-scoped UI state synced via Supabase (replaces localStorage for these features).

BEGIN;

CREATE TABLE public.committee_synced_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  state_key text NOT NULL CHECK (
    state_key IN (
      'chair_prep_checklist',
      'chair_flow_checklist',
      'digital_room_flags',
      'motions_log',
      'delegate_countdown'
    )
  ),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conference_id, state_key)
);

CREATE INDEX committee_synced_state_conference_id_idx
  ON public.committee_synced_state (conference_id);

COMMENT ON TABLE public.committee_synced_state IS
  'Per-committee JSON blobs for chair tools and shared delegate countdowns; synced across devices.';

ALTER TABLE public.committee_synced_state ENABLE ROW LEVEL SECURITY;

-- Chair prep / flow, digital room notes, motions log: staff only (delegates must not read chair notes).
CREATE POLICY "committee_synced_state_staff_committee_tools"
  ON public.committee_synced_state
  FOR ALL
  USING (
    state_key IN (
      'chair_prep_checklist',
      'chair_flow_checklist',
      'digital_room_flags',
      'motions_log'
    )
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  )
  WITH CHECK (
    state_key IN (
      'chair_prep_checklist',
      'chair_flow_checklist',
      'digital_room_flags',
      'motions_log'
    )
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

-- Delegate countdown: anyone with an allocation in this committee, plus staff.
CREATE POLICY "committee_synced_state_delegate_countdown"
  ON public.committee_synced_state
  FOR ALL
  USING (
    state_key = 'delegate_countdown'
    AND (
      EXISTS (
        SELECT 1
        FROM public.allocations a
        WHERE a.conference_id = committee_synced_state.conference_id
          AND a.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role::text IN ('chair', 'smt', 'admin')
      )
    )
  )
  WITH CHECK (
    state_key = 'delegate_countdown'
    AND (
      EXISTS (
        SELECT 1
        FROM public.allocations a
        WHERE a.conference_id = committee_synced_state.conference_id
          AND a.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role::text IN ('chair', 'smt', 'admin')
      )
    )
  );

-- Realtime: enable in Dashboard → Database → Replication, or:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.committee_synced_state;

COMMIT;
