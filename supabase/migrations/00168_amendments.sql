BEGIN;

-- =====================================================================
-- Delegate-submitted amendments (based on the "Amendment Document" sheet).
--   A delegate proposes an Add / Replace / Delete change to a clause of a
--   resolution. The resolution's MAIN SUBMITTERS review it and mark it
--   Friendly / Unfriendly (approve / reject). Chairs may override the
--   classification/status and delete any amendment.
--
--   Clauses are NOT auto-edited: an approved amendment is a record + can be
--   staged for an amendment vote in live session. Chairs edit clauses
--   manually (matching current behaviour).
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  resolution_id uuid NOT NULL REFERENCES public.resolutions(id) ON DELETE CASCADE,
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  submitter_allocation_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL,
  delegate_country text,
  delegate_email text,
  amendment_type text NOT NULL CHECK (amendment_type IN ('add', 'replace', 'delete')),
  target_clause_number integer,
  original_clause text,
  proposed_clause text,
  classification text CHECK (classification IN ('friendly', 'unfriendly')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS amendments_conference_idx
  ON public.amendments (conference_id, created_at DESC);
CREATE INDEX IF NOT EXISTS amendments_resolution_status_idx
  ON public.amendments (resolution_id, status);

ALTER TABLE public.amendments ENABLE ROW LEVEL SECURITY;

-- SELECT: staff or anyone who can access this committee chamber.
CREATE POLICY amendments_select
  ON public.amendments FOR SELECT TO authenticated
  USING (public.user_can_access_chamber_conference(auth.uid(), conference_id));

-- INSERT: self-insert; must be allocated to the conference (or staff), and the
-- resolution must belong to the stated conference.
CREATE POLICY amendments_insert
  ON public.amendments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = submitted_by
    AND EXISTS (
      SELECT 1 FROM public.resolutions r
      WHERE r.id = resolution_id AND r.conference_id = conference_id
    )
    AND (
      public.is_staff_user(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.allocations a
        WHERE a.conference_id = amendments.conference_id AND a.user_id = auth.uid()
      )
    )
  );

-- DELETE: staff (chairs override), or the submitter withdrawing their own pending one.
CREATE POLICY amendments_delete
  ON public.amendments FOR DELETE TO authenticated
  USING (
    public.is_staff_user(auth.uid())
    OR (auth.uid() = submitted_by AND status = 'pending')
  );

-- (No broad UPDATE policy: reviews go through review_amendment() below.)

-- ---------------------------------------------------------------------
-- Review RPC: main submitters of the resolution (or staff) classify /
-- approve / reject an amendment. SECURITY DEFINER so it can update rows
-- the caller cannot UPDATE directly, after enforcing authorisation.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.review_amendment(
  p_amendment_id uuid,
  p_status text,
  p_classification text DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user uuid;
  v_res uuid;
  v_conf uuid;
  v_is_main_submitter boolean;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  IF p_classification IS NOT NULL AND p_classification NOT IN ('friendly', 'unfriendly') THEN
    RAISE EXCEPTION 'invalid classification';
  END IF;

  SELECT a.resolution_id, a.conference_id
  INTO v_res, v_conf
  FROM public.amendments a
  WHERE a.id = p_amendment_id;

  IF v_res IS NULL THEN
    RAISE EXCEPTION 'amendment not found';
  END IF;

  -- Authorised if staff, or a main submitter of the target resolution.
  SELECT EXISTS (
    SELECT 1 FROM public.resolutions r
    WHERE r.id = v_res AND v_user = ANY(r.main_submitters)
  ) INTO v_is_main_submitter;

  IF NOT (public.is_staff_user(v_user) OR v_is_main_submitter) THEN
    RAISE EXCEPTION 'only main submitters or chairs may review amendments';
  END IF;

  UPDATE public.amendments
  SET status = p_status,
      classification = p_classification,
      reviewed_by = v_user,
      reviewed_at = now(),
      review_note = NULLIF(btrim(coalesce(p_note, '')), ''),
      updated_at = now()
  WHERE id = p_amendment_id;
END;
$$;

ALTER FUNCTION public.review_amendment(uuid, text, text, text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.review_amendment(uuid, text, text, text) TO authenticated;

COMMIT;
