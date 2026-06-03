-- Remove retired SEAMUN I 2027 chambers and dependent rows.
-- Retired committee labels: EU Parli, F1, HSC, UNESCO, UNICEF.

DO $$
DECLARE
  v_event_id uuid;
  r record;
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

  -- Remove rows from tables that directly reference conference_id.
  -- Keep this dynamic so the migration stays resilient as schema evolves.
  FOR r IN
    SELECT table_schema, table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'conference_id'
      AND table_name <> 'conferences'
  LOOP
    EXECUTE format(
      'DELETE FROM %I.%I
       WHERE conference_id IN (
         SELECT id
         FROM public.conferences
         WHERE event_id = $1
           AND trim(coalesce(committee, '''')) IN (''EU Parli'', ''F1'', ''HSC'', ''UNESCO'', ''UNICEF'')
       )',
      r.table_schema,
      r.table_name
    ) USING v_event_id;
  END LOOP;

  -- Allocation gate codes reference allocations, so clear those first.
  DELETE FROM public.allocation_gate_codes
  WHERE allocation_id IN (
    SELECT a.id
    FROM public.allocations a
    JOIN public.conferences c ON c.id = a.conference_id
    WHERE c.event_id = v_event_id
      AND trim(coalesce(c.committee, '')) IN ('EU Parli', 'F1', 'HSC', 'UNESCO', 'UNICEF')
  );

  DELETE FROM public.allocations
  WHERE conference_id IN (
    SELECT id
    FROM public.conferences
    WHERE event_id = v_event_id
      AND trim(coalesce(committee, '')) IN ('EU Parli', 'F1', 'HSC', 'UNESCO', 'UNICEF')
  );

  DELETE FROM public.conferences
  WHERE event_id = v_event_id
    AND trim(coalesce(committee, '')) IN ('EU Parli', 'F1', 'HSC', 'UNESCO', 'UNICEF');
END $$;
