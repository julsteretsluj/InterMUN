-- Bloc-scoped messaging for resolution allies (chair-moderated).

BEGIN;

CREATE TABLE IF NOT EXISTS public.bloc_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bloc_id uuid NOT NULL REFERENCES public.blocs(id) ON DELETE CASCADE,
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_allocation_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL,
  content text NOT NULL CHECK (char_length(btrim(content)) > 0),
  moderation_state text NOT NULL DEFAULT 'approved'
    CHECK (moderation_state IN ('approved', 'held', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bloc_messages_bloc_created
  ON public.bloc_messages (bloc_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_bloc_messages_conference_moderation
  ON public.bloc_messages (conference_id, moderation_state, created_at DESC);

ALTER TABLE public.bloc_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.fn_bloc_message_before_insert_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.delegation_note_content_is_flagged(NEW.content) THEN
    NEW.moderation_state := 'held';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_bloc_message_before_insert_moderation ON public.bloc_messages;
CREATE TRIGGER tr_bloc_message_before_insert_moderation
  BEFORE INSERT ON public.bloc_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_bloc_message_before_insert_moderation();

DROP POLICY IF EXISTS bloc_messages_select ON public.bloc_messages;
CREATE POLICY bloc_messages_select
  ON public.bloc_messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user(auth.uid())
    OR (
      moderation_state = 'approved'
      AND EXISTS (
        SELECT 1
        FROM public.bloc_memberships m
        WHERE m.bloc_id = bloc_messages.bloc_id
          AND m.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS bloc_messages_insert ON public.bloc_messages;
CREATE POLICY bloc_messages_insert
  ON public.bloc_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.bloc_memberships m
      WHERE m.bloc_id = bloc_messages.bloc_id
        AND m.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.blocs b
      JOIN public.resolutions r ON r.id = b.resolution_id
      WHERE b.id = bloc_messages.bloc_id
        AND r.conference_id = bloc_messages.conference_id
    )
  );

DROP POLICY IF EXISTS bloc_messages_update_staff ON public.bloc_messages;
CREATE POLICY bloc_messages_update_staff
  ON public.bloc_messages
  FOR UPDATE
  TO authenticated
  USING (public.is_staff_user(auth.uid()))
  WITH CHECK (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS bloc_messages_delete ON public.bloc_messages;
CREATE POLICY bloc_messages_delete
  ON public.bloc_messages
  FOR DELETE
  TO authenticated
  USING (sender_user_id = auth.uid() OR public.is_staff_user(auth.uid()));

COMMENT ON TABLE public.bloc_messages IS
  'Threaded bloc chat among resolution bloc members; chairs moderate held messages.';

COMMIT;
