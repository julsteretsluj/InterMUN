BEGIN;

CREATE OR REPLACE FUNCTION public.sync_committee_session_history_from_procedure_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Session started: create one open history row if none exists.
  IF NEW.committee_session_started_at IS NOT NULL
     AND (OLD IS NULL OR OLD.committee_session_started_at IS NULL) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.committee_session_history h
      WHERE h.conference_id = NEW.conference_id
        AND h.ended_at IS NULL
    ) THEN
      INSERT INTO public.committee_session_history (
        conference_id,
        title,
        started_at,
        created_by
      )
      VALUES (
        NEW.conference_id,
        'Session ' || to_char(NEW.committee_session_started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC',
        NEW.committee_session_started_at,
        auth.uid()
      );
    END IF;
  END IF;

  -- Session stopped: close the latest open history row.
  IF NEW.committee_session_started_at IS NULL
     AND OLD.committee_session_started_at IS NOT NULL THEN
    UPDATE public.committee_session_history
    SET ended_at = now(),
        updated_at = now()
    WHERE id = (
      SELECT h.id
      FROM public.committee_session_history h
      WHERE h.conference_id = NEW.conference_id
        AND h.ended_at IS NULL
      ORDER BY h.started_at DESC
      LIMIT 1
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_committee_session_history_from_procedure_state ON public.procedure_states;
CREATE TRIGGER trg_sync_committee_session_history_from_procedure_state
AFTER INSERT OR UPDATE OF committee_session_started_at
ON public.procedure_states
FOR EACH ROW
EXECUTE FUNCTION public.sync_committee_session_history_from_procedure_state();

COMMIT;
