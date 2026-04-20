-- Break RLS recursion: profiles policy "Peers can read… sibling…" reads `allocations`.
-- Policy "Chairs SMT can manage allocations" used `EXISTS (SELECT … FROM profiles …)`,
-- which re-entered `profiles` RLS and looped. Use is_staff_user() (row_security off) instead.

DROP POLICY IF EXISTS "Chairs SMT can manage allocations" ON public.allocations;

CREATE POLICY "Chairs SMT can manage allocations"
  ON public.allocations
  FOR ALL
  USING (public.is_staff_user(auth.uid()))
  WITH CHECK (public.is_staff_user(auth.uid()));
