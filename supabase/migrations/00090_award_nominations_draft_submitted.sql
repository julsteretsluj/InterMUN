-- Draft vs SMT-visible pending: chairs work in draft; submit flips to pending for the SMT queue.

ALTER TABLE public.award_nominations
  DROP CONSTRAINT IF EXISTS award_nominations_status_check;

ALTER TABLE public.award_nominations
  ADD CONSTRAINT award_nominations_status_check
  CHECK (status IN ('draft', 'pending', 'selected', 'not_selected', 'rejected'));

ALTER TABLE public.award_nominations
  ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.award_nominations
  ADD COLUMN IF NOT EXISTS submitted_to_smt_at TIMESTAMPTZ;

COMMENT ON COLUMN public.award_nominations.submitted_to_smt_at IS
  'Set when chair (or deadline job) submits this committee batch to SMT (draft → pending).';

DROP INDEX IF EXISTS idx_award_nominations_pending_rank_per_type;

CREATE UNIQUE INDEX idx_award_nominations_open_rank_per_type
  ON public.award_nominations (committee_conference_id, nomination_type, rank)
  WHERE status IN ('draft', 'pending');

-- RLS: SMT/admin must not read drafts (only chairs for their committee).

DROP POLICY IF EXISTS "Chairs/SMT can view nominations" ON public.award_nominations;

CREATE POLICY "SMT admin read nominations queue"
ON public.award_nominations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('smt', 'admin')
  )
  AND status IS DISTINCT FROM 'draft'
);

CREATE POLICY "Chairs read committee nominations"
ON public.award_nominations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role::text = 'chair'
      AND a.conference_id = award_nominations.committee_conference_id
  )
);

DROP POLICY IF EXISTS "Chairs can update own pending nominations" ON public.award_nominations;

CREATE POLICY "Chairs can update own draft nominations"
ON public.award_nominations
FOR UPDATE
TO authenticated
USING (
  (created_by = auth.uid() AND status = 'draft')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('smt', 'admin')
  )
)
WITH CHECK (
  (created_by = auth.uid() AND status IN ('draft', 'pending'))
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('smt', 'admin')
  )
);

DROP POLICY IF EXISTS "Chairs can delete own pending nominations for own committee" ON public.award_nominations;

CREATE POLICY "Chairs can delete own draft or pending nominations for own committee"
ON public.award_nominations
FOR DELETE
TO authenticated
USING (
  status IN ('draft', 'pending')
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role::text IN ('chair', 'smt', 'admin')
      AND a.conference_id = award_nominations.committee_conference_id
  )
);
