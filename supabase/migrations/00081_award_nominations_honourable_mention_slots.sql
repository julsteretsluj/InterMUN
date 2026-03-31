BEGIN;

ALTER TABLE public.award_nominations
  DROP CONSTRAINT IF EXISTS award_nominations_rank_check;

ALTER TABLE public.award_nominations
  ADD CONSTRAINT award_nominations_rank_check
  CHECK (rank IN (1, 2, 3));

ALTER TABLE public.award_nominations
  DROP CONSTRAINT IF EXISTS award_nominations_nomination_type_check;

ALTER TABLE public.award_nominations
  ADD CONSTRAINT award_nominations_nomination_type_check
  CHECK (
    nomination_type IN (
      'committee_best_delegate',
      'committee_honourable_mention',
      'committee_best_position_paper',
      'conference_best_delegate'
    )
  );

COMMIT;

