-- SMT (secretariat) can act for any delegation / committee in their own event from the SMT view.
-- "Own event" = the SMT account holds a seat (allocation) in a conference of that event; admins are global.
-- Delegate access is unchanged except that a delegate can now read stance notes that staff wrote for their seat.

CREATE OR REPLACE FUNCTION private.smt_can_act_for_conference(p_uid uuid, p_conference_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $$
  SELECT p_uid IS NOT NULL AND p_conference_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = p_uid AND p.role::text = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.allocations own ON own.user_id = p.id
      JOIN public.conferences own_c ON own_c.id = own.conference_id
      JOIN public.conferences target_c ON target_c.id = p_conference_id
      WHERE p.id = p_uid
        AND p.role::text = 'smt'
        AND own_c.event_id IS NOT NULL
        AND own_c.event_id = target_c.event_id
    )
  );
$$;

CREATE OR REPLACE FUNCTION private.smt_can_act_for_allocation(p_uid uuid, p_allocation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
SET row_security TO 'off'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allocations a
    WHERE a.id = p_allocation_id
      AND private.smt_can_act_for_conference(p_uid, a.conference_id)
  );
$$;

REVOKE ALL ON FUNCTION private.smt_can_act_for_conference(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.smt_can_act_for_allocation(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.smt_can_act_for_conference(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.smt_can_act_for_allocation(uuid, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Stance notes (notes.note_type = 'stance', keyed by allocation_id).
-- Insert already allows user_id = auth.uid(); the SMT author is recorded in user_id.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS notes_update_smt_stance_for_seat ON public.notes;
CREATE POLICY notes_update_smt_stance_for_seat
  ON public.notes
  FOR UPDATE
  TO authenticated
  USING (
    note_type = 'stance'
    AND allocation_id IS NOT NULL
    AND private.smt_can_act_for_allocation((SELECT auth.uid()), allocation_id)
  )
  WITH CHECK (
    note_type = 'stance'
    AND allocation_id IS NOT NULL
    AND private.smt_can_act_for_allocation((SELECT auth.uid()), allocation_id)
  );

-- Seat owner reads stance notes on their own seat when they or event SMT wrote them
-- (not notes another delegate attached to the seat).
DROP POLICY IF EXISTS notes_select_stance_on_own_seat ON public.notes;
CREATE POLICY notes_select_stance_on_own_seat
  ON public.notes
  FOR SELECT
  TO authenticated
  USING (
    note_type = 'stance'
    AND allocation_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.allocations a
      WHERE a.id = notes.allocation_id
        AND a.user_id = (SELECT auth.uid())
    )
    AND (
      notes.user_id = (SELECT auth.uid())
      OR private.smt_can_act_for_allocation(notes.user_id, notes.allocation_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Per-seat stance heatmap / country grid for seats SMT fills in.
-- Claimed seats keep using the owner's profile columns; unclaimed seats store here.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.allocation_stances (
  allocation_id uuid PRIMARY KEY REFERENCES public.allocations(id) ON DELETE CASCADE,
  stance_overview jsonb NOT NULL DEFAULT '{}'::jsonb,
  country_stance_map jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.allocation_stances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allocation_stances_select ON public.allocation_stances;
CREATE POLICY allocation_stances_select
  ON public.allocation_stances
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user((SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.allocations a
      WHERE a.id = allocation_stances.allocation_id
        AND a.user_id = (SELECT auth.uid())
    )
  );

-- Writes go through smt_set_seat_stance so the actor is always recorded.

CREATE OR REPLACE FUNCTION public.smt_set_seat_stance(
  p_allocation_id uuid,
  p_stance_overview jsonb DEFAULT NULL,
  p_country_stance_map jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_owner uuid;
BEGIN
  IF v_uid IS NULL OR NOT private.smt_can_act_for_allocation(v_uid, p_allocation_id) THEN
    RAISE EXCEPTION 'Not allowed to edit this delegation''s stance' USING ERRCODE = '42501';
  END IF;
  IF p_stance_overview IS NOT NULL AND jsonb_typeof(p_stance_overview) <> 'object' THEN
    RAISE EXCEPTION 'stance_overview must be an object' USING ERRCODE = '22023';
  END IF;
  IF p_country_stance_map IS NOT NULL AND jsonb_typeof(p_country_stance_map) <> 'object' THEN
    RAISE EXCEPTION 'country_stance_map must be an object' USING ERRCODE = '22023';
  END IF;

  SELECT a.user_id INTO v_owner FROM public.allocations a WHERE a.id = p_allocation_id;

  INSERT INTO public.allocation_stances AS s (allocation_id, stance_overview, country_stance_map, updated_by, updated_at)
  VALUES (
    p_allocation_id,
    COALESCE(p_stance_overview, '{}'::jsonb),
    COALESCE(p_country_stance_map, '{}'::jsonb),
    v_uid,
    now()
  )
  ON CONFLICT (allocation_id) DO UPDATE SET
    stance_overview = COALESCE(p_stance_overview, s.stance_overview),
    country_stance_map = COALESCE(p_country_stance_map, s.country_stance_map),
    updated_by = v_uid,
    updated_at = now();

  IF v_owner IS NOT NULL THEN
    UPDATE public.profiles p SET
      stance_overview = COALESCE(p_stance_overview, p.stance_overview),
      country_stance_map = COALESCE(p_country_stance_map, p.country_stance_map),
      updated_at = now()
    WHERE p.id = v_owner;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.smt_set_seat_stance(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.smt_set_seat_stance(uuid, jsonb, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- Award nominations: chair-only today (requires a seat in that committee).
-- SMT of the same event can draft / submit / withdraw their own nominations for any committee.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS award_nominations_insert_smt_event ON public.award_nominations;
CREATE POLICY award_nominations_insert_smt_event
  ON public.award_nominations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND private.smt_can_act_for_conference((SELECT auth.uid()), committee_conference_id)
  );

DROP POLICY IF EXISTS award_nominations_select_smt_own_drafts ON public.award_nominations;
CREATE POLICY award_nominations_select_smt_own_drafts
  ON public.award_nominations
  FOR SELECT
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    AND private.smt_can_act_for_conference((SELECT auth.uid()), committee_conference_id)
  );

DROP POLICY IF EXISTS award_nominations_delete_smt_own ON public.award_nominations;
CREATE POLICY award_nominations_delete_smt_own
  ON public.award_nominations
  FOR DELETE
  TO authenticated
  USING (
    status = ANY (ARRAY['draft'::text, 'pending'::text])
    AND created_by = (SELECT auth.uid())
    AND private.smt_can_act_for_conference((SELECT auth.uid()), committee_conference_id)
  );
