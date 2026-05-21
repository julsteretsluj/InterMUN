-- Threaded delegation note replies + named chats after 3+ messages.

BEGIN;

CREATE TABLE IF NOT EXISTS public.delegation_note_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  root_note_id uuid REFERENCES public.delegation_notes(id) ON DELETE SET NULL,
  display_name text,
  message_count integer NOT NULL DEFAULT 0,
  named_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delegation_note_threads_conference
  ON public.delegation_note_threads (conference_id, updated_at DESC);

ALTER TABLE public.delegation_notes
  ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES public.delegation_note_threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_note_id uuid REFERENCES public.delegation_notes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_delegation_notes_thread
  ON public.delegation_notes (thread_id, created_at ASC);

-- Backfill: one thread per existing note.
INSERT INTO public.delegation_note_threads (conference_id, root_note_id, message_count)
SELECT n.conference_id, n.id, 1
FROM public.delegation_notes n
WHERE n.thread_id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.delegation_note_threads t
    WHERE t.root_note_id = n.id
  );

UPDATE public.delegation_notes n
SET thread_id = t.id
FROM public.delegation_note_threads t
WHERE t.root_note_id = n.id
  AND n.thread_id IS NULL;

CREATE OR REPLACE FUNCTION public.copy_delegation_note_recipients_from_root(
  p_note_id uuid,
  p_root_note_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF p_root_note_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.delegation_note_recipients (
    note_id,
    recipient_kind,
    recipient_allocation_id,
    recipient_profile_id
  )
  SELECT
    p_note_id,
    r.recipient_kind,
    r.recipient_allocation_id,
    r.recipient_profile_id
  FROM public.delegation_note_recipients r
  WHERE r.note_id = p_root_note_id
  ON CONFLICT DO NOTHING;
END;
$$;

ALTER FUNCTION public.copy_delegation_note_recipients_from_root(uuid, uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.maybe_auto_name_delegation_note_thread(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_display_name text;
  v_topic text;
  v_labels text[];
BEGIN
  SELECT t.display_name INTO v_display_name
  FROM public.delegation_note_threads t
  WHERE t.id = p_thread_id;

  IF v_display_name IS NOT NULL AND btrim(v_display_name) <> '' THEN
    RETURN;
  END IF;

  SELECT n.topic INTO v_topic
  FROM public.delegation_note_threads t
  JOIN public.delegation_notes n ON n.id = t.root_note_id
  WHERE t.id = p_thread_id;

  SELECT array_agg(DISTINCT label ORDER BY label)
  INTO v_labels
  FROM (
    SELECT coalesce(nullif(btrim(a.country), ''), 'Delegate') AS label
    FROM public.delegation_notes n
    JOIN public.allocations a ON a.id = n.sender_allocation_id
    WHERE n.thread_id = p_thread_id
      AND n.sender_allocation_id IS NOT NULL
    UNION
    SELECT coalesce(nullif(btrim(p.name), ''), 'Staff') AS label
    FROM public.delegation_notes n
    JOIN public.profiles p ON p.id = n.sender_profile_id
    WHERE n.thread_id = p_thread_id
      AND n.sender_profile_id IS NOT NULL
    UNION
    SELECT coalesce(nullif(btrim(a.country), ''), 'Delegate') AS label
    FROM public.delegation_note_threads t
    JOIN public.delegation_note_recipients r ON r.note_id = t.root_note_id
    JOIN public.allocations a ON a.id = r.recipient_allocation_id
    WHERE t.id = p_thread_id
      AND r.recipient_kind = 'allocation'
    UNION
    SELECT coalesce(nullif(btrim(p.name), ''), 'Chair') AS label
    FROM public.delegation_note_threads t
    JOIN public.delegation_note_recipients r ON r.note_id = t.root_note_id
    JOIN public.profiles p ON p.id = r.recipient_profile_id
    WHERE t.id = p_thread_id
      AND r.recipient_kind = 'chair'
  ) s
  WHERE label IS NOT NULL;

  v_display_name := array_to_string((v_labels)[1:3], ' · ');
  IF v_topic IS NOT NULL AND btrim(v_topic) <> '' THEN
    v_display_name := CASE
      WHEN v_display_name IS NULL OR v_display_name = '' THEN initcap(v_topic)
      ELSE v_display_name || ' · ' || initcap(v_topic)
    END;
  END IF;

  IF v_display_name IS NULL OR btrim(v_display_name) = '' THEN
    v_display_name := 'Note chat';
  END IF;

  UPDATE public.delegation_note_threads
  SET display_name = v_display_name,
      named_at = coalesce(named_at, now()),
      updated_at = now()
  WHERE id = p_thread_id
    AND (display_name IS NULL OR btrim(display_name) = '');
END;
$$;

ALTER FUNCTION public.maybe_auto_name_delegation_note_thread(uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.fn_delegation_note_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_thread_id uuid;
  v_root_id uuid;
  v_count integer;
BEGIN
  IF NEW.thread_id IS NULL AND NEW.reply_to_note_id IS NULL THEN
    INSERT INTO public.delegation_note_threads (conference_id, root_note_id, message_count)
    VALUES (NEW.conference_id, NEW.id, 1)
    RETURNING id INTO v_thread_id;

    UPDATE public.delegation_notes
    SET thread_id = v_thread_id
    WHERE id = NEW.id;

    RETURN NEW;
  END IF;

  IF NEW.thread_id IS NOT NULL AND NEW.reply_to_note_id IS NOT NULL THEN
    SELECT t.root_note_id INTO v_root_id
    FROM public.delegation_note_threads t
    WHERE t.id = NEW.thread_id;

    UPDATE public.delegation_note_threads
    SET message_count = message_count + 1,
        updated_at = now()
    WHERE id = NEW.thread_id
    RETURNING message_count INTO v_count;

    PERFORM public.copy_delegation_note_recipients_from_root(NEW.id, v_root_id);

    IF v_count >= 3 THEN
      PERFORM public.maybe_auto_name_delegation_note_thread(NEW.thread_id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_delegation_note_after_insert ON public.delegation_notes;
CREATE TRIGGER tr_delegation_note_after_insert
  AFTER INSERT ON public.delegation_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_delegation_note_after_insert();

CREATE OR REPLACE FUNCTION public.user_is_delegation_note_thread_participant(
  p_user_id uuid,
  p_thread_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.delegation_notes n
    WHERE n.thread_id = p_thread_id
      AND (
        public.user_owns_delegation_note(n.id, p_user_id)
        OR public.delegation_note_visible_to_delegate(p_user_id, n.id)
      )
  )
  OR (
    public.is_staff_user(p_user_id)
    AND EXISTS (
      SELECT 1
      FROM public.delegation_note_threads t
      JOIN public.delegation_notes rn ON rn.id = t.root_note_id
      WHERE t.id = p_thread_id
        AND public.user_can_access_chamber_conference(p_user_id, rn.conference_id)
    )
  );
$$;

ALTER FUNCTION public.user_is_delegation_note_thread_participant(uuid, uuid) OWNER TO postgres;

ALTER TABLE public.delegation_note_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delegation_note_threads_select ON public.delegation_note_threads;
CREATE POLICY delegation_note_threads_select
  ON public.delegation_note_threads
  FOR SELECT
  USING (public.user_is_delegation_note_thread_participant(auth.uid(), id));

DROP POLICY IF EXISTS delegation_note_threads_update_name ON public.delegation_note_threads;
CREATE POLICY delegation_note_threads_update_name
  ON public.delegation_note_threads
  FOR UPDATE
  USING (
    public.user_is_delegation_note_thread_participant(auth.uid(), id)
    AND message_count >= 3
  )
  WITH CHECK (
    public.user_is_delegation_note_thread_participant(auth.uid(), id)
    AND message_count >= 3
  );

DROP POLICY IF EXISTS delegation_notes_insert_thread_reply ON public.delegation_notes;
CREATE POLICY delegation_notes_insert_thread_reply
  ON public.delegation_notes
  FOR INSERT
  WITH CHECK (
    thread_id IS NOT NULL
    AND reply_to_note_id IS NOT NULL
    AND public.user_is_delegation_note_thread_participant(auth.uid(), thread_id)
    AND (
      EXISTS (
        SELECT 1
        FROM public.allocations a
        WHERE a.id = delegation_notes.sender_allocation_id
          AND a.user_id = auth.uid()
      )
      OR delegation_notes.sender_profile_id = auth.uid()
    )
  );

-- Notifications link to thread when available.
CREATE OR REPLACE FUNCTION public.fn_notify_delegation_note_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  note_conference UUID;
  note_content TEXT;
  note_thread UUID;
  sender_alloc UUID;
  sender_prof UUID;
  sender_alloc_user UUID;
  alloc_user UUID;
  target_user UUID;
  v_href text;
  v_title text;
  v_thread_name text;
BEGIN
  SELECT n.conference_id, n.content, n.sender_allocation_id, n.sender_profile_id, n.thread_id
  INTO note_conference, note_content, sender_alloc, sender_prof, note_thread
  FROM public.delegation_notes n
  WHERE n.id = NEW.note_id;

  v_href := CASE
    WHEN note_thread IS NOT NULL THEN '/chats-notes?thread=' || note_thread::text
    ELSE '/chats-notes'
  END;

  IF note_thread IS NOT NULL THEN
    SELECT t.display_name INTO v_thread_name
    FROM public.delegation_note_threads t
    WHERE t.id = note_thread;
  END IF;

  v_title := CASE
    WHEN v_thread_name IS NOT NULL AND btrim(v_thread_name) <> '' THEN 'Reply: ' || v_thread_name
    WHEN note_thread IS NOT NULL THEN 'New reply in note chat'
    ELSE 'New delegation note'
  END;

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
        v_title,
        LEFT(COALESCE(note_content, ''), 240),
        v_href,
        COALESCE(note_thread, NEW.note_id)
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
        v_title,
        LEFT(COALESCE(note_content, ''), 240),
        v_href,
        COALESCE(note_thread, NEW.note_id)
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
        v_title,
        LEFT(COALESCE(note_content, ''), 240),
        v_href,
        COALESCE(note_thread, NEW.note_id)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
