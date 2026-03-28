-- Delegate allocation that moved the motion (optional; chair sets in session control).

BEGIN;

ALTER TABLE public.vote_items
  ADD COLUMN IF NOT EXISTS motioner_allocation_id UUID REFERENCES public.allocations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vote_items_motioner_allocation
  ON public.vote_items (motioner_allocation_id);

COMMIT;
