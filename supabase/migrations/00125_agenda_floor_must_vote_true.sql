-- Agenda-setting ballot should always be marked MUST vote.

BEGIN;

UPDATE public.vote_items
SET must_vote = true
WHERE procedure_code = 'agenda_floor';

COMMIT;
