-- Competing-motions order: default consultation caucus before moderated (handbook-style);
-- conferences may invert via consultation_before_moderated_caucus = false.

BEGIN;

ALTER TABLE public.conferences
  ADD COLUMN IF NOT EXISTS consultation_before_moderated_caucus boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.conferences.consultation_before_moderated_caucus IS
  'When true, consultation outranks moderated caucus in disruptiveness ordering. When false, moderated caucus outranks consultation (alternate RoP).';

DROP FUNCTION IF EXISTS public.update_committee_session_smt(uuid, text, text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION public.update_committee_session_smt(
  p_id uuid,
  p_name text,
  p_committee text,
  p_tagline text,
  p_committee_code text,
  p_committee_full_name text,
  p_chair_names text,
  p_crisis_slides_url text,
  p_consultation_before_moderated_caucus boolean
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
    chair_names = NULLIF(trim(p_chair_names), ''),
    crisis_slides_url = NULLIF(trim(p_crisis_slides_url), ''),
    consultation_before_moderated_caucus = p_consultation_before_moderated_caucus
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_committee_session_smt(uuid, text, text, text, text, text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_committee_session_smt(uuid, text, text, text, text, text, text, text, boolean) TO authenticated;

COMMIT;
