-- Align public.committee_tab_key with lib/conference-committee-canonical.ts committeeTabKey:
-- bucket duplicate topic rows under one chamber (first segment before " - ") and one SMT secretariat key.

BEGIN;

CREATE OR REPLACE FUNCTION public.committee_session_group_key_from_committee(p_committee text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN p_committee IS NULL THEN NULL::text
    WHEN btrim(p_committee) = '' THEN NULL::text
    WHEN lower(btrim(p_committee)) = 'committee' THEN NULL::text
    ELSE upper(
      btrim(
        CASE
          WHEN btrim(p_committee) ~ '\s*-\s*' THEN (regexp_match(btrim(p_committee), '^(.*?)\s*-\s*'))[1]
          ELSE btrim(p_committee)
        END
      )
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.committee_tab_key(c public.conferences)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN upper(btrim(coalesce(c.committee_code, ''))) IN ('SMT227', 'SECRETARIAT2027')
      OR lower(btrim(coalesce(c.committee, ''))) = 'smt' THEN '__smt_secretariat_sheet__'
    WHEN public.committee_session_group_key_from_committee(nullif(trim(c.committee), '')) IS NOT NULL THEN
      'chamber:' || public.committee_session_group_key_from_committee(nullif(trim(c.committee), ''))
    WHEN coalesce(trim(c.committee), '') <> '' THEN 'c:' || public.committee_tab_key_normalize_committee(c.committee)
    WHEN coalesce(trim(c.committee_code), '') <> '' THEN 'code:' || lower(trim(c.committee_code))
    WHEN coalesce(trim(c.name), '') <> '' THEN 'n:' || lower(trim(c.name))
    ELSE 'id:' || c.id::text
  END;
$$;

CREATE OR REPLACE FUNCTION public.committee_tab_key_sql(
  p_committee text,
  p_name text,
  p_id uuid
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN lower(btrim(coalesce(p_committee, ''))) = 'smt' THEN '__smt_secretariat_sheet__'
    WHEN public.committee_session_group_key_from_committee(nullif(trim(p_committee), '')) IS NOT NULL THEN
      'chamber:' || public.committee_session_group_key_from_committee(nullif(trim(p_committee), ''))
    WHEN p_committee IS NOT NULL AND btrim(p_committee) <> '' THEN 'c:' || public.committee_tab_key_normalize_committee(p_committee)
    WHEN p_name IS NOT NULL AND btrim(p_name) <> '' THEN 'n:' || lower(btrim(p_name))
    ELSE 'id:' || p_id::text
  END;
$$;

COMMENT ON FUNCTION public.committee_tab_key(public.conferences) IS
  'Matches lib/conference-committee-canonical.ts committeeTabKey for committee-scoped peer access.';

DROP POLICY IF EXISTS "committee_synced_state_active_debate_topic_select" ON public.committee_synced_state;

CREATE POLICY "committee_synced_state_active_debate_topic_select"
  ON public.committee_synced_state
  FOR SELECT
  TO authenticated
  USING (
    state_key = 'active_debate_topic'
    AND (
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role::text IN ('chair', 'smt', 'admin')
      )
      OR EXISTS (
        SELECT 1
        FROM public.allocations a
        JOIN public.conferences ca ON ca.id = a.conference_id
        JOIN public.conferences cc ON cc.id = committee_synced_state.conference_id
        WHERE a.user_id = auth.uid()
          AND ca.event_id IS NOT DISTINCT FROM cc.event_id
          AND public.committee_tab_key(ca) = public.committee_tab_key(cc)
      )
    )
  );

COMMIT;
