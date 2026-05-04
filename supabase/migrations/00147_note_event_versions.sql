BEGIN;

ALTER TABLE public.note_messages
  ADD COLUMN IF NOT EXISTS event_version bigint NOT NULL DEFAULT 1;

ALTER TABLE public.note_outbox
  ADD COLUMN IF NOT EXISTS event_version bigint NOT NULL DEFAULT 1;

CREATE SEQUENCE IF NOT EXISTS public.note_event_version_seq;

CREATE OR REPLACE FUNCTION public.bump_note_event_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.event_version := nextval('public.note_event_version_seq');
  ELSE
    NEW.event_version := nextval('public.note_event_version_seq');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_note_event_version_insert ON public.note_messages;
CREATE TRIGGER trg_bump_note_event_version_insert
BEFORE INSERT ON public.note_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_note_event_version();

DROP TRIGGER IF EXISTS trg_bump_note_event_version_update ON public.note_messages;
CREATE TRIGGER trg_bump_note_event_version_update
BEFORE UPDATE ON public.note_messages
FOR EACH ROW EXECUTE FUNCTION public.bump_note_event_version();

COMMIT;
