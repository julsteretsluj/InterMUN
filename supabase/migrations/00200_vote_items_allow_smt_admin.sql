-- SMT (and admin) run chair session controls including stating motions.
-- Live policies were renamed to vote_items_*_merged and remain chair-only.

DROP POLICY IF EXISTS "Chairs can manage vote_items" ON public.vote_items;
DROP POLICY IF EXISTS "Chairs SMT admin manage vote_items" ON public.vote_items;
DROP POLICY IF EXISTS vote_items_insert_merged ON public.vote_items;
DROP POLICY IF EXISTS vote_items_update_merged ON public.vote_items;
DROP POLICY IF EXISTS vote_items_delete_merged ON public.vote_items;
DROP POLICY IF EXISTS vote_items_select_merged ON public.vote_items;
DROP POLICY IF EXISTS "Authenticated can read vote_items" ON public.vote_items;

CREATE POLICY vote_items_select_merged
  ON public.vote_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY vote_items_insert_merged
  ON public.vote_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  );

CREATE POLICY vote_items_update_merged
  ON public.vote_items
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  )
  WITH CHECK (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  );

CREATE POLICY vote_items_delete_merged
  ON public.vote_items
  FOR DELETE
  TO authenticated
  USING (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  );
