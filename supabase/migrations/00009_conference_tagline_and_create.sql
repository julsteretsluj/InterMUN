-- Optional subtitle shown under the session title in the app chrome.
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Chairs / SMT: create a new committee session with a unique room code.
CREATE OR REPLACE FUNCTION public.create_conference_as_staff(
  p_name text,
  p_committee text,
  p_tagline text,
  p_room_code text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_norm text;
  v_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('chair', 'smt')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_name := trim(p_name);
  IF length(v_name) < 2 THEN
    RAISE EXCEPTION 'conference title must be at least 2 characters';
  END IF;

  v_norm := NULLIF(upper(trim(p_room_code)), '');
  IF v_norm IS NULL OR length(v_norm) < 4 THEN
    RAISE EXCEPTION 'room code must be at least 4 characters';
  END IF;

  IF EXISTS (SELECT 1 FROM conferences c WHERE c.room_code = v_norm) THEN
    RAISE EXCEPTION 'room code already in use';
  END IF;

  INSERT INTO conferences (name, committee, tagline, room_code)
  VALUES (
    v_name,
    NULLIF(trim(p_committee), ''),
    NULLIF(trim(p_tagline), ''),
    v_norm
  )
  RETURNING id INTO v_id;

  INSERT INTO timers (conference_id) VALUES (v_id);

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_conference_as_staff(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_conference_as_staff(text, text, text, text) TO authenticated;
