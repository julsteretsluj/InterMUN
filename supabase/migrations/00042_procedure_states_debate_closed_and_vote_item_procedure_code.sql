-- RoP procedure enhancements:
-- - distinguish final voting procedure (after Close Debate passes) from temporary votes
-- - add procedure_code to vote_items so the chair can drive state transitions based on motion type

BEGIN;

ALTER TABLE public.procedure_states
  ADD COLUMN IF NOT EXISTS debate_closed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.vote_items
  ADD COLUMN IF NOT EXISTS procedure_code TEXT;

CREATE INDEX IF NOT EXISTS idx_vote_items_procedure_code ON public.vote_items (procedure_code);

COMMIT;

