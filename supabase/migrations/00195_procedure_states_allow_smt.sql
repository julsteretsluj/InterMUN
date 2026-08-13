-- SMT uses chair session controls (timer, floor, voting). Upsert hits INSERT
-- WITH CHECK even when a procedure_states row already exists, so SMT was
-- blocked by the original chair/admin-only policies.

DROP POLICY IF EXISTS procedure_states_update_chair ON public.procedure_states;
CREATE POLICY procedure_states_update_chair
  ON public.procedure_states
  FOR UPDATE
  TO authenticated
  USING (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  )
  WITH CHECK (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  );

DROP POLICY IF EXISTS procedure_states_insert_chair ON public.procedure_states;
CREATE POLICY procedure_states_insert_chair
  ON public.procedure_states
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  );
