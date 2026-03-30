-- Third gate: per-allocation placard codes (allocation_gate_codes). One verified account per seat.

BEGIN;

ALTER TABLE public.conferences
  ADD COLUMN IF NOT EXISTS allocation_code_gate_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.conferences.allocation_code_gate_enabled IS
  'When true, delegates and chairs must enter their seat placard code after committee sign-in.';

CREATE TABLE public.allocation_code_gate_claims (
  allocation_id uuid PRIMARY KEY REFERENCES public.allocations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX allocation_code_gate_claims_user_id_idx
  ON public.allocation_code_gate_claims (user_id);

COMMENT ON TABLE public.allocation_code_gate_claims IS
  'First successful placard-code verification per allocation; cleared on seat reassignment or code change.';

ALTER TABLE public.allocation_code_gate_claims ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.clear_allocation_code_claim_on_allocation_user_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    DELETE FROM public.allocation_code_gate_claims WHERE allocation_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_allocations_clear_code_claim ON public.allocations;
CREATE TRIGGER tr_allocations_clear_code_claim
  AFTER UPDATE OF user_id ON public.allocations
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_allocation_code_claim_on_allocation_user_change();

CREATE OR REPLACE FUNCTION public.clear_allocation_code_claim_on_gate_code_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.code IS DISTINCT FROM OLD.code
    OR (NEW.code IS NULL) IS DISTINCT FROM (OLD.code IS NULL)
  ) THEN
    DELETE FROM public.allocation_code_gate_claims WHERE allocation_id = NEW.allocation_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_allocation_gate_codes_clear_claim ON public.allocation_gate_codes;
CREATE TRIGGER tr_allocation_gate_codes_clear_claim
  AFTER UPDATE OF code ON public.allocation_gate_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_allocation_code_claim_on_gate_code_change();

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

  IF btrim(v_stored) <> btrim(coalesce(p_code, '')) THEN
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

REVOKE ALL ON FUNCTION public.claim_allocation_code_gate(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_allocation_code_gate(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_allocation_code_gate_enabled(p_conference_id uuid, p_enabled boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = v_uid;
  IF v_role NOT IN ('chair', 'smt', 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_role = 'chair' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.allocations a
      WHERE a.conference_id = p_conference_id AND a.user_id = v_uid
    ) THEN
      RAISE EXCEPTION 'you can only change this for committees where you have a seat';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.conferences c WHERE c.id = p_conference_id) THEN
    RAISE EXCEPTION 'committee not found';
  END IF;

  UPDATE public.conferences
  SET allocation_code_gate_enabled = coalesce(p_enabled, false)
  WHERE id = p_conference_id;

  IF NOT coalesce(p_enabled, false) THEN
    DELETE FROM public.allocation_code_gate_claims c
    USING public.allocations a
    WHERE c.allocation_id = a.id AND a.conference_id = p_conference_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.set_allocation_code_gate_enabled(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_allocation_code_gate_enabled(uuid, boolean) TO authenticated;

COMMIT;
