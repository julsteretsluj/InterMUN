BEGIN;

ALTER TABLE public.procedure_states
  ADD COLUMN IF NOT EXISTS committee_session_title TEXT NULL;

COMMENT ON COLUMN public.procedure_states.committee_session_title IS
  'Optional display name for the current committee session; synced to committee_session_history while live.';

-- Keep draft title aligned with the open history row when backfilling.
UPDATE public.procedure_states ps
SET committee_session_title = h.title
FROM public.committee_session_history h
WHERE h.conference_id = ps.conference_id
  AND h.ended_at IS NULL
  AND ps.committee_session_started_at IS NOT NULL
  AND (ps.committee_session_title IS NULL OR ps.committee_session_title = '');

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

DROP TRIGGER IF EXISTS trg_sync_committee_session_history_from_procedure_state ON public.procedure_states;
CREATE TRIGGER trg_sync_committee_session_history_from_procedure_state
AFTER INSERT OR UPDATE OF committee_session_started_at, committee_session_title
ON public.procedure_states
FOR EACH ROW
EXECUTE FUNCTION public.sync_committee_session_history_from_procedure_state();

COMMIT;
