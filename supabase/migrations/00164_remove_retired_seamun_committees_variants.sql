-- Remove any remaining retired SEAMUN I 2027 chambers (incl. label variants).

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

  DELETE FROM public.conferences
  WHERE event_id = v_event_id
    AND (
      trim(coalesce(committee, '')) IN ('EU Parli', 'F1', 'HSC', 'UNESCO', 'UNICEF')
      OR trim(coalesce(committee, '')) ILIKE 'EU Parli%'
      OR trim(coalesce(committee, '')) ILIKE 'EU Parliament%'
      OR upper(trim(coalesce(committee_code, ''))) LIKE 'EUP%'
      OR upper(trim(coalesce(committee, ''))) IN ('F1', 'HSC', 'UNESCO', 'UNICEF')
    );
END $$;
