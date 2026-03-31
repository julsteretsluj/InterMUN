-- Add chair notes as a first-class document type editable on-site.

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_doc_type_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_doc_type_check
  CHECK (doc_type IN ('position_paper', 'prep_doc', 'chair_report', 'rop', 'chair_notes'));

-- Owners can manage their own prep docs and chair notes.
DROP POLICY IF EXISTS "Users manage own prep docs" ON public.documents;
CREATE POLICY "Users manage own prep docs and chair notes"
  ON public.documents
  FOR ALL
  USING (auth.uid() = user_id AND doc_type IN ('prep_doc', 'chair_notes'))
  WITH CHECK (auth.uid() = user_id AND doc_type IN ('prep_doc', 'chair_notes'));

