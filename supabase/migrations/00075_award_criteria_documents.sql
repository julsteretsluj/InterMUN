-- Add SMT-uploaded award criteria documents.

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_doc_type_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_doc_type_check
  CHECK (
    doc_type IN (
      'position_paper',
      'prep_doc',
      'chair_report',
      'rop',
      'chair_notes',
      'award_criteria'
    )
  );

DROP POLICY IF EXISTS "documents_smt_admin_manage_award_criteria" ON public.documents;
CREATE POLICY "documents_smt_admin_manage_award_criteria"
  ON public.documents
  FOR ALL
  USING (
    doc_type = 'award_criteria'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('smt', 'admin')
    )
  )
  WITH CHECK (
    doc_type = 'award_criteria'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('smt', 'admin')
    )
  );

