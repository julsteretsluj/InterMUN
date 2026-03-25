-- /guides: staff can update guides (create/edit).

DROP POLICY IF EXISTS "guides_staff_update" ON public.guides;
CREATE POLICY "guides_staff_update"
  ON public.guides
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  );

DROP POLICY IF EXISTS "guides_staff_insert" ON public.guides;
CREATE POLICY "guides_staff_insert"
  ON public.guides
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  );

