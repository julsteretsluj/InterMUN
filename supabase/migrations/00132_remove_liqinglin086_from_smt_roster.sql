-- Remove Deputy Head of Logistics roster entry (email no longer used).

DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE lower(btrim(email)) = lower(trim('liqinglin086@gmail.com'))
  LIMIT 1;

  IF v_uid IS NULL THEN
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

  UPDATE public.profiles
  SET
    role = 'delegate'::public.user_role,
    name = CASE
      WHEN name = 'Deputy Head of Logistics - Alisa' THEN NULL
      ELSE name
    END,
    allocation = NULL,
    updated_at = NOW()
  WHERE id = v_uid;
END $$;
