-- SMT: edit conference event and committee session metadata (codes must stay unique).

CREATE OR REPLACE FUNCTION public.update_conference_event_smt(
  p_id uuid,
  p_name text,
  p_tagline text,
  p_event_code text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'smt'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_code := upper(btrim(regexp_replace(p_event_code, '\s+', '', 'g')));
  IF v_code IS NULL OR length(v_code) < 4 THEN
    RAISE EXCEPTION 'conference code must be at least 4 characters';
  END IF;

  IF EXISTS (
    SELECT 1 FROM conference_events e
    WHERE upper(btrim(e.event_code)) = v_code AND e.id <> p_id
  ) THEN
    RAISE EXCEPTION 'conference code already in use';
  END IF;

  UPDATE conference_events
  SET
    name = trim(p_name),
    tagline = NULLIF(trim(p_tagline), ''),
    event_code = v_code
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_conference_event_smt(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_conference_event_smt(uuid, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_committee_session_smt(
  p_id uuid,
  p_name text,
  p_committee text,
  p_tagline text,
  p_committee_code text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event uuid;
  v_cc text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'smt'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT event_id INTO v_event FROM conferences WHERE id = p_id;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'committee not found';
  END IF;

  v_cc := upper(btrim(p_committee_code));
  IF v_cc IS NULL OR length(v_cc) < 4 THEN
    RAISE EXCEPTION 'committee code must be at least 4 characters';
  END IF;

  IF EXISTS (
    SELECT 1 FROM conferences c
    WHERE c.event_id = v_event
      AND upper(btrim(c.committee_code)) = v_cc
      AND c.id <> p_id
  ) THEN
    RAISE EXCEPTION 'committee code already in use for this conference';
  END IF;

  UPDATE conferences
  SET
    name = trim(p_name),
    committee = NULLIF(trim(p_committee), ''),
    tagline = NULLIF(trim(p_tagline), ''),
    committee_code = v_cc,
    room_code = v_cc
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_committee_session_smt(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_committee_session_smt(uuid, text, text, text, text) TO authenticated;
