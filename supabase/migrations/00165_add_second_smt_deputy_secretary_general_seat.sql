-- Add a second "Deputy Secretary General" dais seat to SMT/secretariat conferences.
-- Source of truth: lib/seamun-i-2027-secretariat-roster.ts (two DSG + three Parliamentarian
-- seats share the same role label). Idempotent: only tops up to two DSG rows per conference,
-- and the runtime ensureDaisSeatAllocations() will keep it in sync afterwards.

DO $$
DECLARE
  rec RECORD;
  v_have integer;
  i integer;
BEGIN
  FOR rec IN
    SELECT c.id
    FROM public.conferences c
    WHERE lower(btrim(c.committee)) = 'smt'
      OR upper(btrim(c.committee_code)) IN ('SMT227', 'SECRETARIAT2027')
  LOOP
    SELECT count(*) INTO v_have
    FROM public.allocations a
    WHERE a.conference_id = rec.id
      AND lower(btrim(a.country)) = 'deputy secretary general';

    IF v_have < 2 THEN
      FOR i IN 1..(2 - v_have) LOOP
        INSERT INTO public.allocations (conference_id, country, user_id)
        VALUES (rec.id, 'Deputy Secretary General', NULL);
      END LOOP;
    END IF;
  END LOOP;
END $$;
