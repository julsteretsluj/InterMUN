-- Allow chairs (and SMT/admin with committee access) to clear an optional pending nomination row.
DROP POLICY IF EXISTS "Chairs can delete own pending nominations for own committee" ON public.award_nominations;

CREATE POLICY "Chairs can delete own pending nominations for own committee"
ON public.award_nominations
FOR DELETE
TO authenticated
USING (
  status = 'pending'
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
