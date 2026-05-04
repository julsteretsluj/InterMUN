BEGIN;

CREATE OR REPLACE FUNCTION public.enqueue_note_outbox_event(
  p_message_id uuid,
  p_conference_id uuid,
  p_event_type text,
  p_payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.note_outbox (message_id, conference_id, event_type, payload)
  VALUES (p_message_id, p_conference_id, p_event_type, coalesce(p_payload, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.note_message_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  v_event_version bigint;
BEGIN
  SELECT m.event_version INTO v_event_version FROM public.note_messages m WHERE m.id = NEW.id;

  FOR rec IN
    SELECT DISTINCT r.recipient_profile_id AS profile_id
    FROM public.note_recipients r
    WHERE r.message_id = NEW.id
      AND r.recipient_profile_id IS NOT NULL
  LOOP
    INSERT INTO public.note_delivery_receipts (message_id, recipient_profile_id, delivery_status, delivered_at, updated_at)
    VALUES (NEW.id, rec.profile_id, 'delivered', now(), now())
    ON CONFLICT (message_id, recipient_profile_id)
    DO UPDATE SET
      delivery_status = EXCLUDED.delivery_status,
      delivered_at = EXCLUDED.delivered_at,
      updated_at = EXCLUDED.updated_at;
  END LOOP;

  PERFORM public.enqueue_note_outbox_event(
    NEW.id,
    NEW.conference_id,
    'message_created',
    jsonb_build_object(
      'message_id', NEW.id,
      'thread_id', NEW.thread_id,
      'conference_id', NEW.conference_id,
      'event_version', coalesce(v_event_version, 0)
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_note_message_after_insert ON public.note_messages;
CREATE TRIGGER trg_note_message_after_insert
AFTER INSERT ON public.note_messages
FOR EACH ROW EXECUTE FUNCTION public.note_message_after_insert();

CREATE OR REPLACE FUNCTION public.send_note_message(
  p_conference_id uuid,
  p_thread_id uuid,
  p_topic text,
  p_body text,
  p_concern_flag boolean,
  p_sender_allocation_id uuid,
  p_idempotency_key text,
  p_recipient_alloc_ids uuid[],
  p_recipient_chair_profile_ids uuid[],
  p_any_chair boolean,
  p_to_smt_all boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_role text;
  v_thread uuid;
  v_msg uuid;
  v_body text;
  v_conf uuid;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT p.role::text INTO v_role FROM public.profiles p WHERE p.id = v_user;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'profile missing';
  END IF;

  IF NOT public.user_can_access_chamber_conference(v_user, p_conference_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_body := trim(coalesce(p_body, ''));
  IF length(v_body) = 0 THEN
    RAISE EXCEPTION 'empty message';
  END IF;

  v_conf := p_conference_id;
  IF p_thread_id IS NULL THEN
    INSERT INTO public.note_threads (conference_id, created_by)
    VALUES (v_conf, v_user)
    RETURNING id INTO v_thread;
  ELSE
    SELECT t.id INTO v_thread
    FROM public.note_threads t
    WHERE t.id = p_thread_id
      AND t.conference_id = v_conf;
    IF v_thread IS NULL THEN
      RAISE EXCEPTION 'thread not found';
    END IF;
  END IF;

  IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
    SELECT m.id INTO v_msg
    FROM public.note_messages m
    WHERE m.sender_profile_id = v_user
      AND m.conference_id = v_conf
      AND m.idempotency_key = trim(p_idempotency_key)
    ORDER BY m.created_at DESC
    LIMIT 1;
    IF v_msg IS NOT NULL THEN
      RETURN v_msg;
    END IF;
  END IF;

  INSERT INTO public.note_messages (
    thread_id,
    conference_id,
    sender_profile_id,
    sender_allocation_id,
    topic,
    body,
    concern_flag,
    idempotency_key
  ) VALUES (
    v_thread,
    v_conf,
    v_user,
    p_sender_allocation_id,
    nullif(trim(coalesce(p_topic, '')), ''),
    v_body,
    coalesce(p_concern_flag, false),
    nullif(trim(coalesce(p_idempotency_key, '')), '')
  )
  RETURNING id INTO v_msg;

  IF p_recipient_alloc_ids IS NOT NULL AND cardinality(p_recipient_alloc_ids) > 0 THEN
    INSERT INTO public.note_recipients (message_id, conference_id, recipient_kind, recipient_allocation_id)
    SELECT v_msg, v_conf, 'allocation', aid
    FROM unnest(p_recipient_alloc_ids) aid;
  END IF;

  IF p_recipient_chair_profile_ids IS NOT NULL AND cardinality(p_recipient_chair_profile_ids) > 0 THEN
    INSERT INTO public.note_recipients (message_id, conference_id, recipient_kind, recipient_profile_id)
    SELECT v_msg, v_conf, 'chair', pid
    FROM unnest(p_recipient_chair_profile_ids) pid;
  END IF;

  IF coalesce(p_any_chair, false) THEN
    INSERT INTO public.note_recipients (message_id, conference_id, recipient_kind)
    VALUES (v_msg, v_conf, 'chair_all');
  END IF;

  IF coalesce(p_to_smt_all, false) THEN
    INSERT INTO public.note_recipients (message_id, conference_id, recipient_kind)
    VALUES (v_msg, v_conf, 'smt_all');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.note_recipients r WHERE r.message_id = v_msg) THEN
    IF v_role = 'delegate' THEN
      RAISE EXCEPTION 'delegate notes require at least one recipient';
    END IF;
    INSERT INTO public.note_recipients (message_id, conference_id, recipient_kind, recipient_profile_id)
    VALUES (v_msg, v_conf, 'chair', v_user);
  END IF;

  RETURN v_msg;
END;
$$;

CREATE OR REPLACE FUNCTION public.ack_note_delivery(
  p_message_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
  v_status text;
  v_msg_conf uuid;
BEGIN
  v_user := auth.uid();
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_status := lower(trim(coalesce(p_status, 'read')));
  IF v_status NOT IN ('delivered', 'read') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;

  SELECT m.conference_id INTO v_msg_conf FROM public.note_messages m WHERE m.id = p_message_id;
  IF v_msg_conf IS NULL THEN
    RAISE EXCEPTION 'message not found';
  END IF;

  IF NOT public.user_can_access_chamber_conference(v_user, v_msg_conf) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.note_delivery_receipts (
    message_id,
    recipient_profile_id,
    delivery_status,
    delivered_at,
    read_at,
    updated_at
  ) VALUES (
    p_message_id,
    v_user,
    v_status,
    CASE WHEN v_status IN ('delivered', 'read') THEN now() ELSE NULL END,
    CASE WHEN v_status = 'read' THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (message_id, recipient_profile_id)
  DO UPDATE SET
    delivery_status = EXCLUDED.delivery_status,
    delivered_at = coalesce(public.note_delivery_receipts.delivered_at, EXCLUDED.delivered_at),
    read_at = CASE
      WHEN EXCLUDED.delivery_status = 'read' THEN coalesce(public.note_delivery_receipts.read_at, EXCLUDED.read_at)
      ELSE public.note_delivery_receipts.read_at
    END,
    updated_at = now();

  PERFORM public.enqueue_note_outbox_event(
    p_message_id,
    v_msg_conf,
    'receipt_updated',
    jsonb_build_object('message_id', p_message_id, 'recipient_profile_id', v_user, 'delivery_status', v_status)
  );
END;
$$;

COMMIT;
