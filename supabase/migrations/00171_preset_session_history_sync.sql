BEGIN;

-- Ensure preset / admin-client session starts always open a history row, even when a
-- stale open row exists while procedure_states.committee_session_started_at is null.
CREATE OR REPLACE FUNCTION public.sync_committee_session_history_from_procedure_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  open_history_id uuid;
  effective_title text;
BEGIN
  effective_title := COALESCE(
    NULLIF(trim(COALESCE(NEW.committee_session_title, '')), ''),
    'Session ' || to_char(NEW.committee_session_started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC'
  );

  SELECT h.id
  INTO open_history_id
  FROM public.committee_session_history h
  WHERE h.conference_id = NEW.conference_id
    AND h.ended_at IS NULL
  ORDER BY h.started_at DESC
  LIMIT 1;

  -- Title-only change while session is live: sync to open history row (or create one if missing).
  IF TG_OP = 'UPDATE'
     AND NEW.committee_session_started_at IS NOT NULL
     AND OLD IS NOT NULL
     AND OLD.committee_session_started_at IS NOT NULL
     AND OLD.committee_session_started_at = NEW.committee_session_started_at
     AND (OLD.committee_session_title IS DISTINCT FROM NEW.committee_session_title) THEN
    IF open_history_id IS NOT NULL THEN
      UPDATE public.committee_session_history
      SET title = effective_title,
          updated_at = now()
      WHERE id = open_history_id;
    ELSE
      INSERT INTO public.committee_session_history (
        conference_id,
        title,
        started_at,
        created_by
      )
      VALUES (
        NEW.conference_id,
        effective_title,
        NEW.committee_session_started_at,
        auth.uid()
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Session started or restarted: close any open row, then ensure one open history row exists.
  IF NEW.committee_session_started_at IS NOT NULL THEN
    IF open_history_id IS NOT NULL THEN
      IF TG_OP = 'INSERT'
         OR OLD.committee_session_started_at IS NULL
         OR OLD.committee_session_started_at <> NEW.committee_session_started_at THEN
        UPDATE public.committee_session_history
        SET ended_at = now(),
            updated_at = now()
        WHERE id = open_history_id;
        open_history_id := NULL;
      END IF;
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
        effective_title,
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

COMMIT;
