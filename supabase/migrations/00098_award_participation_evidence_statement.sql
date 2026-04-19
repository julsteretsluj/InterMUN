-- Written evidence / confirmation alongside rubric matrices (delegate chair feedback, optional elsewhere).
ALTER TABLE public.award_participation_scores
  ADD COLUMN IF NOT EXISTS evidence_statement TEXT;

COMMENT ON COLUMN public.award_participation_scores.evidence_statement IS 'Optional statement of confirmation or floor evidence; required by app for chair_by_delegate (delegate→chair feedback).';
