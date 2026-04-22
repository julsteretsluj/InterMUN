BEGIN;

ALTER TABLE public.procedure_states
  ADD COLUMN IF NOT EXISTS eu_session_phase text NOT NULL DEFAULT 'roll_call',
  ADD COLUMN IF NOT EXISTS eu_last_phase_change_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'procedure_states_eu_session_phase_check'
      AND conrelid = 'public.procedure_states'::regclass
  ) THEN
    ALTER TABLE public.procedure_states
      ADD CONSTRAINT procedure_states_eu_session_phase_check
      CHECK (
        eu_session_phase IN (
          'roll_call',
          'agenda',
          'opening_speeches',
          'cabinet_meeting',
          'shadow_meeting',
          'formal_debate',
          'resolution_debate',
          'voting_procedure',
          'closing_statements',
          'adjourned'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.procedure_states.eu_session_phase IS
  'Guided workflow phase for EU Parliament committees.';

COMMENT ON COLUMN public.procedure_states.eu_last_phase_change_at IS
  'Last timestamp when EU guided session phase changed.';

COMMIT;
