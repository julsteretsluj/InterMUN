-- Make delegation note notifications resilient when recipient users
-- do not yet have a row in public.profiles. Without this guard, the
-- trigger can raise a FK violation and cause note recipient inserts to fail.

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
    IF alloc_user IS NOT NULL
       AND alloc_user IS DISTINCT FROM sender_alloc_user
       AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = alloc_user) THEN
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
    IF (NEW.recipient_profile_id IS DISTINCT FROM sender_prof OR sender_prof IS NULL)
       AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = NEW.recipient_profile_id) THEN
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
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = a.user_id)
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
