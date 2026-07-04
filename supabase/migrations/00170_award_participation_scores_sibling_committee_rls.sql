-- Chairs and delegates are often linked on sibling `conferences` rows (same chamber, different topic)
-- while award_participation_scores rows use the canonical committee_conference_id.

BEGIN;

CREATE OR REPLACE FUNCTION public.user_chair_can_manage_participation_scores(
  p_committee_conference_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    JOIN public.conferences c_chair ON c_chair.id = a.conference_id
    JOIN public.conferences c_target ON c_target.id = p_committee_conference_id
    WHERE p.id = auth.uid()
      AND p.role::text = 'chair'
      AND c_chair.event_id IS NOT NULL
      AND c_target.event_id IS NOT NULL
      AND c_chair.event_id = c_target.event_id
      AND (
        a.conference_id = p_committee_conference_id
        OR public.committee_tab_key(c_chair) = public.committee_tab_key(c_target)
      )
  );
$$;

COMMENT ON FUNCTION public.user_chair_can_manage_participation_scores(uuid) IS
  'True when auth.uid() is a chair allocated to the target committee or a sibling conference row (same committee_tab_key / event).';

CREATE OR REPLACE FUNCTION public.user_delegate_can_manage_participation_feedback(
  p_committee_conference_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    JOIN public.allocations a ON a.user_id = p.id
    JOIN public.conferences c_delegate ON c_delegate.id = a.conference_id
    JOIN public.conferences c_target ON c_target.id = p_committee_conference_id
    WHERE p.id = auth.uid()
      AND p.role::text = 'delegate'
      AND c_delegate.event_id IS NOT NULL
      AND c_target.event_id IS NOT NULL
      AND c_delegate.event_id = c_target.event_id
      AND (
        a.conference_id = p_committee_conference_id
        OR public.committee_tab_key(c_delegate) = public.committee_tab_key(c_target)
      )
  );
$$;

DROP POLICY IF EXISTS "award_participation_scores_select_staff" ON public.award_participation_scores;
CREATE POLICY "award_participation_scores_select_staff"
ON public.award_participation_scores FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role::text IN ('smt', 'admin'))
  OR (
    public.user_chair_can_manage_participation_scores(committee_conference_id)
    AND scope <> 'chair_by_delegate'
  )
  OR (
    scope = 'chair_by_delegate'
    AND created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "award_participation_scores_insert_delegate_matrix" ON public.award_participation_scores;
CREATE POLICY "award_participation_scores_insert_delegate_matrix"
ON public.award_participation_scores FOR INSERT TO authenticated
WITH CHECK (
  scope = 'delegate_by_chair'
  AND created_by = auth.uid()
  AND public.user_chair_can_manage_participation_scores(committee_conference_id)
);

DROP POLICY IF EXISTS "award_participation_scores_update_delegate_matrix" ON public.award_participation_scores;
CREATE POLICY "award_participation_scores_update_delegate_matrix"
ON public.award_participation_scores FOR UPDATE TO authenticated
USING (
  scope = 'delegate_by_chair'
  AND public.user_chair_can_manage_participation_scores(committee_conference_id)
)
WITH CHECK (
  scope = 'delegate_by_chair'
);

DROP POLICY IF EXISTS "award_participation_scores_insert_delegate_chair_feedback" ON public.award_participation_scores;
CREATE POLICY "award_participation_scores_insert_delegate_chair_feedback"
ON public.award_participation_scores FOR INSERT TO authenticated
WITH CHECK (
  scope = 'chair_by_delegate'
  AND created_by = auth.uid()
  AND public.user_delegate_can_manage_participation_feedback(committee_conference_id)
);

COMMIT;
