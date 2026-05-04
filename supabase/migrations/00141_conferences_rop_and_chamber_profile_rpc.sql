-- RoP document link per committee session row; chamber-level SMT profile RPC.

ALTER TABLE public.conferences
  ADD COLUMN IF NOT EXISTS rop_document_url text;

COMMENT ON COLUMN public.conferences.rop_document_url IS
  'Optional link to rules of procedure (document or site) for this committee session.';

CREATE OR REPLACE FUNCTION public.update_chamber_committee_profile_smt(
  p_anchor_id uuid,
  p_committee text,
  p_committee_full_name text,
  p_topic1 text,
  p_topic2 text,
  p_rop_document_url text,
  p_committee_code text,
  p_procedure_profile text,
  p_consultation_before_moderated_caucus boolean,
  p_eu_guided_workflow_enabled boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event uuid;
  v_old_committee text;
  v_old_group text;
  v_cc text;
  v_profile text;
  v_ids uuid[];
  v_name1 text;
  v_name2 text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT event_id, committee INTO v_event, v_old_committee
  FROM conferences WHERE id = p_anchor_id;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'committee not found';
  END IF;

  v_name1 := trim(p_topic1);
  IF v_name1 IS NULL OR length(v_name1) < 2 THEN
    RAISE EXCEPTION 'topic 1 title must be at least 2 characters';
  END IF;

  v_old_group := public.committee_session_group_key(NULLIF(trim(v_old_committee), ''));
  SELECT coalesce(
    array_agg(c.id ORDER BY c.name NULLS LAST, c.id),
    ARRAY[]::uuid[]
  )
  INTO v_ids
  FROM conferences c
  WHERE c.event_id = v_event
    AND (
      (v_old_group IS NOT NULL AND public.committee_session_group_key(c.committee) = v_old_group)
      OR (v_old_group IS NULL AND c.id = p_anchor_id)
    );

  IF v_ids IS NULL OR cardinality(v_ids) < 1 THEN
    RAISE EXCEPTION 'no conference rows in chamber';
  END IF;

  v_cc := regexp_replace(upper(btrim(p_committee_code)), '[^A-Z0-9]', '', 'g');
  IF v_cc IS NULL OR length(v_cc) <> 6 OR v_cc !~ '^[A-Z0-9]{6}$' THEN
    RAISE EXCEPTION 'committee code must be exactly 6 letters or digits (e.g. ECO741)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM conferences c
    WHERE c.event_id = v_event
      AND NOT (c.id = ANY (v_ids))
      AND upper(btrim(coalesce(c.committee_code, ''))) = v_cc
  ) THEN
    RAISE EXCEPTION 'committee code already in use for this conference';
  END IF;

  v_profile := lower(trim(coalesce(p_procedure_profile, 'default')));
  IF v_profile NOT IN ('default', 'eu_parliament') THEN
    RAISE EXCEPTION 'invalid procedure profile';
  END IF;

  UPDATE public.conferences c
  SET committee_code = v_cc, room_code = v_cc
  WHERE c.id = ANY (v_ids);

  UPDATE public.conferences c
  SET
    committee = NULLIF(trim(p_committee), ''),
    committee_full_name = NULLIF(trim(p_committee_full_name), ''),
    rop_document_url = NULLIF(trim(p_rop_document_url), ''),
    tagline = NULL,
    chair_names = NULL,
    crisis_slides_url = NULL,
    consultation_before_moderated_caucus = p_consultation_before_moderated_caucus,
    procedure_profile = v_profile,
    eu_guided_workflow_enabled = CASE
      WHEN v_profile = 'eu_parliament' THEN coalesce(p_eu_guided_workflow_enabled, true)
      ELSE false
    END
  WHERE c.id = ANY (v_ids);

  UPDATE public.conferences SET name = v_name1 WHERE id = v_ids[1];

  IF cardinality(v_ids) >= 2 THEN
    v_name2 := nullif(trim(p_topic2), '');
    IF v_name2 IS NOT NULL AND length(v_name2) >= 2 THEN
      UPDATE public.conferences SET name = v_name2 WHERE id = v_ids[2];
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_chamber_committee_profile_smt(
  uuid, text, text, text, text, text, text, text, boolean, boolean
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_chamber_committee_profile_smt(
  uuid, text, text, text, text, text, text, text, boolean, boolean
) TO authenticated;

CREATE OR REPLACE FUNCTION public.add_chamber_second_topic_smt(p_anchor_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event uuid;
  v_old_committee text;
  v_old_group text;
  v_cnt int;
  v_new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text IN ('smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT event_id, committee INTO v_event, v_old_committee
  FROM conferences WHERE id = p_anchor_id;
  IF v_event IS NULL THEN
    RAISE EXCEPTION 'committee not found';
  END IF;

  v_old_group := public.committee_session_group_key(NULLIF(trim(v_old_committee), ''));
  SELECT count(*)::int INTO v_cnt
  FROM conferences c
  WHERE c.event_id = v_event
    AND (
      (v_old_group IS NOT NULL AND public.committee_session_group_key(c.committee) = v_old_group)
      OR (v_old_group IS NULL AND c.id = p_anchor_id)
    );

  IF v_cnt >= 2 THEN
    RAISE EXCEPTION 'this chamber already has two topic rows';
  END IF;

  v_new_id := gen_random_uuid();

  INSERT INTO conferences (
    id,
    event_id,
    name,
    committee,
    tagline,
    room_code,
    committee_code,
    committee_full_name,
    chair_names,
    committee_logo_url,
    crisis_slides_url,
    consultation_before_moderated_caucus,
    procedure_profile,
    eu_guided_workflow_enabled,
    rop_document_url,
    committee_password_hash,
    allocation_code_gate_enabled
  )
  SELECT
    v_new_id,
    c.event_id,
    'New agenda topic',
    c.committee,
    NULL,
    c.room_code,
    c.committee_code,
    c.committee_full_name,
    NULL,
    c.committee_logo_url,
    NULL,
    coalesce(c.consultation_before_moderated_caucus, true),
    c.procedure_profile,
    c.eu_guided_workflow_enabled,
    c.rop_document_url,
    NULL,
    coalesce(c.allocation_code_gate_enabled, false)
  FROM conferences c
  WHERE c.id = p_anchor_id;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_chamber_second_topic_smt(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_chamber_second_topic_smt(uuid) TO authenticated;
