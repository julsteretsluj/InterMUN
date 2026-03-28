-- Stance notes are delegate prep; dais chairs may read them (00021) but must not create or edit them.
-- The app already sets canEdit only for delegates; this closes the gap where RLS allowed any role
-- to mutate rows with user_id = auth.uid().

DROP POLICY IF EXISTS notes_stance_chair_no_insert ON public.notes;
CREATE POLICY notes_stance_chair_no_insert
  ON public.notes
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    note_type IS DISTINCT FROM 'stance'
    OR NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'chair'
    )
  );

DROP POLICY IF EXISTS notes_stance_chair_no_update ON public.notes;
CREATE POLICY notes_stance_chair_no_update
  ON public.notes
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (
    note_type IS DISTINCT FROM 'stance'
    OR NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'chair'
    )
  )
  WITH CHECK (
    note_type IS DISTINCT FROM 'stance'
    OR NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'chair'
    )
  );

DROP POLICY IF EXISTS notes_stance_chair_no_delete ON public.notes;
CREATE POLICY notes_stance_chair_no_delete
  ON public.notes
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (
    note_type IS DISTINCT FROM 'stance'
    OR NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'chair'
    )
  );
