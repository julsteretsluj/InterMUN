-- Enable clause-targeted procedural motions and persisted outcomes.

BEGIN;

ALTER TABLE public.vote_items
  ADD COLUMN IF NOT EXISTS procedure_resolution_id UUID REFERENCES public.resolutions(id) ON DELETE SET NULL;

ALTER TABLE public.vote_items
  ADD COLUMN IF NOT EXISTS procedure_clause_ids UUID[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.resolution_clause_vote_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_item_id UUID NOT NULL REFERENCES public.vote_items(id) ON DELETE CASCADE,
  resolution_id UUID NOT NULL REFERENCES public.resolutions(id) ON DELETE CASCADE,
  clause_id UUID NOT NULL REFERENCES public.resolution_clauses(id) ON DELETE CASCADE,
  passed BOOLEAN NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vote_item_id, clause_id)
);

CREATE INDEX IF NOT EXISTS idx_clause_vote_outcomes_vote_item
  ON public.resolution_clause_vote_outcomes (vote_item_id);

CREATE INDEX IF NOT EXISTS idx_clause_vote_outcomes_resolution
  ON public.resolution_clause_vote_outcomes (resolution_id, applied_at DESC);

ALTER TABLE public.resolution_clause_vote_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS resolution_clause_vote_outcomes_select ON public.resolution_clause_vote_outcomes;
CREATE POLICY resolution_clause_vote_outcomes_select
  ON public.resolution_clause_vote_outcomes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS resolution_clause_vote_outcomes_insert_chair ON public.resolution_clause_vote_outcomes;
CREATE POLICY resolution_clause_vote_outcomes_insert_chair
  ON public.resolution_clause_vote_outcomes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'admin')
    )
  );

COMMIT;

