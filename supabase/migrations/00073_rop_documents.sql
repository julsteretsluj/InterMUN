-- Add dedicated RoP documents managed by SMT/admin.

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_doc_type_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_doc_type_check
  CHECK (doc_type IN ('position_paper', 'prep_doc', 'chair_report', 'rop'));

DROP POLICY IF EXISTS "documents_smt_admin_manage_rop" ON public.documents;
CREATE POLICY "documents_smt_admin_manage_rop"
  ON public.documents
  FOR ALL
  USING (
    doc_type = 'rop'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('smt', 'admin')
    )
  )
  WITH CHECK (
    doc_type = 'rop'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('smt', 'admin')
    )
  );

