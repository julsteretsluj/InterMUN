CREATE TABLE IF NOT EXISTS public.award_nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_conference_id UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  nominee_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank SMALLINT NOT NULL CHECK (rank IN (1, 2)),
  evidence_note TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'selected', 'not_selected')),
  selected_award_category TEXT,
  selected_award_assignment_id UUID REFERENCES public.award_assignments(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_award_nominations_pending_rank_per_committee
  ON public.award_nominations (committee_conference_id, rank)
  WHERE status = 'pending';

ALTER TABLE public.award_nominations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chairs/SMT can view nominations" ON public.award_nominations;
CREATE POLICY "Chairs/SMT can view nominations"
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
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role::text = 'chair'
      AND a.conference_id = award_nominations.committee_conference_id
  )
);

DROP POLICY IF EXISTS "Chairs can insert nominations for own committee" ON public.award_nominations;
CREATE POLICY "Chairs can insert nominations for own committee"
ON public.award_nominations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role::text IN ('chair', 'smt', 'admin')
      AND a.conference_id = award_nominations.committee_conference_id
  )
);

DROP POLICY IF EXISTS "Chairs can update own pending nominations" ON public.award_nominations;
CREATE POLICY "Chairs can update own pending nominations"
ON public.award_nominations
FOR UPDATE
TO authenticated
USING (
  (created_by = auth.uid() AND status = 'pending')
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('smt', 'admin')
  )
)
WITH CHECK (
  (created_by = auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('smt', 'admin')
  )
);
