-- Add SMT-uploaded chair reports as a dedicated document type.

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_doc_type_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_doc_type_check
  CHECK (doc_type IN ('position_paper', 'prep_doc', 'chair_report'));

-- Owners can manage only regular prep docs.
DROP POLICY IF EXISTS "Users manage own non-position-paper docs" ON public.documents;
CREATE POLICY "Users manage own prep docs"
  ON public.documents
  FOR ALL
  USING (auth.uid() = user_id AND doc_type = 'prep_doc')
  WITH CHECK (auth.uid() = user_id AND doc_type = 'prep_doc');

-- SMT/admin can manage chair reports for any chair account.
DROP POLICY IF EXISTS "documents_smt_admin_manage_chair_reports" ON public.documents;
CREATE POLICY "documents_smt_admin_manage_chair_reports"
  ON public.documents
  FOR ALL
  USING (
    doc_type = 'chair_report'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('smt', 'admin')
    )
  )
  WITH CHECK (
    doc_type = 'chair_report'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('smt', 'admin')
    )
  );

