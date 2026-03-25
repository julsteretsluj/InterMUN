-- /report visibility: staff (chair/SMT/admin) can view all reports.

DROP POLICY IF EXISTS "reports_select_staff_all" ON public.reports;
CREATE POLICY "reports_select_staff_all"
  ON public.reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  );

