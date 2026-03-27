-- Remove legacy slogan text mistakenly stored as committee name.

UPDATE public.conferences
SET committee = NULL
WHERE lower(trim(COALESCE(committee, ''))) = 'policies with a purpose';

