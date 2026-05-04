-- Roster / migration used dominicstott09@gmail.com; Dominic's actual login is dominicstott16@gmail.com.

DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE lower(btrim(email)) = lower(btrim('dominicstott16@gmail.com'))
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE NOTICE '00138: no auth.users row for dominicstott16@gmail.com; skipping';
    RETURN;
  END IF;

  UPDATE public.allocations a
  SET user_id = NULL
  FROM public.conferences c
  WHERE a.conference_id = c.id
    AND a.user_id = v_uid
    AND (
      lower(btrim(c.committee)) = 'smt'
      OR upper(btrim(c.committee_code)) IN ('SMT227', 'SECRETARIAT2027')
    );

  UPDATE public.allocations a
  SET user_id = v_uid
  FROM public.conferences c
  WHERE a.conference_id = c.id
    AND lower(btrim(a.country)) = 'head of delegate affairs'
    AND (
      lower(btrim(c.committee)) = 'smt'
      OR upper(btrim(c.committee_code)) IN ('SMT227', 'SECRETARIAT2027')
    );

  UPDATE public.profiles
  SET
    role = 'smt'::public.user_role,
    allocation = 'Head of Delegate Affairs',
    name = 'Head of Delegate Affairs - Dominic S. S.',
    updated_at = NOW()
  WHERE id = v_uid;
END $$;
