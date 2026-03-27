ALTER TABLE public.award_nominations
ADD COLUMN IF NOT EXISTS nomination_type TEXT NOT NULL DEFAULT 'committee_best_delegate'
CHECK (
  nomination_type IN (
    'committee_best_delegate',
    'committee_best_position_paper',
    'conference_best_delegate'
  )
);

DROP INDEX IF EXISTS idx_award_nominations_pending_rank_per_committee;

CREATE UNIQUE INDEX IF NOT EXISTS idx_award_nominations_pending_rank_per_type
  ON public.award_nominations (committee_conference_id, nomination_type, rank)
  WHERE status = 'pending';
