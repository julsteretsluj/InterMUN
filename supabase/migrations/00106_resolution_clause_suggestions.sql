-- Delegate (and staff) clause suggestions for draft resolutions — separate from official resolution_clauses.

CREATE TABLE IF NOT EXISTS public.resolution_clause_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  resolution_id uuid NOT NULL REFERENCES public.resolutions(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  section text NOT NULL CHECK (section IN ('preambulatory', 'operative')),
  opening_phrase text,
  clause_body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resolution_clause_suggestions_resolution
  ON public.resolution_clause_suggestions (resolution_id, created_at DESC);

ALTER TABLE public.resolution_clause_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resolution_clause_suggestions_select ON public.resolution_clause_suggestions;
CREATE POLICY resolution_clause_suggestions_select
  ON public.resolution_clause_suggestions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS resolution_clause_suggestions_insert ON public.resolution_clause_suggestions;
CREATE POLICY resolution_clause_suggestions_insert
  ON public.resolution_clause_suggestions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1
      FROM public.resolutions r
      WHERE r.id = resolution_id
        AND r.conference_id = conference_id
    )
    AND (
      public.is_staff_user(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.resolutions r
        INNER JOIN public.allocations a
          ON a.conference_id = r.conference_id
          AND a.user_id = auth.uid()
        WHERE r.id = resolution_id
      )
    )
  );

DROP POLICY IF EXISTS resolution_clause_suggestions_delete ON public.resolution_clause_suggestions;
CREATE POLICY resolution_clause_suggestions_delete
  ON public.resolution_clause_suggestions
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_staff_user(auth.uid()));

COMMENT ON TABLE public.resolution_clause_suggestions IS
  'Suggested preambulatory/operative language from delegates; chairs may copy into resolution_clauses / Google Doc.';
