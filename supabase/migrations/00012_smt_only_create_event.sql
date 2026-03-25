-- New conference events + first committee: SMT only (chairs use committee codes / Supabase for extra committees).
CREATE OR REPLACE FUNCTION public.create_event_and_committee_as_staff(
  p_event_name text,
  p_event_code text,
  p_session_name text,
  p_committee text,
  p_tagline text,
  p_committee_code text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
  v_conf_id uuid;
  v_ec text;
  v_cc text;
  v_en text;
  v_sn text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'smt'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_en := trim(p_event_name);
  v_sn := trim(p_session_name);
  v_ec := upper(btrim(regexp_replace(p_event_code, '\s+', '', 'g')));
  v_cc := upper(btrim(p_committee_code));

  IF length(v_en) < 2 THEN
    RAISE EXCEPTION 'conference (event) name must be at least 2 characters';
  END IF;
  IF length(v_sn) < 2 THEN
    RAISE EXCEPTION 'committee session title must be at least 2 characters';
  END IF;
  IF v_ec IS NULL OR length(v_ec) < 4 THEN
    RAISE EXCEPTION 'conference code must be at least 4 characters';
  END IF;
  IF v_cc IS NULL OR length(v_cc) < 4 THEN
    RAISE EXCEPTION 'committee code must be at least 4 characters';
  END IF;

  IF EXISTS (SELECT 1 FROM conference_events e WHERE upper(btrim(e.event_code)) = v_ec) THEN
    RAISE EXCEPTION 'conference code already in use';
  END IF;

  INSERT INTO conference_events (name, tagline, event_code)
  VALUES (v_en, NULLIF(trim(p_tagline), ''), v_ec)
  RETURNING id INTO v_event_id;

  INSERT INTO conferences (event_id, name, committee, tagline, room_code, committee_code)
  VALUES (
    v_event_id,
    v_sn,
    NULLIF(trim(p_committee), ''),
    NULLIF(trim(p_tagline), ''),
    v_cc,
    v_cc
  )
  RETURNING id INTO v_conf_id;

  INSERT INTO timers (conference_id) VALUES (v_conf_id);

  RETURN v_conf_id;
END;
$$;
