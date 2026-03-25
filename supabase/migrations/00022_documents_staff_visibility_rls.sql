-- /documents: staff can view all, and only SMT/admin can update/delete any.

DROP POLICY IF EXISTS "documents_select_staff_all" ON public.documents;
CREATE POLICY "documents_select_staff_all"
  ON public.documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  );

DROP POLICY IF EXISTS "documents_update_smt_admin_any" ON public.documents;
CREATE POLICY "documents_update_smt_admin_any"
  ON public.documents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('smt', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('smt', 'admin')
    )
  );

DROP POLICY IF EXISTS "documents_delete_smt_admin_any" ON public.documents;
CREATE POLICY "documents_delete_smt_admin_any"
  ON public.documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('smt', 'admin')
    )
  );

