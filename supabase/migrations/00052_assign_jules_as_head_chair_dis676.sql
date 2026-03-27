DO $$
DECLARE
  v_email text := 'jules.ktoast@gmail.com';
  v_uid uuid;
  v_conf_id uuid;
  v_head_alloc_id uuid;
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

  SELECT id INTO v_head_alloc_id
  FROM public.allocations
  WHERE conference_id = v_conf_id
    AND lower(trim(COALESCE(country, ''))) = 'head chair'
  LIMIT 1;

  IF v_head_alloc_id IS NULL THEN
    INSERT INTO public.allocations (conference_id, country, user_id)
    VALUES (v_conf_id, 'Head Chair', NULL)
    RETURNING id INTO v_head_alloc_id;
  END IF;

  -- Ensure user has only this seat in this committee.
  UPDATE public.allocations
  SET user_id = NULL
  WHERE conference_id = v_conf_id
    AND user_id = v_uid
    AND id <> v_head_alloc_id;

  UPDATE public.allocations
  SET user_id = v_uid
  WHERE id = v_head_alloc_id;

  UPDATE public.profiles
  SET allocation = 'Head Chair',
      updated_at = NOW()
  WHERE id = v_uid;
END $$;
