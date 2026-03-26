-- Committee / room second-gate codes: exactly 6 characters [A-Z0-9].
-- Prefix comes from chamber label + 3 digits (app + seeds); secretariat row uses SMT227.

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
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_en := trim(p_event_name);
  v_sn := trim(p_session_name);
  v_ec := upper(btrim(regexp_replace(p_event_code, '\s+', '', 'g')));
  v_cc := regexp_replace(upper(btrim(p_committee_code)), '[^A-Z0-9]', '', 'g');

  IF length(v_en) < 2 THEN
    RAISE EXCEPTION 'conference (event) name must be at least 2 characters';
  END IF;
  IF length(v_sn) < 2 THEN
    RAISE EXCEPTION 'committee session title must be at least 2 characters';
  END IF;
  IF v_ec IS NULL OR length(v_ec) < 4 THEN
    RAISE EXCEPTION 'conference code must be at least 4 characters';
  END IF;
  IF v_cc IS NULL OR length(v_cc) <> 6 OR v_cc !~ '^[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'committee code must be exactly 6 letters or digits (e.g. ECO741)';
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

CREATE OR REPLACE FUNCTION public.update_committee_session_smt(
  p_id uuid,
  p_name text,
  p_committee text,
  p_tagline text,
  p_committee_code text,
  p_committee_full_name text,
  p_chair_names text
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
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT event_id INTO v_event FROM conferences WHERE id = p_id;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'committee not found';
  END IF;

  v_cc := regexp_replace(upper(btrim(p_committee_code)), '[^A-Z0-9]', '', 'g');
  IF v_cc IS NULL OR length(v_cc) <> 6 OR v_cc !~ '^[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'committee code must be exactly 6 letters or digits (e.g. ECO741)';
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
    room_code = v_cc,
    committee_full_name = NULLIF(trim(p_committee_full_name), ''),
    chair_names = NULLIF(trim(p_chair_names), '')
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_conference_room_code(
  p_conference_id uuid,
  p_room_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
  v_event uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT event_id INTO v_event FROM conferences WHERE id = p_conference_id;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'conference not found';
  END IF;

  v_norm := regexp_replace(upper(btrim(p_room_code)), '[^A-Z0-9]', '', 'g');

  IF v_norm IS NULL OR length(v_norm) <> 6 OR v_norm !~ '^[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'committee code must be exactly 6 letters or digits (e.g. ECO741)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM conferences c
    WHERE c.event_id = v_event
      AND upper(btrim(c.committee_code)) = v_norm
      AND c.id <> p_conference_id
  ) THEN
    RAISE EXCEPTION 'committee code already in use for this conference';
  END IF;

  UPDATE conferences
  SET room_code = v_norm, committee_code = v_norm
  WHERE id = p_conference_id;
END;
$$;

-- Canonical SEAMUN seed rows: deterministic prefix + 3 digits from conference id (matches lib/committee-join-code.ts).
UPDATE conferences SET committee_code = 'POL038', room_code = 'POL038' WHERE id = '00000000-0000-0000-0000-000000000001';
UPDATE conferences SET committee_code = 'SMT227', room_code = 'SMT227' WHERE id = '22222222-2222-2222-2222-222222222202';
UPDATE conferences SET committee_code = 'ECO741', room_code = 'ECO741' WHERE id = 'a980d7fa-87ce-5580-90b8-a64c4d3d10bd';
UPDATE conferences SET committee_code = 'FWC131', room_code = 'FWC131' WHERE id = '5431097e-900f-5c50-8342-a6a6d74bef7b';
UPDATE conferences SET committee_code = 'PRE784', room_code = 'PRE784' WHERE id = '62f2c3c3-82bc-55fd-881a-51311134f6ef';
UPDATE conferences SET committee_code = 'DIS795', room_code = 'DIS795' WHERE id = '98eec0b3-495d-51c1-af6e-8ac229fc1169';
UPDATE conferences SET committee_code = 'UNS022', room_code = 'UNS022' WHERE id = 'b9c8aac0-8197-50b5-bb26-7b0dda078396';
UPDATE conferences SET committee_code = 'INT992', room_code = 'INT992' WHERE id = 'a99d0809-d35c-511a-8e72-418c8ddd3d76';
UPDATE conferences SET committee_code = 'UNH905', room_code = 'UNH905' WHERE id = '9e71e587-b647-527e-a6f5-36db8c2e557c';
UPDATE conferences SET committee_code = 'UNW231', room_code = 'UNW231' WHERE id = '28345b10-ae9c-5f4b-bedb-9e60b4928e83';
UPDATE conferences SET committee_code = 'UNO129', room_code = 'UNO129' WHERE id = '14186852-e855-5f07-82d3-aaa5762aea32';
UPDATE conferences SET committee_code = 'WHO582', room_code = 'WHO582' WHERE id = '74f36b68-4b60-5b46-b766-623afeb2c377';
