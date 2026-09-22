-- Press Corps RoP: dedicated procedure_profile + bind SEAMUN Press Corps chambers.

ALTER TABLE public.conferences
  DROP CONSTRAINT IF EXISTS conferences_procedure_profile_check;

ALTER TABLE public.conferences
  ADD CONSTRAINT conferences_procedure_profile_check
  CHECK (procedure_profile IN ('default', 'eu_parliament', 'press_corps'));

COMMENT ON COLUMN public.conferences.procedure_profile IS
  'Procedure ruleset: default (GA-style), eu_parliament, or press_corps (SEAMUN Press Corps RoP).';

-- Keep chamber profile RPC in sync with allowed profiles.
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
  IF v_profile NOT IN ('default', 'eu_parliament', 'press_corps') THEN
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
  IF v_profile NOT IN ('default', 'eu_parliament', 'press_corps') THEN
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

-- Apply Press Corps RoP to Press Corps chamber rows only.
UPDATE public.conferences
SET
  procedure_profile = 'press_corps',
  eu_guided_workflow_enabled = false,
  rop_document_url = COALESCE(
    NULLIF(btrim(rop_document_url), ''),
    '/rop/press-corps-seamun-i-2027.pdf'
  )
WHERE
  lower(btrim(coalesce(committee, ''))) LIKE '%press%corp%'
  OR upper(btrim(coalesce(committee_code, ''))) LIKE 'PRE%'
  OR upper(btrim(coalesce(committee_code, ''))) LIKE 'PRS%';

-- Conference guide: Press Corps RoP (readable in Guides; does not change other committees).
INSERT INTO public.guides (slug, title, content)
VALUES (
  'press-corps-rop-seamun-i-2027',
  'Press Corps — SEAMUN I 2027 Rules of Procedure',
  $rop$
# Press Corps Rules of Procedure (SEAMUN I 2027)

Full PDF: [/rop/press-corps-seamun-i-2027.pdf](/rop/press-corps-seamun-i-2027.pdf)

This chamber uses the **Press Corps** procedure profile. Other committees keep the default (or EU) RoP.

## Session flow

1. Roll call (journalists / news outlets)
2. Opening speeches
3. **Repeat:** Assignment → Motions → Motion enacted → Deadline → Review & publishing

Review begins when an article is submitted. Late submissions after the deadline are not considered.

## Allowed motions (Press Corps only)

| Motion | Notes |
| --- | --- |
| Extend opening speech | Extend speaker time |
| Roll call vote | Yes / No / Yes with Rights / No with Rights / Abstain |
| Interviews | Free-roaming interview period; confirm committee with Editors |
| Press conference | Q&A with a nominated/volunteer delegate from another committee |
| Writing time | Stay in-room to draft; may discuss, must not collaborate on the same piece |

### Motion hierarchy (most disruptive first)

1. Interviews  
2. Press conference  
3. Writing time  

Equal disruptiveness: longer total time first.

## Points

- Point of Parliamentary Inquiry  
- Point of Order  
- Point of Personal Privilege  

## Publishing pipeline

1. **Draft** — follow style guides and agency stance  
2. **Editorial review** — Editors edit, fact-check, approve style  
3. **Publication** — digital portals / live feeds (e.g. Press Corps Instagram)

## Assignments

Breaking news / news report · Op-Ed · Investigative / exposure · Visual media · Short-form video

## Verification (SEAMUN test)

**S**ource · **E**vidence · **A**lternative · **M**otive · **U**ncertainty · **N**ew

Separate **fact**, **analysis**, and **opinion**. Prefer two independent sources for disputed claims. Accuracy over speed.

## Interviews & press conferences

- Do not enter another committee or pull a delegate without Editor/Chair approval.  
- Interview motion example: `Motion for a 20 minute interview period for completing the [assignment].`  
- Press conference example: `Motion for a Press Conference with a [committee] delegate.`

## Conduct (shared conference standards)

Professional respect, English in formal session, note-passing via InterMUN, warnings/strikes disciplinary ladder, no AI-generated speeches during conference, position papers required for awards, diplomatic consistency with assigned outlet stance.
$rop$
)
ON CONFLICT (slug) DO UPDATE
SET
  title = EXCLUDED.title,
  content = EXCLUDED.content;
