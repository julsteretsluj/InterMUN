BEGIN;

CREATE OR REPLACE FUNCTION public.delegate_set_roll_attendance(
  p_conference_id uuid,
  p_attendance text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_allocation_id uuid;
  v_started_at timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_attendance NOT IN ('present_abstain', 'present_voting') THEN
    RAISE EXCEPTION 'attendance must be present_abstain or present_voting';
  END IF;

  SELECT p.role::text
  INTO v_role
  FROM public.profiles p
  WHERE p.id = v_uid;

  IF v_role IS NULL OR v_role <> 'delegate' THEN
    RAISE EXCEPTION 'only delegates can set self attendance';
  END IF;

  SELECT ps.committee_session_started_at
  INTO v_started_at
  FROM public.procedure_states ps
  WHERE ps.conference_id = p_conference_id;

  IF v_started_at IS NULL THEN
    RAISE EXCEPTION 'session has not started';
  END IF;

  SELECT a.id
  INTO v_allocation_id
  FROM public.allocations a
  WHERE a.conference_id = p_conference_id
    AND a.user_id = v_uid
  LIMIT 1;

  IF v_allocation_id IS NULL THEN
    RAISE EXCEPTION 'no delegate allocation found for this committee';
  END IF;

  INSERT INTO public.roll_call_entries (conference_id, allocation_id, attendance, updated_at)
  VALUES (p_conference_id, v_allocation_id, p_attendance, now())
  ON CONFLICT (conference_id, allocation_id)
  DO UPDATE SET
    attendance = EXCLUDED.attendance,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.delegate_set_roll_attendance(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delegate_set_roll_attendance(uuid, text) TO authenticated;

COMMIT;
