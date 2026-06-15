-- Server-enforced hold/approve/reject workflow for flagged delegation notes.

BEGIN;

ALTER TABLE public.delegation_notes
  ADD COLUMN IF NOT EXISTS moderation_state text NOT NULL DEFAULT 'approved'
    CHECK (moderation_state IN ('approved', 'held', 'rejected')),
  ADD COLUMN IF NOT EXISTS hold_reason text
    CHECK (hold_reason IS NULL OR hold_reason IN ('profanity', 'concern_flag', 'reported')),
  ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
  ADD COLUMN IF NOT EXISTS moderated_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS moderation_note text;

CREATE TABLE IF NOT EXISTS public.delegation_note_moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES public.delegation_notes(id) ON DELETE CASCADE,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (
    event_type IN ('auto_hold', 'manual_approve', 'manual_reject', 'report_hold')
  ),
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delegation_note_moderation_events_note
  ON public.delegation_note_moderation_events (note_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delegation_notes_moderation_state
  ON public.delegation_notes (conference_id, moderation_state, created_at DESC);

ALTER TABLE public.delegation_note_moderation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS delegation_note_moderation_events_staff_select ON public.delegation_note_moderation_events;
CREATE POLICY delegation_note_moderation_events_staff_select
  ON public.delegation_note_moderation_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

-- Mirror lib/note-moderation.ts patterns for trigger safety.
CREATE OR REPLACE FUNCTION public.delegation_note_content_is_flagged(p_content text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(
    btrim(coalesce(p_content, '')) <> ''
    AND (
      p_content ~* '\mfuck(ing|ed|er|ers)?\M'
      OR p_content ~* '\mshit(ty|ting|ted)?\M'
      OR p_content ~* '\mbitch(es|y)?\M'
      OR p_content ~* '\masshole(s)?\M'
      OR p_content ~* '\mdick(head|heads)?\M'
      OR p_content ~* '\mcunt(s)?\M'
      OR p_content ~* '\mnigg(er|a|as|ers)\M'
      OR p_content ~* '\mfag(got|gots)?\M'
      OR p_content ~* '\mretard(ed|s)?\M'
      OR p_content ~* '\mwhore(s)?\M'
    ),
    false
  );
$$;

ALTER FUNCTION public.delegation_note_content_is_flagged(text) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.fn_delegation_note_before_insert_moderation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.concern_flag OR public.delegation_note_content_is_flagged(NEW.content) THEN
    NEW.moderation_state := 'held';
    NEW.hold_reason := CASE
      WHEN NEW.concern_flag AND public.delegation_note_content_is_flagged(NEW.content) THEN 'concern_flag'
      WHEN NEW.concern_flag THEN 'concern_flag'
      ELSE 'profanity'
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_delegation_note_before_insert_moderation ON public.delegation_notes;
CREATE TRIGGER tr_delegation_note_before_insert_moderation
  BEFORE INSERT ON public.delegation_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_delegation_note_before_insert_moderation();

CREATE OR REPLACE FUNCTION public.fn_delegation_note_after_insert_moderation_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  IF NEW.moderation_state = 'held' THEN
    INSERT INTO public.delegation_note_moderation_events (
      note_id,
      actor_profile_id,
      event_type,
      reason
    ) VALUES (
      NEW.id,
      NEW.sender_profile_id,
      'auto_hold',
      NEW.hold_reason
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_delegation_note_after_insert_moderation_event ON public.delegation_notes;
CREATE TRIGGER tr_delegation_note_after_insert_moderation_event
  AFTER INSERT ON public.delegation_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_delegation_note_after_insert_moderation_event();

CREATE OR REPLACE FUNCTION public.fn_delegation_note_report_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
  UPDATE public.delegation_notes
  SET moderation_state = 'held',
      hold_reason = 'reported',
      updated_at = now()
  WHERE id = NEW.note_id
    AND moderation_state IS DISTINCT FROM 'rejected';

  INSERT INTO public.delegation_note_moderation_events (
    note_id,
    actor_profile_id,
    event_type,
    reason
  ) VALUES (
    NEW.note_id,
    NEW.chair_profile_id,
    'report_hold',
    'reported'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_delegation_note_report_hold ON public.delegation_note_reports;
CREATE TRIGGER tr_delegation_note_report_hold
  AFTER INSERT ON public.delegation_note_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_delegation_note_report_hold();

-- Recipients only see approved notes; senders always see their own.
CREATE OR REPLACE FUNCTION public.delegation_note_visible_to_delegate(p_user_id uuid, p_note_id uuid)
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
    JOIN public.conferences nc ON nc.id = n.conference_id
    JOIN public.allocations a ON a.user_id = p_user_id
    JOIN public.conferences ac ON ac.id = a.conference_id
    WHERE n.id = p_note_id
      AND ac.event_id = nc.event_id
      AND public.committee_session_group_key(ac.committee) IS NOT NULL
      AND public.committee_session_group_key(ac.committee) = public.committee_session_group_key(nc.committee)
      AND (
        a.id = n.sender_allocation_id
        OR n.sender_profile_id = p_user_id
        OR (
          n.moderation_state = 'approved'
          AND EXISTS (
            SELECT 1
            FROM public.delegation_note_recipients r
            WHERE r.note_id = n.id
              AND r.recipient_kind = 'allocation'
              AND r.recipient_allocation_id = a.id
          )
        )
      )
  );
$$;

ALTER FUNCTION public.delegation_note_visible_to_delegate(uuid, uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.notify_delegation_note_recipients(p_note_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  note_conference uuid;
  note_content text;
  note_thread uuid;
  sender_alloc uuid;
  sender_prof uuid;
  sender_alloc_user uuid;
  alloc_user uuid;
  target_user uuid;
  v_href text;
  v_title text;
  v_thread_name text;
  recip record;
BEGIN
  SELECT n.conference_id, n.content, n.sender_allocation_id, n.sender_profile_id, n.thread_id
  INTO note_conference, note_content, sender_alloc, sender_prof, note_thread
  FROM public.delegation_notes n
  WHERE n.id = p_note_id
    AND n.moderation_state = 'approved';

  IF note_conference IS NULL THEN
    RETURN;
  END IF;

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

  FOR recip IN
    SELECT *
    FROM public.delegation_note_recipients r
    WHERE r.note_id = p_note_id
  LOOP
    IF recip.recipient_kind = 'allocation' AND recip.recipient_allocation_id IS NOT NULL THEN
      SELECT a.user_id INTO alloc_user
      FROM public.allocations a
      WHERE a.id = recip.recipient_allocation_id;

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
          COALESCE(note_thread, p_note_id)
        );
      END IF;

    ELSIF recip.recipient_kind = 'chair' AND recip.recipient_profile_id IS NOT NULL THEN
      IF recip.recipient_profile_id IS DISTINCT FROM sender_prof OR sender_prof IS NULL THEN
        INSERT INTO public.user_notifications (
          user_id, conference_id, type, title, body, href, reference_id
        ) VALUES (
          recip.recipient_profile_id,
          note_conference,
          'delegation_note',
          v_title,
          LEFT(COALESCE(note_content, ''), 240),
          v_href,
          COALESCE(note_thread, p_note_id)
        );
      END IF;

    ELSIF recip.recipient_kind = 'chair_all' THEN
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
          COALESCE(note_thread, p_note_id)
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$;

ALTER FUNCTION public.notify_delegation_note_recipients(uuid) OWNER TO postgres;

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
  note_state TEXT;
  sender_alloc UUID;
  sender_prof UUID;
  sender_alloc_user UUID;
  alloc_user UUID;
  target_user UUID;
  v_href text;
  v_title text;
  v_thread_name text;
BEGIN
  SELECT n.conference_id, n.content, n.sender_allocation_id, n.sender_profile_id, n.thread_id, n.moderation_state
  INTO note_conference, note_content, sender_alloc, sender_prof, note_thread, note_state
  FROM public.delegation_notes n
  WHERE n.id = NEW.note_id;

  IF note_state IS DISTINCT FROM 'approved' THEN
    RETURN NEW;
  END IF;

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

CREATE OR REPLACE FUNCTION public.moderate_delegation_note(
  p_note_id uuid,
  p_action text,
  p_note text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_user uuid;
  v_conf uuid;
  v_old_state text;
  v_old_reason text;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_user
      AND p.role::text = 'chair'
  ) THEN
    RAISE EXCEPTION 'only chairs may moderate delegation notes';
  END IF;

  SELECT n.conference_id, n.moderation_state, n.hold_reason
  INTO v_conf, v_old_state, v_old_reason
  FROM public.delegation_notes n
  WHERE n.id = p_note_id;

  IF v_conf IS NULL THEN
    RAISE EXCEPTION 'note not found';
  END IF;

  IF NOT public.user_can_access_chamber_conference(v_user, v_conf) THEN
    RAISE EXCEPTION 'not authorized for this committee';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.delegation_notes
    SET moderation_state = 'approved',
        moderated_at = now(),
        moderated_by_profile_id = v_user,
        moderation_note = NULLIF(btrim(coalesce(p_note, '')), ''),
        updated_at = now()
    WHERE id = p_note_id;

    INSERT INTO public.delegation_note_moderation_events (
      note_id,
      actor_profile_id,
      event_type,
      reason
    ) VALUES (
      p_note_id,
      v_user,
      'manual_approve',
      NULLIF(btrim(coalesce(p_note, '')), '')
    );

    IF v_old_state = 'held' AND v_old_reason IS DISTINCT FROM 'reported' THEN
      PERFORM public.notify_delegation_note_recipients(p_note_id);
    END IF;

  ELSIF p_action = 'reject' THEN
    UPDATE public.delegation_notes
    SET moderation_state = 'rejected',
        moderated_at = now(),
        moderated_by_profile_id = v_user,
        moderation_note = NULLIF(btrim(coalesce(p_note, '')), ''),
        updated_at = now()
    WHERE id = p_note_id;

    INSERT INTO public.delegation_note_moderation_events (
      note_id,
      actor_profile_id,
      event_type,
      reason
    ) VALUES (
      p_note_id,
      v_user,
      'manual_reject',
      NULLIF(btrim(coalesce(p_note, '')), '')
    );

  ELSE
    RAISE EXCEPTION 'invalid moderation action';
  END IF;
END;
$$;

ALTER FUNCTION public.moderate_delegation_note(uuid, text, text) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.moderate_delegation_note(uuid, text, text) TO authenticated;

COMMIT;
