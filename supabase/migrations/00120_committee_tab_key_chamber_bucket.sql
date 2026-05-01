-- Align DB committee_tab_key* with lib/conference-committee-canonical.ts:
-- bucket by chamber label (committee) with alias normalization so ECOSOC / Economic and Social Council match.
-- RLS on profiles + committee_synced_state must use the same key as the app.

BEGIN;

CREATE OR REPLACE FUNCTION public.committee_tab_key_normalize_committee(p_committee text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  WITH x AS (
    SELECT trim(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(btrim(coalesce(p_committee, ''))), '\s*&\s*', ' and ', 'g'),
          '\([^)]*\)',
          '',
          'g'
        ),
        '\s+',
        ' ',
        'g'
      )
    ) AS s
  )
  SELECT CASE (SELECT s FROM x)
    WHEN 'economic and social council' THEN 'ecosoc'
    WHEN 'un ecosoc' THEN 'ecosoc'
    WHEN 'disarmament and international security committee' THEN 'disec'
    WHEN 'united nations security council' THEN 'unsc'
    WHEN 'security council' THEN 'unsc'
    WHEN 'united nations human rights council' THEN 'unhrc'
    WHEN 'human rights council' THEN 'unhrc'
    WHEN 'world health organization' THEN 'who'
    WHEN 'united nations office on drugs and crime' THEN 'unodc'
    WHEN 'un women' THEN 'un women'
    WHEN 'unwomen' THEN 'un women'
    WHEN 'eu parliament' THEN 'eu parli'
    ELSE (SELECT s FROM x)
  END;
$$;

CREATE OR REPLACE FUNCTION public.committee_tab_key(c public.conferences)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN COALESCE(trim(c.committee), '') <> '' THEN 'c:' || public.committee_tab_key_normalize_committee(c.committee)
    WHEN COALESCE(trim(c.name), '') <> '' THEN 'n:' || lower(trim(c.name))
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
    WHEN p_committee IS NOT NULL AND btrim(p_committee) <> '' THEN 'c:' || public.committee_tab_key_normalize_committee(p_committee)
    WHEN p_name IS NOT NULL AND btrim(p_name) <> '' THEN 'n:' || lower(btrim(p_name))
    ELSE 'id:' || p_id::text
  END;
$$;

COMMENT ON FUNCTION public.committee_tab_key(public.conferences) IS
  'Matches lib/conference-committee-canonical.ts committeeTabKey for committee-scoped peer access.';

COMMIT;
