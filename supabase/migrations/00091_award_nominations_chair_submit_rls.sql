-- Any chair allocated to a committee may submit the full draft batch (draft → pending),
-- not only the user who first created each row. The previous policy required
-- created_by = auth.uid() on UPDATE, so bulk promote could affect 0 rows with no error.

DROP POLICY IF EXISTS "Chairs can update own draft nominations" ON public.award_nominations;

CREATE POLICY "Chairs can update committee draft nominations"
ON public.award_nominations
FOR UPDATE
TO authenticated
USING (
  (
    status = 'draft'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.allocations a ON a.user_id = p.id
      WHERE p.id = auth.uid()
        AND p.role::text = 'chair'
        AND a.conference_id = award_nominations.committee_conference_id
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('smt', 'admin')
  )
)
WITH CHECK (
  (
    status IN ('draft', 'pending')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.allocations a ON a.user_id = p.id
      WHERE p.id = auth.uid()
        AND p.role::text = 'chair'
        AND a.conference_id = award_nominations.committee_conference_id
    )
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role::text IN ('smt', 'admin')
  )
);
