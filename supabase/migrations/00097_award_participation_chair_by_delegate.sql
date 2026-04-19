-- Delegates evaluate chairs (same performance rubric keys as SMT chair performance); one row per delegate per chair per committee.
ALTER TABLE public.award_participation_scores
  DROP CONSTRAINT IF EXISTS award_participation_scores_scope_check;

ALTER TABLE public.award_participation_scores
  ADD CONSTRAINT award_participation_scores_scope_check CHECK (
    scope IN ('delegate_by_chair', 'chair_by_smt', 'chair_report_by_smt', 'chair_by_delegate')
  );

ALTER TABLE public.award_participation_scores
  DROP CONSTRAINT IF EXISTS award_participation_scores_subject_rules;

ALTER TABLE public.award_participation_scores
  ADD CONSTRAINT award_participation_scores_subject_rules CHECK (
    (scope = 'chair_report_by_smt' AND subject_profile_id IS NULL)
    OR (
      scope IN ('delegate_by_chair', 'chair_by_smt', 'chair_by_delegate')
      AND subject_profile_id IS NOT NULL
    )
  );

CREATE UNIQUE INDEX award_participation_scores_chair_by_delegate_unique
  ON public.award_participation_scores (scope, committee_conference_id, subject_profile_id, created_by)
  WHERE scope = 'chair_by_delegate';

DROP POLICY IF EXISTS "award_participation_scores_select_staff" ON public.award_participation_scores;
CREATE POLICY "award_participation_scores_select_staff"
ON public.award_participation_scores FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('smt', 'admin'))
  OR (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.allocations a ON a.user_id = p.id
      WHERE p.id = auth.uid()
        AND p.role::text = 'chair'
        AND a.conference_id = award_participation_scores.committee_conference_id
    )
    AND award_participation_scores.scope <> 'chair_by_delegate'
  )
  OR (
    award_participation_scores.scope = 'chair_by_delegate'
    AND award_participation_scores.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "award_participation_scores_insert_delegate_chair_feedback" ON public.award_participation_scores;
CREATE POLICY "award_participation_scores_insert_delegate_chair_feedback"
ON public.award_participation_scores FOR INSERT TO authenticated
WITH CHECK (
  scope = 'chair_by_delegate'
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    WHERE p.id = auth.uid()
      AND p.role::text = 'delegate'
      AND a.conference_id = award_participation_scores.committee_conference_id
  )
);

DROP POLICY IF EXISTS "award_participation_scores_update_delegate_chair_feedback" ON public.award_participation_scores;
CREATE POLICY "award_participation_scores_update_delegate_chair_feedback"
ON public.award_participation_scores FOR UPDATE TO authenticated
USING (
  scope = 'chair_by_delegate'
  AND created_by = auth.uid()
)
WITH CHECK (
  scope = 'chair_by_delegate'
  AND created_by = auth.uid()
);

COMMENT ON TABLE public.award_participation_scores IS 'Full-matrix rubrics: delegate_by_chair, chair_by_smt, chair_report_by_smt (SMT chair report doc), chair_by_delegate (delegate feedback on each chair).';
