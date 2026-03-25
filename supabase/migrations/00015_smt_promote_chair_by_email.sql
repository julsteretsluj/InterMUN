-- SMT: grant chair role to an existing auth user by email (no service role needed on the app).

CREATE OR REPLACE FUNCTION public.smt_promote_to_chair_by_email(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  uid uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'smt'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR length(v_email) < 3 OR position('@' IN v_email) < 2 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  SELECT id INTO uid FROM auth.users WHERE lower(trim(email)) = v_email LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'no user with that email';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid) THEN
    RAISE EXCEPTION 'profile missing for user';
  END IF;

  UPDATE public.profiles
  SET role = 'chair'::user_role, updated_at = now()
  WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.smt_promote_to_chair_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.smt_promote_to_chair_by_email(text) TO authenticated;
