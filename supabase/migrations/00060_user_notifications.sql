-- In-app notifications (bell): populated by triggers; users read via RLS.

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conference_id UUID REFERENCES public.conferences(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT NOT NULL DEFAULT '/chats-notes',
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_notifications_select_own" ON public.user_notifications;
CREATE POLICY "user_notifications_select_own"
  ON public.user_notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_notifications_update_own" ON public.user_notifications;
CREATE POLICY "user_notifications_update_own"
  ON public.user_notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Enable Realtime for this table in Supabase Dashboard → Database → Publications, or:
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- ---------- delegation_note_recipients -> notifications ----------
CREATE OR REPLACE FUNCTION public.fn_notify_delegation_note_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  note_conference UUID;
  note_content TEXT;
  sender_alloc UUID;
  sender_prof UUID;
  sender_alloc_user UUID;
  alloc_user UUID;
  target_user UUID;
BEGIN
  SELECT n.conference_id, n.content, n.sender_allocation_id, n.sender_profile_id
  INTO note_conference, note_content, sender_alloc, sender_prof
  FROM public.delegation_notes n
  WHERE n.id = NEW.note_id;

  IF sender_alloc IS NOT NULL THEN
    SELECT a.user_id INTO sender_alloc_user FROM public.allocations a WHERE a.id = sender_alloc;
  END IF;

  IF NEW.recipient_kind = 'allocation' AND NEW.recipient_allocation_id IS NOT NULL THEN
    SELECT a.user_id INTO alloc_user FROM public.allocations a WHERE a.id = NEW.recipient_allocation_id;
    IF alloc_user IS NOT NULL AND alloc_user IS DISTINCT FROM sender_alloc_user THEN
      INSERT INTO public.user_notifications (
        user_id, conference_id, type, title, body, href, reference_id
      ) VALUES (
        alloc_user,
        note_conference,
        'delegation_note',
        'New delegation note',
        LEFT(COALESCE(note_content, ''), 240),
        '/chats-notes',
        NEW.note_id
      );
    END IF;

  ELSIF NEW.recipient_kind = 'chair' AND NEW.recipient_profile_id IS NOT NULL THEN
    IF NEW.recipient_profile_id IS DISTINCT FROM sender_prof OR sender_prof IS NULL THEN
      INSERT INTO public.user_notifications (
        user_id, conference_id, type, title, body, href, reference_id
      ) VALUES (
        NEW.recipient_profile_id,
        note_conference,
        'delegation_note',
        'New delegation note',
        LEFT(COALESCE(note_content, ''), 240),
        '/chats-notes',
        NEW.note_id
      );
    END IF;

  ELSIF NEW.recipient_kind = 'chair_all' THEN
    FOR target_user IN
      SELECT DISTINCT a.user_id
      FROM public.allocations a
      WHERE a.conference_id = note_conference
        AND a.user_id IS NOT NULL
        AND (
          lower(trim(a.country)) = 'head chair'
          OR lower(trim(a.country)) IN ('co-chair', 'co chair')
        )
        AND a.user_id IS DISTINCT FROM sender_alloc_user
        AND (sender_prof IS NULL OR a.user_id IS DISTINCT FROM sender_prof)
    LOOP
      INSERT INTO public.user_notifications (
        user_id, conference_id, type, title, body, href, reference_id
      ) VALUES (
        target_user,
        note_conference,
        'delegation_note',
        'New note (all chairs)',
        LEFT(COALESCE(note_content, ''), 240),
        '/chats-notes',
        NEW.note_id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_delegation_note_recipients_notify ON public.delegation_note_recipients;
CREATE TRIGGER tr_delegation_note_recipients_notify
  AFTER INSERT ON public.delegation_note_recipients
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_delegation_note_recipient();

-- ---------- chat broadcast -> delegates on committee ----------
CREATE OR REPLACE FUNCTION public.fn_notify_chat_broadcast()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user UUID;
BEGIN
  IF NEW.kind = 'broadcast' AND NEW.audience_scope = 'committee_all' THEN
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
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_chat_messages_broadcast_notify ON public.chat_messages;
CREATE TRIGGER tr_chat_messages_broadcast_notify
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_chat_broadcast();

-- ---------- signatory request -> main submitters ----------
CREATE OR REPLACE FUNCTION public.fn_notify_signatory_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mains UUID[];
  conf UUID;
  uid UUID;
BEGIN
  SELECT r.main_submitters, r.conference_id
  INTO mains, conf
  FROM public.resolutions r
  WHERE r.id = NEW.resolution_id;

  IF mains IS NULL THEN
    RETURN NEW;
  END IF;

  FOREACH uid IN ARRAY mains
  LOOP
    IF uid IS NOT NULL AND uid IS DISTINCT FROM NEW.user_id THEN
      INSERT INTO public.user_notifications (
        user_id, conference_id, type, title, body, href, reference_id
      ) VALUES (
        uid,
        conf,
        'signatory_request',
        'Virtual signature requested',
        'A delegate requested to sign as a signatory on your resolution.',
        '/resolutions',
        NEW.resolution_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_signatory_requests_notify ON public.signatory_requests;
CREATE TRIGGER tr_signatory_requests_notify
  AFTER INSERT ON public.signatory_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_signatory_request();
