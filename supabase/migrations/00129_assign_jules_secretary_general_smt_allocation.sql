-- Link Secretary General seat on the SMT / secretariat sheet to juleskittoastrop@gmail.com.
-- Respects allocations (conference_id, user_id) uniqueness by clearing other SMT seats for this user first.

DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim('juleskittoastrop@gmail.com'))
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE NOTICE '00129: no auth.users row for juleskittoastrop@gmail.com; skipping';
    RETURN;
  END IF;

  UPDATE public.allocations a
  SET user_id = NULL
  FROM public.conferences c
  WHERE a.conference_id = c.id
    AND a.user_id = v_uid
    AND (
      lower(trim(c.committee)) = 'smt'
      OR upper(trim(c.committee_code)) IN ('SMT227', 'SECRETARIAT2027')
    );

  UPDATE public.allocations a
  SET user_id = v_uid
  FROM public.conferences c
  WHERE a.conference_id = c.id
    AND lower(trim(a.country)) = 'secretary general'
    AND (
      lower(trim(c.committee)) = 'smt'
      OR upper(trim(c.committee_code)) IN ('SMT227', 'SECRETARIAT2027')
    );

  UPDATE public.profiles
  SET
    role = 'smt'::public.user_role,
    allocation = 'Secretary General',
    updated_at = NOW()
  WHERE id = v_uid;
END $$;
