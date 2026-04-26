-- Expand announcement scope and route dais/chat announcements into user_notifications.

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_audience_scope_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_audience_scope_check
  CHECK (audience_scope IN ('self', 'committee_all', 'all_committees'));

DROP POLICY IF EXISTS "chat_messages_insert_broadcast_staff" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_broadcast_staff"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND kind = 'broadcast'
    AND (
      (
        audience_scope = 'committee_all'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('chair', 'smt', 'admin')
            AND p.role = chat_messages.sender_role
        )
      )
      OR (
        audience_scope = 'all_committees'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('smt', 'admin')
            AND p.role = chat_messages.sender_role
        )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.fn_notify_chat_broadcast()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user UUID;
BEGIN
  IF NEW.kind = 'broadcast' THEN
    IF NEW.audience_scope = 'committee_all' THEN
      FOR target_user IN
        SELECT DISTINCT a.user_id
        FROM public.allocations a
        WHERE a.conference_id = NEW.conference_id
          AND a.user_id IS NOT NULL
          AND a.user_id IS DISTINCT FROM NEW.sender_id
      LOOP
        INSERT INTO public.user_notifications (
          user_id, conference_id, type, title, body, href, reference_id
        ) VALUES (
          target_user,
          NEW.conference_id,
          'committee_broadcast',
          'Committee announcement',
          LEFT(COALESCE(NEW.content, ''), 240),
          '/chats-notes',
          NEW.id
        );
      END LOOP;
    ELSIF NEW.audience_scope = 'all_committees' THEN
      FOR target_user IN
        SELECT DISTINCT a.user_id
        FROM public.allocations a
        WHERE a.user_id IS NOT NULL
          AND a.user_id IS DISTINCT FROM NEW.sender_id
      LOOP
        INSERT INTO public.user_notifications (
          user_id, conference_id, type, title, body, href, reference_id
        ) VALUES (
          target_user,
          NEW.conference_id,
          'smt_broadcast',
          'SMT announcement',
          LEFT(COALESCE(NEW.content, ''), 240),
          '/chats-notes',
          NEW.id
        );
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_notify_dais_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user UUID;
BEGIN
  FOR target_user IN
    SELECT DISTINCT a.user_id
    FROM public.allocations a
    WHERE a.conference_id = NEW.conference_id
      AND a.user_id IS NOT NULL
      AND a.user_id IS DISTINCT FROM NEW.created_by
  LOOP
    INSERT INTO public.user_notifications (
      user_id, conference_id, type, title, body, href, reference_id
    ) VALUES (
      target_user,
      NEW.conference_id,
      'dais_announcement',
      'Dais announcement',
      LEFT(COALESCE(NEW.body, ''), 240),
      '/committee-room',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_dais_announcements_notify ON public.dais_announcements;
CREATE TRIGGER tr_dais_announcements_notify
  AFTER INSERT ON public.dais_announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_dais_announcement();
