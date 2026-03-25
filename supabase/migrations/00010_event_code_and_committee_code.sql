-- First gate: conference event code (e.g. SEAMUNI2027). Second gate: committee code within that event (e.g. ECOSOC@SEAMUN).

CREATE TABLE conference_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tagline TEXT,
  event_code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_conference_events_event_code_norm
  ON conference_events (upper(btrim(event_code)));

ALTER TABLE conference_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conference_events_select_auth" ON conference_events FOR SELECT TO authenticated USING (true);

ALTER TABLE conferences
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES conference_events(id) ON DELETE CASCADE;
ALTER TABLE conferences
  ADD COLUMN IF NOT EXISTS committee_code TEXT;

-- Default event for existing committee rows (fixed id for seeds / SQL scripts)
INSERT INTO conference_events (id, name, tagline, event_code)
VALUES (
  '11111111-1111-1111-1111-111111111101',
  'SEAMUN I 2027',
  NULL,
  'SEAMUNI2027'
);

UPDATE conferences
SET event_id = '11111111-1111-1111-1111-111111111101'
WHERE event_id IS NULL;

UPDATE conferences
SET committee_code = upper(btrim(regexp_replace(room_code, '\s+', '', 'g')))
WHERE committee_code IS NULL
  AND room_code IS NOT NULL
  AND btrim(room_code) <> '';

UPDATE conferences
SET committee_code = 'LEGACY-' || replace(id::text, '-', '')
WHERE committee_code IS NULL OR btrim(committee_code) = '';

ALTER TABLE conferences ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE conferences ALTER COLUMN committee_code SET NOT NULL;

DROP INDEX IF EXISTS idx_conferences_room_code_unique;

-- Normalize stored codes (single-line, trimmed) before unique constraint
UPDATE conferences
SET committee_code = upper(btrim(committee_code)),
    room_code = CASE
      WHEN room_code IS NOT NULL THEN upper(btrim(regexp_replace(room_code, '\s+', '', 'g')))
      ELSE NULL
    END;

UPDATE conferences SET room_code = committee_code WHERE room_code IS NULL;

CREATE UNIQUE INDEX idx_conferences_event_committee_code
  ON conferences (event_id, committee_code);

-- Chair tool: set join code (committee_code + room_code) unique within event
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
    WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT event_id INTO v_event FROM conferences WHERE id = p_conference_id;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'conference not found';
  END IF;

  v_norm := NULLIF(upper(btrim(p_room_code)), '');

  IF v_norm IS NOT NULL AND length(v_norm) < 4 THEN
    RAISE EXCEPTION 'committee code must be at least 4 characters';
  END IF;

  IF v_norm IS NOT NULL AND EXISTS (
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

-- Replace single-table create with event + first committee
DROP FUNCTION IF EXISTS public.create_conference_as_staff(text, text, text, text);

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
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('chair', 'smt')
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

REVOKE ALL ON FUNCTION public.create_event_and_committee_as_staff(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_event_and_committee_as_staff(text, text, text, text, text, text) TO authenticated;
