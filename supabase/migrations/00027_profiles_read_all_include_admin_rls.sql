-- Ensure platform admins can read all profiles (staff dashboard queries).

DROP POLICY IF EXISTS "Chairs and SMT can read all profiles" ON public.profiles;

CREATE POLICY "Chairs and SMT can read all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  );

