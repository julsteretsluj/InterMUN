DO $$
DECLARE
  v_email text := 'jules.ktoast@gmail.com';
  v_uid uuid;
  v_conf_id uuid;
  v_alloc_id uuid;
  v_country text;
BEGIN
  SELECT id INTO v_uid
  FROM auth.users
  WHERE lower(trim(email)) = lower(trim(v_email))
  LIMIT 1;

  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No auth user found for email: %', v_email;
  END IF;

  UPDATE public.profiles
  SET role = 'chair'::public.user_role,
      updated_at = NOW()
  WHERE id = v_uid;

  SELECT id INTO v_conf_id
  FROM public.conferences
  WHERE upper(trim(COALESCE(committee_code, ''))) = 'DIS676'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_conf_id IS NULL THEN
    RAISE EXCEPTION 'No conference found for committee_code DIS676';
  END IF;

  -- Find an open allocation row in this committee.
  SELECT id, country INTO v_alloc_id, v_country
  FROM public.allocations
  WHERE conference_id = v_conf_id
    AND user_id IS NULL
  ORDER BY country ASC
  LIMIT 1;

  IF v_alloc_id IS NULL THEN
    RAISE EXCEPTION 'No open allocation available for committee_code DIS676';
  END IF;

  -- If this user had another seat in this committee, clear it first (UNIQUE conference_id+user_id).
  UPDATE public.allocations
  SET user_id = NULL
  WHERE conference_id = v_conf_id
    AND user_id = v_uid
    AND id <> v_alloc_id;

  UPDATE public.allocations
  SET user_id = v_uid
  WHERE id = v_alloc_id;

  UPDATE public.profiles
  SET allocation = v_country,
      updated_at = NOW()
  WHERE id = v_uid;
END $$;
