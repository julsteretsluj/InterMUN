BEGIN;

ALTER TABLE public.conferences
  ADD COLUMN IF NOT EXISTS procedure_profile text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS eu_guided_workflow_enabled boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'conferences_procedure_profile_check'
      AND conrelid = 'public.conferences'::regclass
  ) THEN
    ALTER TABLE public.conferences
      ADD CONSTRAINT conferences_procedure_profile_check
      CHECK (procedure_profile IN ('default', 'eu_parliament'));
  END IF;
END $$;

COMMENT ON COLUMN public.conferences.procedure_profile IS
  'Procedure ruleset for this committee session. default keeps existing behavior; eu_parliament enables EU RoP workflow.';
COMMENT ON COLUMN public.conferences.eu_guided_workflow_enabled IS
  'When true and procedure_profile is eu_parliament, apply guided workflow constraints in chair controls.';

DROP FUNCTION IF EXISTS public.update_committee_session_smt(uuid, text, text, text, text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.update_committee_session_smt(
  p_id uuid,
  p_name text,
  p_committee text,
  p_tagline text,
  p_committee_code text,
  p_committee_full_name text,
  p_chair_names text,
  p_crisis_slides_url text,
  p_consultation_before_moderated_caucus boolean,
  p_procedure_profile text,
  p_eu_guided_workflow_enabled boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event uuid;
  v_cc text;
  v_profile text;
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

  v_profile := lower(trim(coalesce(p_procedure_profile, 'default')));
  IF v_profile NOT IN ('default', 'eu_parliament') THEN
    RAISE EXCEPTION 'invalid procedure profile';
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
    consultation_before_moderated_caucus = p_consultation_before_moderated_caucus,
    procedure_profile = v_profile,
    eu_guided_workflow_enabled = CASE
      WHEN v_profile = 'eu_parliament' THEN coalesce(p_eu_guided_workflow_enabled, true)
      ELSE false
    END
  WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_committee_session_smt(uuid, text, text, text, text, text, text, text, boolean, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_committee_session_smt(uuid, text, text, text, text, text, text, text, boolean, text, boolean) TO authenticated;

COMMIT;
