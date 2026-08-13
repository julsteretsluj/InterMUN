-- Store placard codes as ECO-001 (not SEAMUN-2027-ECO-001).
-- Printed full codes still verify: claim_allocation_code_gate ignores the event prefix.

BEGIN;

UPDATE public.allocation_gate_codes
SET code = regexp_replace(code, '^SEAMUN-[0-9]{4}-', '', 'i'),
    updated_at = NOW()
WHERE code ~* '^SEAMUN-[0-9]{4}-';

-- UNSC Head Chair used UNS-008; Latvia is the delegate seat for UNS-008.
UPDATE public.allocation_gate_codes g
SET code = 'DAIS-09',
    updated_at = NOW()
FROM public.allocations a
WHERE g.allocation_id = a.id
  AND a.conference_id = 'e2b02bf8-bd34-5fce-a231-318de3f818b2'
  AND lower(btrim(a.country)) = 'head chair';

CREATE OR REPLACE FUNCTION public.claim_allocation_code_gate(p_conference_id uuid, p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_gate boolean;
  v_alloc uuid;
  v_stored text;
  v_claim uuid;
  v_stored_key text;
  v_entered_key text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = v_uid;
  IF v_role IS NULL OR v_role NOT IN ('delegate', 'chair') THEN
    RAISE EXCEPTION 'only delegates and chairs can verify placard codes';
  END IF;

  SELECT c.allocation_code_gate_enabled INTO v_gate
  FROM public.conferences c
  WHERE c.id = p_conference_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'committee not found';
  END IF;

  IF NOT coalesce(v_gate, false) THEN
    RAISE EXCEPTION 'placard code gate is not enabled for this committee';
  END IF;

  SELECT a.id INTO v_alloc
  FROM public.allocations a
  WHERE a.conference_id = p_conference_id AND a.user_id = v_uid
  LIMIT 1;

  IF v_alloc IS NULL THEN
    RAISE EXCEPTION 'you have no allocation for this committee';
  END IF;

  SELECT agc.code INTO v_stored
  FROM public.allocation_gate_codes agc
  WHERE agc.allocation_id = v_alloc;

  IF v_stored IS NULL OR btrim(v_stored) = '' THEN
    RAISE EXCEPTION 'your seat does not have a placard code yet — ask your chair (Sign-in passwords)';
  END IF;

  v_stored_key := upper(regexp_replace(btrim(v_stored), '^SEAMUN-[0-9]{4}-', '', 'i'));
  v_entered_key := upper(regexp_replace(btrim(coalesce(p_code, '')), '^SEAMUN-[0-9]{4}-', '', 'i'));

  IF v_stored_key <> v_entered_key THEN
    RAISE EXCEPTION 'incorrect placard code';
  END IF;

  SELECT c.user_id INTO v_claim
  FROM public.allocation_code_gate_claims c
  WHERE c.allocation_id = v_alloc
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.allocation_code_gate_claims (allocation_id, user_id)
    VALUES (v_alloc, v_uid);
    RETURN;
  END IF;

  IF v_claim IS NOT NULL AND v_claim <> v_uid THEN
    RAISE EXCEPTION 'this seat''s code is already verified by another account — use that account or ask SMT to reassign the seat';
  END IF;

  UPDATE public.allocation_code_gate_claims
  SET verified_at = now()
  WHERE allocation_id = v_alloc;
END;
$$;

ALTER FUNCTION public.claim_allocation_code_gate(uuid, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.claim_allocation_code_gate(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_allocation_code_gate(uuid, text) TO authenticated;

COMMIT;
