-- Remove retired SEAMUN I 2027 chambers and dependent rows.
-- Retired committee labels: EU Parli, F1, HSC, UNESCO, UNICEF.

DO $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT id
  INTO v_event_id
  FROM public.conference_events
  WHERE upper(trim(event_code)) = 'SEAMUNI2027'
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RAISE NOTICE 'SEAMUNI2027 event not found; skipping retired committee cleanup.';
    RETURN;
  END IF;

  -- Child rows (allocations, votes, notes, etc.) use ON DELETE CASCADE from conferences.
  DELETE FROM public.conferences
  WHERE event_id = v_event_id
    AND trim(coalesce(committee, '')) IN ('EU Parli', 'F1', 'HSC', 'UNESCO', 'UNICEF');
END $$;
