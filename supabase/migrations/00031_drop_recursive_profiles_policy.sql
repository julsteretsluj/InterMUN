-- Hotfix: drop recursive profiles policy causing "infinite recursion detected".
-- We'll reintroduce staff-wide profile reads via a safe SECURITY DEFINER RPC later.

DROP POLICY IF EXISTS "Chairs and SMT can read all profiles" ON public.profiles;

