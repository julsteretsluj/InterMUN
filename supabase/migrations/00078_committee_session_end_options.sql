-- Optional wall-clock end or duration-from-start for committee sessions (indefinite if both unset).

BEGIN;

ALTER TABLE public.procedure_states
  ADD COLUMN IF NOT EXISTS committee_session_duration_seconds INTEGER NULL,
  ADD COLUMN IF NOT EXISTS committee_session_ends_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.procedure_states.committee_session_duration_seconds IS
  'If set while session is live, UI treats session as ending at started_at + this many seconds. Ignored if committee_session_ends_at is set.';

COMMENT ON COLUMN public.procedure_states.committee_session_ends_at IS
  'If set while session is live, session is treated as ending at this instant. Takes precedence over committee_session_duration_seconds.';

COMMIT;
