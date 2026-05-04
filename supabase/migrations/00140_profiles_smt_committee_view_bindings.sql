-- Optional committee "experience" rows for secretariat (SMT) accounts: chair floor + delegate seat
-- for switching dashboard surface without changing profiles.role.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS smt_chair_conference_id uuid REFERENCES public.conferences (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS smt_delegate_allocation_id uuid REFERENCES public.allocations (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.profiles.smt_chair_conference_id IS
  'When SMT uses chair dashboard surface, floor state targets this conference row.';
COMMENT ON COLUMN public.profiles.smt_delegate_allocation_id IS
  'When SMT uses delegate dashboard surface, committee context uses this allocation (must belong to this user).';
