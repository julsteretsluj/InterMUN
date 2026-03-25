-- /resolutions: bloc-based visibility for delegates + staff-only creation.

-- Replace broad select policy.
DROP POLICY IF EXISTS "Authenticated read resolutions" ON public.resolutions;

CREATE POLICY "resolutions_select_staff_all"
  ON public.resolutions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  );

CREATE POLICY "resolutions_select_delegate_bloc_based"
  ON public.resolutions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'delegate'
    )
    AND (
      visible_to_other_bloc = true
      OR EXISTS (
        SELECT 1
        FROM public.blocs b
        JOIN public.bloc_memberships bm ON bm.bloc_id = b.id
        WHERE b.resolution_id = resolutions.id
          AND bm.user_id = auth.uid()
      )
    )
  );

-- Staff-only insertion.
DROP POLICY IF EXISTS "Authenticated insert resolutions" ON public.resolutions;

CREATE POLICY "resolutions_insert_staff_only"
  ON public.resolutions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  );

