-- Full-matrix scoring: chairs score every delegate; SMT scores every chair + each committee chair report.
CREATE TABLE public.award_participation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('delegate_by_chair', 'chair_by_smt', 'chair_report_by_smt')),
  committee_conference_id UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  subject_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rubric_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT award_participation_scores_subject_rules CHECK (
    (scope = 'chair_report_by_smt' AND subject_profile_id IS NULL)
    OR (scope IN ('delegate_by_chair', 'chair_by_smt') AND subject_profile_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX award_participation_scores_delegate_chair_unique
  ON public.award_participation_scores (scope, committee_conference_id, subject_profile_id)
  WHERE scope IN ('delegate_by_chair', 'chair_by_smt');

CREATE UNIQUE INDEX award_participation_scores_report_unique
  ON public.award_participation_scores (scope, committee_conference_id)
  WHERE scope = 'chair_report_by_smt';

CREATE INDEX idx_award_participation_scores_committee ON public.award_participation_scores (committee_conference_id);

ALTER TABLE public.award_participation_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "award_participation_scores_select_staff" ON public.award_participation_scores;
CREATE POLICY "award_participation_scores_select_staff"
ON public.award_participation_scores FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('smt', 'admin'))
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role::text = 'chair'
      AND a.conference_id = award_participation_scores.committee_conference_id
  )
);

DROP POLICY IF EXISTS "award_participation_scores_insert_delegate_matrix" ON public.award_participation_scores;
CREATE POLICY "award_participation_scores_insert_delegate_matrix"
ON public.award_participation_scores FOR INSERT TO authenticated
WITH CHECK (
  scope = 'delegate_by_chair'
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role::text = 'chair'
      AND a.conference_id = award_participation_scores.committee_conference_id
  )
);

DROP POLICY IF EXISTS "award_participation_scores_update_delegate_matrix" ON public.award_participation_scores;
CREATE POLICY "award_participation_scores_update_delegate_matrix"
ON public.award_participation_scores FOR UPDATE TO authenticated
USING (
  scope = 'delegate_by_chair'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role::text = 'chair'
      AND a.conference_id = award_participation_scores.committee_conference_id
  )
)
WITH CHECK (
  scope = 'delegate_by_chair'
);

DROP POLICY IF EXISTS "award_participation_scores_insert_smt" ON public.award_participation_scores;
CREATE POLICY "award_participation_scores_insert_smt"
ON public.award_participation_scores FOR INSERT TO authenticated
WITH CHECK (
  scope IN ('chair_by_smt', 'chair_report_by_smt')
  AND created_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('smt', 'admin'))
);

DROP POLICY IF EXISTS "award_participation_scores_update_smt" ON public.award_participation_scores;
CREATE POLICY "award_participation_scores_update_smt"
ON public.award_participation_scores FOR UPDATE TO authenticated
USING (
  scope IN ('chair_by_smt', 'chair_report_by_smt')
  AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('smt', 'admin'))
)
WITH CHECK (
  scope IN ('chair_by_smt', 'chair_report_by_smt')
);

COMMENT ON TABLE public.award_participation_scores IS 'Mandatory full-matrix rubrics: delegate_by_chair (all delegates), chair_by_smt, chair_report_by_smt (per committee).';
