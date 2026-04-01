BEGIN;

ALTER TABLE public.procedure_states
  ADD COLUMN IF NOT EXISTS committee_session_started_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS committee_session_duration_seconds INTEGER NULL,
  ADD COLUMN IF NOT EXISTS committee_session_ends_at TIMESTAMPTZ NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
