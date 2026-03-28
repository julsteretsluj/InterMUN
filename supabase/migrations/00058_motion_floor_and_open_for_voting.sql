-- Multiple motions can be "stated" before voting; only one row may be open for voting at a time.
-- motion_floor_open: chair is taking motion statements from the floor.

BEGIN;

ALTER TABLE public.vote_items
  ADD COLUMN IF NOT EXISTS open_for_voting BOOLEAN NOT NULL DEFAULT true;

-- Existing unclosed motions were the single active vote.
UPDATE public.vote_items
SET open_for_voting = true
WHERE closed_at IS NULL;

DROP INDEX IF EXISTS idx_vote_items_one_open_per_conference;

CREATE UNIQUE INDEX idx_vote_items_one_open_for_voting_per_conference
  ON public.vote_items (conference_id)
  WHERE closed_at IS NULL AND open_for_voting IS TRUE;

ALTER TABLE public.procedure_states
  ADD COLUMN IF NOT EXISTS motion_floor_open BOOLEAN NOT NULL DEFAULT false;

COMMIT;
