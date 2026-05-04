-- When two secretariat conferences exist for one event (seed + ensure_smt RPC),
-- roster links may live on the non-canonical row. Copy user_id onto the canonical
-- sheet so the allocation matrix shows everyone on one conference.

BEGIN;

WITH smt_conf AS (
  SELECT c.id, c.event_id
  FROM public.conferences c
  WHERE lower(btrim(c.committee)) = 'smt'
    OR upper(btrim(c.committee_code)) IN ('SMT227', 'SECRETARIAT2027')
),
linked AS (
  SELECT a.conference_id, COUNT(*) FILTER (WHERE a.user_id IS NOT NULL)::int AS n
  FROM public.allocations a
  INNER JOIN smt_conf s ON s.id = a.conference_id
  GROUP BY a.conference_id
),
ranked_canon AS (
  SELECT DISTINCT ON (s.event_id)
    s.event_id,
    s.id AS canon_id
  FROM smt_conf s
  LEFT JOIN linked l ON l.conference_id = s.id
  ORDER BY
    s.event_id,
    CASE WHEN s.id = '22222222-2222-2222-2222-222222222202'::uuid THEN 0 ELSE 1 END,
    COALESCE(l.n, 0) DESC,
    s.id
),
pairs AS (
  SELECT s.id AS dup_id, r.canon_id
  FROM smt_conf s
  INNER JOIN ranked_canon r ON r.event_id = s.event_id AND r.canon_id <> s.id
),
alloc_nr AS (
  SELECT
    id,
    conference_id,
    lower(btrim(country)) AS lc,
    row_number() OVER (
      PARTITION BY conference_id, lower(btrim(country))
      ORDER BY id
    ) AS rn
  FROM public.allocations
)
UPDATE public.allocations ac
SET user_id = ad.user_id
FROM pairs p
JOIN alloc_nr ac_nr ON ac_nr.conference_id = p.canon_id
JOIN alloc_nr ad_nr ON ad_nr.conference_id = p.dup_id
  AND ac_nr.lc = ad_nr.lc
  AND ac_nr.rn = ad_nr.rn
JOIN public.allocations ad ON ad.id = ad_nr.id
WHERE ac.id = ac_nr.id
  AND ac.user_id IS NULL
  AND ad.user_id IS NOT NULL;

UPDATE public.profiles p
SET
  role = 'smt'::public.user_role,
  updated_at = NOW()
WHERE p.role = 'delegate'::public.user_role
  AND EXISTS (
    SELECT 1
    FROM public.allocations a
    INNER JOIN public.conferences c ON c.id = a.conference_id
    WHERE a.user_id = p.id
      AND (
        lower(btrim(c.committee)) = 'smt'
        OR upper(btrim(c.committee_code)) IN ('SMT227', 'SECRETARIAT2027')
      )
  );

COMMIT;
