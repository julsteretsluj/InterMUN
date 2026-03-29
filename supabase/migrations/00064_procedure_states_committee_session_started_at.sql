-- SEAMUNs-style committee session: chairs start/stop; timestamp shown when live.

BEGIN;

ALTER TABLE public.procedure_states
  ADD COLUMN IF NOT EXISTS committee_session_started_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.procedure_states.committee_session_started_at IS
  'When set, committee session is live. NULL means stopped (chair start/stop control).';

COMMIT;
