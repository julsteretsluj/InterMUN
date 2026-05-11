BEGIN;

ALTER TABLE public.conference_events
  ADD COLUMN IF NOT EXISTS schedule_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.conference_events.schedule_config IS
  'SMT-edited two-day conference schedule: groups, per-day per-group time blocks, lunch flags for overlap tooling.';

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

  UPDATE public.conference_events
  SET schedule_config = p_schedule
  WHERE id = p_event_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_event_schedule_config_smt(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_event_schedule_config_smt(uuid, jsonb) TO authenticated;

COMMIT;
