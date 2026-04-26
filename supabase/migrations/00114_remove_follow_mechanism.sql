BEGIN;

-- Remove source visibility policies that depend on follows.
DROP POLICY IF EXISTS "sources_select_delegate_own_or_followed" ON public.sources;
DROP POLICY IF EXISTS "sources_select_staff_all" ON public.sources;

-- Keep source visibility explicit after removing follow relationships.
CREATE POLICY "sources_select_delegate_own_only"
  ON public.sources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'delegate'
    )
    AND sources.user_id = auth.uid()
  );

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

-- Remove follow RPC surface.
DROP FUNCTION IF EXISTS public.get_following_for_follower(UUID);
DROP FUNCTION IF EXISTS public.get_my_following(UUID);
DROP FUNCTION IF EXISTS public.resolve_profile_exact(TEXT, UUID);

-- Remove follow relationship table.
DROP TABLE IF EXISTS public.follows;

COMMIT;
