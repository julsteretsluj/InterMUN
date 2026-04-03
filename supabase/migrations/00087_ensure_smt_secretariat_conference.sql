-- One SMT / secretariat sheet per event (second gate SMT227). New events created via
-- create_event_and_committee_as_staff do not get this row; allocation matrix expects it.

CREATE OR REPLACE FUNCTION public.ensure_smt_secretariat_conference_for_event(p_event_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.conference_events e WHERE e.id = p_event_id) THEN
    RAISE EXCEPTION 'event not found';
  END IF;

  SELECT c.id
  INTO v_id
  FROM public.conferences c
  WHERE c.event_id = p_event_id
    AND (
      upper(trim(COALESCE(c.committee_code, ''))) = 'SMT227'
      OR upper(trim(COALESCE(c.committee_code, ''))) = 'SECRETARIAT2027'
      OR lower(trim(COALESCE(c.committee, ''))) = 'smt'
    )
  ORDER BY c.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.conferences (
    event_id,
    name,
    committee,
    committee_code,
    room_code,
    created_at
  )
  VALUES (
    p_event_id,
    'Secretariat oversight',
    'SMT',
    'SMT227',
    'SMT227',
    now()
  )
  RETURNING id INTO v_id;

  INSERT INTO public.timers (conference_id)
  SELECT v_id
  WHERE NOT EXISTS (SELECT 1 FROM public.timers t WHERE t.conference_id = v_id);

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_smt_secretariat_conference_for_event(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_smt_secretariat_conference_for_event(uuid) TO authenticated;
