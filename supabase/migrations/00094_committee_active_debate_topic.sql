-- Allow chairs to set which committee topic row drives live floor state (procedure, motions, timers).

BEGIN;

CREATE OR REPLACE FUNCTION public.committee_tab_key_sql(
  p_committee text,
  p_name text,
  p_id uuid
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_committee IS NOT NULL AND btrim(p_committee) <> '' THEN 'c:' || lower(btrim(p_committee))
    WHEN p_name IS NOT NULL AND btrim(p_name) <> '' THEN 'n:' || lower(btrim(p_name))
    ELSE 'id:' || p_id::text
  END;
$$;

ALTER TABLE public.committee_synced_state
  DROP CONSTRAINT IF EXISTS committee_synced_state_state_key_check;

ALTER TABLE public.committee_synced_state
  ADD CONSTRAINT committee_synced_state_state_key_check CHECK (
    state_key IN (
      'chair_prep_checklist',
      'chair_flow_checklist',
      'digital_room_flags',
      'motions_log',
      'delegate_countdown',
      'active_debate_topic'
    )
  );

DROP POLICY IF EXISTS "committee_synced_state_staff_committee_tools" ON public.committee_synced_state;

CREATE POLICY "committee_synced_state_staff_committee_tools"
  ON public.committee_synced_state
  FOR ALL
  USING (
    state_key IN (
      'chair_prep_checklist',
      'chair_flow_checklist',
      'digital_room_flags',
      'motions_log',
      'active_debate_topic'
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
      'motions_log',
      'active_debate_topic'
    )
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

CREATE POLICY "committee_synced_state_active_debate_topic_select"
  ON public.committee_synced_state
  FOR SELECT
  TO authenticated
  USING (
    state_key = 'active_debate_topic'
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role::text IN ('chair', 'smt', 'admin')
      )
      OR EXISTS (
        SELECT 1
        FROM public.allocations a
        JOIN public.conferences ca ON ca.id = a.conference_id
        JOIN public.conferences cc ON cc.id = committee_synced_state.conference_id
        WHERE a.user_id = auth.uid()
          AND ca.event_id IS NOT DISTINCT FROM cc.event_id
          AND public.committee_tab_key_sql(ca.committee, ca.name, ca.id)
            = public.committee_tab_key_sql(cc.committee, cc.name, cc.id)
      )
    )
  );

COMMIT;
