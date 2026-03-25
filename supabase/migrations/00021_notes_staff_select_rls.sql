-- Enable staff (chair/SMT/admin) to READ stance + running notes from other users.
-- Edits remain restricted by existing "Users can manage own notes" policy.

DROP POLICY IF EXISTS "notes_select_staff_running_stance" ON public.notes;
CREATE POLICY "notes_select_staff_running_stance"
  ON public.notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
    AND note_type IN ('running', 'stance')
  );

