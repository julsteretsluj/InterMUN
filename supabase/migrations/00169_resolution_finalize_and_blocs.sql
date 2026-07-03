-- =====================================================================
-- Resolution finalize + bloc-per-resolution + clause extraction.
--
-- Each bloc is its own resolution draft (one blocs row per resolution).
-- Bloc members collaborate on a single anyone-can-view Google Doc, then
-- press "Confirm & send final to chairs". Finalizing extracts operative
-- clauses (done in the server action) and calls the RPC below to persist
-- them, flip status, notify chairs, and record the bloc members as the
-- resolution's main submitters (so amendment review permissions apply).
--
-- NOTE: no explicit transaction wrapper -- ALTER TYPE ... ADD VALUE cannot
-- run inside a transaction block on some engines.
-- =====================================================================

-- 1. Allow a third bloc stance.
ALTER TYPE bloc_stance ADD VALUE IF NOT EXISTS 'neutral';

-- 2. Finalize workflow columns on resolutions.
ALTER TABLE public.resolutions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'finalized')),
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz,
  ADD COLUMN IF NOT EXISTS finalized_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS doc_is_public boolean;

-- 3. Let bloc members (or staff) update their resolution (e.g. set the doc link).
DROP POLICY IF EXISTS resolutions_update_bloc_member ON public.resolutions;
CREATE POLICY resolutions_update_bloc_member
  ON public.resolutions FOR UPDATE TO authenticated
  USING (
    public.is_staff_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.blocs b
      JOIN public.bloc_memberships m ON m.bloc_id = b.id
      WHERE b.resolution_id = resolutions.id AND m.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_staff_user(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.blocs b
      JOIN public.bloc_memberships m ON m.bloc_id = b.id
      WHERE b.resolution_id = resolutions.id AND m.user_id = auth.uid()
    )
  );

-- 4. Finalize RPC: persist extracted clauses + flip status + notify chairs.
--    Clause text is extracted from the (public) Google Doc in the server
--    action, which passes the ordered clause list here.
CREATE OR REPLACE FUNCTION public.finalize_resolution_with_clauses(
  p_resolution_id uuid,
  p_clauses text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user uuid;
  v_conf uuid;
  v_doc text;
  v_is_member boolean;
  v_target uuid;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT r.conference_id, r.google_docs_url
  INTO v_conf, v_doc
  FROM public.resolutions r
  WHERE r.id = p_resolution_id;

  IF v_conf IS NULL THEN
    RAISE EXCEPTION 'resolution not found';
  END IF;

  IF v_doc IS NULL OR btrim(v_doc) = '' THEN
    RAISE EXCEPTION 'a google doc link is required before finalizing';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.blocs b
    JOIN public.bloc_memberships m ON m.bloc_id = b.id
    WHERE b.resolution_id = p_resolution_id AND m.user_id = v_user
  ) INTO v_is_member;

  IF NOT (public.is_staff_user(v_user) OR v_is_member) THEN
    RAISE EXCEPTION 'only bloc members or chairs may finalize this resolution';
  END IF;

  -- Replace clauses with the freshly extracted set.
  DELETE FROM public.resolution_clauses WHERE resolution_id = p_resolution_id;

  IF p_clauses IS NOT NULL AND array_length(p_clauses, 1) > 0 THEN
    INSERT INTO public.resolution_clauses (conference_id, resolution_id, clause_number, clause_text, created_by)
    SELECT v_conf, p_resolution_id, ord::int, btrim(txt), v_user
    FROM unnest(p_clauses) WITH ORDINALITY AS t(txt, ord)
    WHERE btrim(coalesce(txt, '')) <> '';
  END IF;

  -- Flip status; record bloc members as main submitters for amendment review.
  UPDATE public.resolutions r
  SET status = 'finalized',
      finalized_at = now(),
      finalized_by = v_user,
      doc_is_public = true,
      main_submitters = COALESCE((
        SELECT array_agg(DISTINCT m.user_id)
        FROM public.blocs b
        JOIN public.bloc_memberships m ON m.bloc_id = b.id
        WHERE b.resolution_id = p_resolution_id AND m.user_id IS NOT NULL
      ), r.main_submitters),
      updated_at = now()
  WHERE r.id = p_resolution_id;

  -- Notify the committee chairs (dais seats).
  FOR v_target IN
    SELECT DISTINCT a.user_id
    FROM public.allocations a
    WHERE a.conference_id = v_conf
      AND a.user_id IS NOT NULL
      AND (
        lower(trim(a.country)) = 'head chair'
        OR lower(trim(a.country)) IN ('co-chair', 'co chair')
      )
  LOOP
    INSERT INTO public.user_notifications (
      user_id, conference_id, type, title, body, href, reference_id
    ) VALUES (
      v_target,
      v_conf,
      'resolution_finalized',
      'Resolution finalized',
      'A bloc submitted their final resolution for review.',
      '/resolutions',
      p_resolution_id
    );
  END LOOP;
END;
$$;

ALTER FUNCTION public.finalize_resolution_with_clauses(uuid, text[]) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.finalize_resolution_with_clauses(uuid, text[]) TO authenticated;
