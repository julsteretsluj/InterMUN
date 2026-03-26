-- Optional display metadata for committee cards (SMT overview): full official name, chair list.

ALTER TABLE public.conferences
  ADD COLUMN IF NOT EXISTS committee_full_name text,
  ADD COLUMN IF NOT EXISTS chair_names text;

COMMENT ON COLUMN public.conferences.committee_full_name IS 'Official / long committee name for display (acronym stays in committee).';
COMMENT ON COLUMN public.conferences.chair_names IS 'Comma-separated dais chair names for SMT overview.';

DROP FUNCTION IF EXISTS public.update_committee_session_smt(uuid, text, text, text, text);

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
    room_code = v_cc,
    committee_full_name = NULLIF(trim(p_committee_full_name), ''),
    chair_names = NULLIF(trim(p_chair_names), '')
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_committee_session_smt(uuid, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_committee_session_smt(uuid, text, text, text, text, text, text) TO authenticated;
