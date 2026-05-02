-- One second-gate code (committee_code / room_code) per committee chamber within an event:
-- all topic rows that share committee_session_group_key(committee) stay in sync.

CREATE OR REPLACE FUNCTION public.committee_session_group_key(p_committee text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT CASE
    WHEN btrim IS NULL OR length(btrim) = 0 OR lower(btrim) = 'committee' THEN NULL
    WHEN lower(ft) = 'committee' OR length(ft) = 0 THEN NULL
    ELSE upper(ft)
  END
  FROM (
    SELECT
      trim(p_committee) AS btrim,
      trim(split_part(trim(p_committee), '-', 1)) AS ft
  ) s;
$$;

COMMENT ON FUNCTION public.committee_session_group_key(text) IS
  'First token of committee label before " - " (matches lib/committee-session-group.ts); NULL if unusable.';

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
  v_committee text;
  v_group text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT event_id, committee INTO v_event, v_committee
  FROM conferences WHERE id = p_conference_id;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'conference not found';
  END IF;

  v_norm := regexp_replace(upper(btrim(p_room_code)), '[^A-Z0-9]', '', 'g');

  IF v_norm IS NULL OR length(v_norm) <> 6 OR v_norm !~ '^[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'committee code must be exactly 6 letters or digits (e.g. ECO741)';
  END IF;

  v_group := public.committee_session_group_key(v_committee);

  IF v_group IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM conferences c
      WHERE c.event_id = v_event
        AND c.id <> p_conference_id
        AND upper(btrim(coalesce(c.committee_code, ''))) = v_norm
    ) THEN
      RAISE EXCEPTION 'committee code already in use for this conference';
    END IF;

    UPDATE conferences
    SET room_code = v_norm, committee_code = v_norm
    WHERE id = p_conference_id;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM conferences c
    WHERE c.event_id = v_event
      AND upper(btrim(coalesce(c.committee_code, ''))) = v_norm
      AND public.committee_session_group_key(c.committee) IS DISTINCT FROM v_group
  ) THEN
    RAISE EXCEPTION 'committee code already in use for this conference';
  END IF;

  UPDATE conferences
  SET room_code = v_norm, committee_code = v_norm
  WHERE event_id = v_event
    AND (
      id = p_conference_id
      OR public.committee_session_group_key(committee) = v_group
    );
END;
$$;

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
  v_new_group text;
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

  v_new_group := public.committee_session_group_key(NULLIF(trim(p_committee), ''));

  IF v_new_group IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM conferences c
      WHERE c.event_id = v_event
        AND c.id <> p_id
        AND upper(btrim(coalesce(c.committee_code, ''))) = v_cc
    ) THEN
      RAISE EXCEPTION 'committee code already in use for this conference';
    END IF;

    UPDATE conferences
    SET committee_code = v_cc, room_code = v_cc
    WHERE id = p_id;
  ELSE
    IF EXISTS (
      SELECT 1 FROM conferences c
      WHERE c.event_id = v_event
        AND upper(btrim(coalesce(c.committee_code, ''))) = v_cc
        AND NOT (
          c.id = p_id
          OR public.committee_session_group_key(c.committee) = v_new_group
        )
    ) THEN
      RAISE EXCEPTION 'committee code already in use for this conference';
    END IF;

    UPDATE conferences
    SET committee_code = v_cc, room_code = v_cc
    WHERE event_id = v_event
      AND (
        id = p_id
        OR public.committee_session_group_key(committee) = v_new_group
      );
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

-- Backfill: within each (event_id, chamber group), use one deterministic code (MIN) for all topic rows.
WITH canon AS (
  SELECT
    id,
    MIN(NULLIF(upper(btrim(committee_code)), '')) OVER (
      PARTITION BY event_id, public.committee_session_group_key(committee)
    ) AS code
  FROM public.conferences
  WHERE public.committee_session_group_key(committee) IS NOT NULL
)
UPDATE public.conferences conf
SET
  committee_code = canon.code,
  room_code = canon.code
FROM canon
WHERE conf.id = canon.id
  AND canon.code IS NOT NULL
  AND (
    upper(btrim(coalesce(conf.committee_code, ''))) IS DISTINCT FROM canon.code
    OR upper(btrim(coalesce(conf.room_code, ''))) IS DISTINCT FROM canon.code
  );
