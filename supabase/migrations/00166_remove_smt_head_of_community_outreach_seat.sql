-- "Head of Community Outreach" is retired from the SEAMUN secretariat roster
-- (see lib/seamun-i-2027-secretariat-roster.ts). Remove its dais seat rows from
-- SMT/secretariat conferences. Idempotent.

DELETE FROM public.allocations a
USING public.conferences c
WHERE a.conference_id = c.id
  AND lower(btrim(a.country)) = 'head of community outreach'
  AND (
    lower(btrim(c.committee)) = 'smt'
    OR upper(btrim(c.committee_code)) IN ('SMT227', 'SECRETARIAT2027')
  );
