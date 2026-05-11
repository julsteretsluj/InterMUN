BEGIN;

-- SEAMUN I 2027: schedule is canonical in app code; forbid any DB writes to schedule_config.
CREATE OR REPLACE FUNCTION public.update_event_schedule_config_smt(
  p_event_id uuid,
  p_schedule jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_schedule IS NULL OR jsonb_typeof(p_schedule) <> 'object' THEN
    RAISE EXCEPTION 'schedule must be a json object';
  END IF;

  IF octet_length(p_schedule::text) > 120000 THEN
    RAISE EXCEPTION 'schedule payload too large';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.conference_events e WHERE e.id = p_event_id) THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.conference_events e
    WHERE e.id = p_event_id
      AND (
        e.id = '11111111-1111-1111-1111-111111111101'::uuid
        OR upper(btrim(e.event_code)) = 'SEAMUNI2027'
      )
  ) THEN
    RAISE EXCEPTION 'SEAMUN I 2027 schedule is fixed and cannot be changed';
  END IF;

  UPDATE public.conference_events
  SET schedule_config = p_schedule
  WHERE id = p_event_id;
END;
$$;

COMMIT;
