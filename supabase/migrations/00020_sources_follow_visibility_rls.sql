-- /sources follow integration + staff CRUD permissions

-- Delegates:
-- - can SELECT their own sources
-- - can SELECT sources from users they follow
-- - can only UPDATE/DELETE their own sources (keeps existing "own only" policy)
-- Staff (chair/smt/admin):
-- - can SELECT all sources
-- - can UPDATE/DELETE any source

-- SELECT policies
DROP POLICY IF EXISTS "sources_select_staff_all" ON public.sources;
CREATE POLICY "sources_select_staff_all"
  ON public.sources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  );

DROP POLICY IF EXISTS "sources_select_delegate_own_or_followed" ON public.sources;
CREATE POLICY "sources_select_delegate_own_or_followed"
  ON public.sources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'delegate'
    )
    AND (
      sources.user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.follows f
        WHERE f.follower_id = auth.uid()
          AND f.followed_id = sources.user_id
      )
    )
  );

-- UPDATE/DELETE policies for staff
DROP POLICY IF EXISTS "sources_update_staff_any" ON public.sources;
CREATE POLICY "sources_update_staff_any"
  ON public.sources
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

DROP POLICY IF EXISTS "sources_delete_staff_any" ON public.sources;
CREATE POLICY "sources_delete_staff_any"
  ON public.sources
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  );

