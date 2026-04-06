-- Allow SMT to mark a nomination as explicitly rejected (next backup rank stays pending).
ALTER TABLE public.award_nominations
  DROP CONSTRAINT IF EXISTS award_nominations_status_check;

ALTER TABLE public.award_nominations
  ADD CONSTRAINT award_nominations_status_check
  CHECK (status IN ('pending', 'selected', 'not_selected', 'rejected'));
