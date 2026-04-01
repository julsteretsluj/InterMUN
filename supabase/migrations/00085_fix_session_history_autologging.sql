BEGIN;

CREATE OR REPLACE FUNCTION public.sync_committee_session_history_from_procedure_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  open_history_id uuid;
BEGIN
  SELECT h.id
  INTO open_history_id
  FROM public.committee_session_history h
  WHERE h.conference_id = NEW.conference_id
    AND h.ended_at IS NULL
  ORDER BY h.started_at DESC
  LIMIT 1;

  -- Session started (or timestamp changed while live): ensure one open history row exists.
  IF NEW.committee_session_started_at IS NOT NULL THEN
    IF TG_OP = 'UPDATE'
       AND OLD.committee_session_started_at IS NOT NULL
       AND OLD.committee_session_started_at <> NEW.committee_session_started_at
       AND open_history_id IS NOT NULL THEN
      UPDATE public.committee_session_history
      SET ended_at = now(),
          updated_at = now()
      WHERE id = open_history_id;
      open_history_id := NULL;
    END IF;

    IF open_history_id IS NULL THEN
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

  -- Session stopped: close the open history row if one exists.
  IF TG_OP = 'UPDATE'
     AND NEW.committee_session_started_at IS NULL
     AND OLD.committee_session_started_at IS NOT NULL
     AND open_history_id IS NOT NULL THEN
    UPDATE public.committee_session_history
    SET ended_at = now(),
        updated_at = now()
    WHERE id = open_history_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill: if a committee is currently live but has no open history row, create one.
INSERT INTO public.committee_session_history (conference_id, title, started_at, created_by)
SELECT
  ps.conference_id,
  'Session ' || to_char(ps.committee_session_started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC',
  ps.committee_session_started_at,
  NULL
FROM public.procedure_states ps
WHERE ps.committee_session_started_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.committee_session_history h
    WHERE h.conference_id = ps.conference_id
      AND h.ended_at IS NULL
  );

COMMIT;
