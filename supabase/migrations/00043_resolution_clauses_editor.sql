-- Resolution clause editor foundation for procedural motions.

BEGIN;

CREATE TABLE IF NOT EXISTS public.resolution_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  resolution_id UUID NOT NULL REFERENCES public.resolutions(id) ON DELETE CASCADE,
  clause_number INTEGER NOT NULL,
  clause_text TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resolution_id, clause_number)
);

CREATE INDEX IF NOT EXISTS idx_resolution_clauses_resolution
  ON public.resolution_clauses (resolution_id, clause_number);

ALTER TABLE public.resolution_clauses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resolution_clauses_select ON public.resolution_clauses;
CREATE POLICY resolution_clauses_select
  ON public.resolution_clauses
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS resolution_clauses_insert_staff ON public.resolution_clauses;
CREATE POLICY resolution_clauses_insert_staff
  ON public.resolution_clauses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

DROP POLICY IF EXISTS resolution_clauses_update_staff ON public.resolution_clauses;
CREATE POLICY resolution_clauses_update_staff
  ON public.resolution_clauses
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

DROP POLICY IF EXISTS resolution_clauses_delete_staff ON public.resolution_clauses;
CREATE POLICY resolution_clauses_delete_staff
  ON public.resolution_clauses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

COMMIT;

