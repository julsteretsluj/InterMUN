CREATE OR REPLACE FUNCTION public.chair_assign_delegate_by_email(
  p_conference_id uuid,
  p_allocation_id uuid,
  p_email text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_delegate_id uuid;
  v_email text;
  v_alloc_country text;
  v_existing_user uuid;
  v_now timestamptz := now();
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT lower(trim(role::text)) INTO v_caller_role
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_role IS NULL THEN
    RAISE EXCEPTION 'profile missing for caller';
  END IF;

  IF v_caller_role NOT IN ('chair', 'smt', 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_caller_role = 'chair' AND NOT EXISTS (
    SELECT 1
    FROM public.allocations a
    WHERE a.conference_id = p_conference_id
      AND a.user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR length(v_email) < 3 OR position('@' IN v_email) < 2 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  SELECT id INTO v_delegate_id
  FROM auth.users
  WHERE lower(trim(email)) = v_email
  LIMIT 1;

  IF v_delegate_id IS NULL THEN
    RAISE EXCEPTION 'no user with that email';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_delegate_id
      AND role::text = 'delegate'
  ) THEN
    RAISE EXCEPTION 'target user is not a delegate';
  END IF;

  SELECT country, user_id INTO v_alloc_country, v_existing_user
  FROM public.allocations
  WHERE id = p_allocation_id
    AND conference_id = p_conference_id
  LIMIT 1;

  IF v_alloc_country IS NULL THEN
    RAISE EXCEPTION 'allocation not found in conference';
  END IF;

  IF v_existing_user IS NOT NULL AND v_existing_user <> v_delegate_id THEN
    RAISE EXCEPTION 'allocation already assigned';
  END IF;

  UPDATE public.allocations
  SET user_id = NULL
  WHERE conference_id = p_conference_id
    AND user_id = v_delegate_id
    AND id <> p_allocation_id;

  UPDATE public.allocations
  SET user_id = v_delegate_id
  WHERE id = p_allocation_id
    AND conference_id = p_conference_id;

  UPDATE public.profiles
  SET allocation = v_alloc_country,
      updated_at = v_now
  WHERE id = v_delegate_id;

  UPDATE public.allocation_signup_requests
  SET status = 'approved',
      reviewed_by = v_caller_id,
      reviewed_at = v_now,
      updated_at = v_now
  WHERE conference_id = p_conference_id
    AND requested_by = v_delegate_id
    AND allocation_id = p_allocation_id
    AND status = 'pending';

  UPDATE public.allocation_signup_requests
  SET status = 'rejected',
      reviewed_by = v_caller_id,
      reviewed_at = v_now,
      updated_at = v_now,
      note = 'Superseded by direct chair approval by email + allocation.'
  WHERE conference_id = p_conference_id
    AND requested_by = v_delegate_id
    AND status = 'pending'
    AND allocation_id <> p_allocation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.chair_assign_delegate_by_email(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.chair_assign_delegate_by_email(uuid, uuid, text) TO authenticated;
