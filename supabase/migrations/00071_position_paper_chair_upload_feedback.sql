-- Position-paper workflow:
-- - Delegates cannot create/update documents with doc_type='position_paper'
-- - Chairs/SMT/admin can upload/update position papers for delegates
-- - Chair feedback is stored per document

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS chair_feedback text;

-- Keep existing owner policy for non-position-paper docs only.
DROP POLICY IF EXISTS "Users manage own documents" ON public.documents;
CREATE POLICY "Users manage own non-position-paper docs"
  ON public.documents
  FOR ALL
  USING (auth.uid() = user_id AND doc_type <> 'position_paper')
  WITH CHECK (auth.uid() = user_id AND doc_type <> 'position_paper');

-- Staff can upload/update/delete position papers for any delegate.
DROP POLICY IF EXISTS "documents_staff_manage_position_paper" ON public.documents;
CREATE POLICY "documents_staff_manage_position_paper"
  ON public.documents
  FOR ALL
  USING (
    doc_type = 'position_paper'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  )
  WITH CHECK (
    doc_type = 'position_paper'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

