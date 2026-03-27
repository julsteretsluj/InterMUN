ALTER TABLE public.award_nominations
ADD COLUMN IF NOT EXISTS rubric_scores JSONB;
