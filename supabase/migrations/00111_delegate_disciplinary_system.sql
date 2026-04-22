BEGIN;

CREATE TABLE IF NOT EXISTS public.chair_delegate_discipline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  allocation_id uuid NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  warning_count integer NOT NULL DEFAULT 0 CHECK (warning_count >= 0 AND warning_count <= 2),
  strike_count integer NOT NULL DEFAULT 0 CHECK (strike_count >= 0 AND strike_count <= 3),
  voting_rights_lost boolean NOT NULL DEFAULT false,
  speaking_rights_suspended boolean NOT NULL DEFAULT false,
  removed_from_committee boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conference_id, allocation_id)
);

CREATE INDEX IF NOT EXISTS chair_delegate_discipline_conference_idx
  ON public.chair_delegate_discipline (conference_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.chair_delegate_discipline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  allocation_id uuid NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  chair_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (
    action IN ('warning', 'strike', 'revoke_warning', 'revoke_strike', 'reset')
  ),
  reason text,
  warning_count_after integer NOT NULL,
  strike_count_after integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chair_delegate_discipline_events_conference_idx
  ON public.chair_delegate_discipline_events (conference_id, created_at DESC);

ALTER TABLE public.chair_delegate_discipline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chair_delegate_discipline_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.chair_delegate_discipline FROM PUBLIC;
REVOKE ALL ON TABLE public.chair_delegate_discipline_events FROM PUBLIC;
GRANT SELECT ON TABLE public.chair_delegate_discipline TO authenticated;
GRANT SELECT ON TABLE public.chair_delegate_discipline_events TO authenticated;

CREATE POLICY "discipline_select_staff_and_subject"
  ON public.chair_delegate_discipline
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.allocations a
      WHERE a.id = chair_delegate_discipline.allocation_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "discipline_select_events_staff_and_subject"
  ON public.chair_delegate_discipline_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.allocations a
      WHERE a.id = chair_delegate_discipline_events.allocation_id
        AND a.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.apply_delegate_disciplinary_action(
  p_conference_id uuid,
  p_allocation_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
) RETURNS TABLE (
  warning_count integer,
  strike_count integer,
  voting_rights_lost boolean,
  speaking_rights_suspended boolean,
  removed_from_committee boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text := lower(trim(coalesce(p_action, '')));
  v_warning integer := 0;
  v_strike integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('chair', 'smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_action NOT IN ('warning', 'strike', 'revoke_warning', 'revoke_strike', 'reset') THEN
    RAISE EXCEPTION 'invalid disciplinary action';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.allocations a
    WHERE a.id = p_allocation_id
      AND a.conference_id = p_conference_id
  ) THEN
    RAISE EXCEPTION 'allocation does not belong to committee';
  END IF;

  INSERT INTO public.chair_delegate_discipline (conference_id, allocation_id)
  VALUES (p_conference_id, p_allocation_id)
  ON CONFLICT (conference_id, allocation_id) DO NOTHING;

  SELECT d.warning_count, d.strike_count
  INTO v_warning, v_strike
  FROM public.chair_delegate_discipline d
  WHERE d.conference_id = p_conference_id
    AND d.allocation_id = p_allocation_id
  FOR UPDATE;

  IF v_action = 'warning' THEN
    v_warning := v_warning + 1;
    IF v_warning >= 3 THEN
      v_warning := 0;
      v_strike := LEAST(3, v_strike + 1);
    END IF;
  ELSIF v_action = 'strike' THEN
    v_strike := LEAST(3, v_strike + 1);
  ELSIF v_action = 'revoke_warning' THEN
    v_warning := GREATEST(0, v_warning - 1);
  ELSIF v_action = 'revoke_strike' THEN
    v_strike := GREATEST(0, v_strike - 1);
  ELSIF v_action = 'reset' THEN
    v_warning := 0;
    v_strike := 0;
  END IF;

  UPDATE public.chair_delegate_discipline
  SET
    warning_count = v_warning,
    strike_count = v_strike,
    voting_rights_lost = (v_strike >= 1),
    speaking_rights_suspended = (v_strike >= 2),
    removed_from_committee = (v_strike >= 3),
    updated_at = now()
  WHERE conference_id = p_conference_id
    AND allocation_id = p_allocation_id;

  INSERT INTO public.chair_delegate_discipline_events (
    conference_id,
    allocation_id,
    chair_user_id,
    action,
    reason,
    warning_count_after,
    strike_count_after
  )
  VALUES (
    p_conference_id,
    p_allocation_id,
    auth.uid(),
    v_action,
    NULLIF(trim(coalesce(p_reason, '')), ''),
    v_warning,
    v_strike
  );

  RETURN QUERY
  SELECT
    d.warning_count,
    d.strike_count,
    d.voting_rights_lost,
    d.speaking_rights_suspended,
    d.removed_from_committee
  FROM public.chair_delegate_discipline d
  WHERE d.conference_id = p_conference_id
    AND d.allocation_id = p_allocation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_delegate_disciplinary_action(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_delegate_disciplinary_action(uuid, uuid, text, text) TO authenticated;

COMMIT;
