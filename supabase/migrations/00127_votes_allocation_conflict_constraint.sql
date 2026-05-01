-- Ensure upsert on (vote_item_id, allocation_id) works reliably.

BEGIN;

DROP INDEX IF EXISTS public.votes_vote_item_allocation_unique;

ALTER TABLE public.votes
  DROP CONSTRAINT IF EXISTS votes_vote_item_allocation_unique;

ALTER TABLE public.votes
  ADD CONSTRAINT votes_vote_item_allocation_unique
  UNIQUE (vote_item_id, allocation_id);

COMMIT;
