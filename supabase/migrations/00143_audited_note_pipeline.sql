BEGIN;

CREATE OR REPLACE FUNCTION public.is_staff_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_user_id
      AND p.role::text IN ('chair', 'smt', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_chamber_conference(
  p_user_id uuid,
  p_conference_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH target AS (
    SELECT c.id, c.event_id, public.committee_session_group_key(c.committee) AS grp
    FROM public.conferences c
    WHERE c.id = p_conference_id
  )
  SELECT
    EXISTS (
      SELECT 1
      FROM target t
      JOIN public.profiles p ON p.id = p_user_id
      WHERE p.role::text IN ('chair', 'smt', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM target t
      JOIN public.allocations a ON a.user_id = p_user_id
      JOIN public.conferences ac ON ac.id = a.conference_id
      WHERE ac.event_id = t.event_id
        AND t.grp IS NOT NULL
        AND public.committee_session_group_key(ac.committee) = t.grp
    );
$$;

CREATE TABLE IF NOT EXISTS public.note_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.note_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.note_threads(id) ON DELETE CASCADE,
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  sender_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_allocation_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL,
  topic text,
  body text NOT NULL,
  concern_flag boolean NOT NULL DEFAULT false,
  moderation_state text NOT NULL DEFAULT 'approved'
    CHECK (moderation_state IN ('approved', 'held', 'rejected')),
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.note_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.note_messages(id) ON DELETE CASCADE,
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  recipient_kind text NOT NULL CHECK (recipient_kind IN ('allocation', 'chair', 'chair_all', 'smt_all')),
  recipient_allocation_id uuid REFERENCES public.allocations(id) ON DELETE CASCADE,
  recipient_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (recipient_kind = 'allocation' AND recipient_allocation_id IS NOT NULL AND recipient_profile_id IS NULL)
    OR (recipient_kind = 'chair' AND recipient_profile_id IS NOT NULL AND recipient_allocation_id IS NULL)
    OR (recipient_kind IN ('chair_all', 'smt_all') AND recipient_profile_id IS NULL AND recipient_allocation_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.note_delivery_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.note_messages(id) ON DELETE CASCADE,
  recipient_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivery_status text NOT NULL DEFAULT 'queued'
    CHECK (delivery_status IN ('queued', 'delivered', 'read', 'moderated_hold', 'rejected')),
  delivered_at timestamptz,
  read_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, recipient_profile_id)
);

CREATE TABLE IF NOT EXISTS public.note_moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.note_messages(id) ON DELETE CASCADE,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('auto_hold', 'auto_reject', 'manual_approve', 'manual_reject')),
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.note_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.note_messages(id) ON DELETE CASCADE,
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('message_created', 'message_updated', 'message_moderated', 'receipt_updated')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  published boolean NOT NULL DEFAULT false,
  attempt_count int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_note_threads_conference ON public.note_threads (conference_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_messages_thread ON public.note_messages (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_messages_conference ON public.note_messages (conference_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_recipients_message ON public.note_recipients (message_id);
CREATE INDEX IF NOT EXISTS idx_note_receipts_recipient_status ON public.note_delivery_receipts (recipient_profile_id, delivery_status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_note_outbox_publish ON public.note_outbox (published, created_at);

ALTER TABLE public.note_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_moderation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY note_threads_select ON public.note_threads
FOR SELECT TO authenticated
USING (public.user_can_access_chamber_conference(auth.uid(), conference_id));

CREATE POLICY note_threads_insert ON public.note_threads
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.user_can_access_chamber_conference(auth.uid(), conference_id)
);

CREATE POLICY note_messages_select ON public.note_messages
FOR SELECT TO authenticated
USING (public.user_can_access_chamber_conference(auth.uid(), conference_id));

CREATE POLICY note_messages_insert ON public.note_messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_profile_id = auth.uid()
  AND public.user_can_access_chamber_conference(auth.uid(), conference_id)
);

CREATE POLICY note_messages_update_staff ON public.note_messages
FOR UPDATE TO authenticated
USING (public.is_staff_user(auth.uid()))
WITH CHECK (public.is_staff_user(auth.uid()));

CREATE POLICY note_recipients_select ON public.note_recipients
FOR SELECT TO authenticated
USING (public.user_can_access_chamber_conference(auth.uid(), conference_id));

CREATE POLICY note_recipients_insert ON public.note_recipients
FOR INSERT TO authenticated
WITH CHECK (
  public.user_can_access_chamber_conference(auth.uid(), conference_id)
  AND EXISTS (
    SELECT 1
    FROM public.note_messages m
    WHERE m.id = note_recipients.message_id
      AND m.conference_id = note_recipients.conference_id
      AND m.sender_profile_id = auth.uid()
  )
);

CREATE POLICY note_receipts_select ON public.note_delivery_receipts
FOR SELECT TO authenticated
USING (
  recipient_profile_id = auth.uid()
  OR public.is_staff_user(auth.uid())
);

CREATE POLICY note_receipts_upsert_self ON public.note_delivery_receipts
FOR INSERT TO authenticated
WITH CHECK (
  recipient_profile_id = auth.uid()
  OR public.is_staff_user(auth.uid())
);

CREATE POLICY note_receipts_update_self ON public.note_delivery_receipts
FOR UPDATE TO authenticated
USING (
  recipient_profile_id = auth.uid()
  OR public.is_staff_user(auth.uid())
)
WITH CHECK (
  recipient_profile_id = auth.uid()
  OR public.is_staff_user(auth.uid())
);

CREATE POLICY note_moderation_select_staff ON public.note_moderation_events
FOR SELECT TO authenticated
USING (public.is_staff_user(auth.uid()));

CREATE POLICY note_moderation_insert_staff ON public.note_moderation_events
FOR INSERT TO authenticated
WITH CHECK (public.is_staff_user(auth.uid()));

CREATE POLICY note_outbox_select_staff ON public.note_outbox
FOR SELECT TO authenticated
USING (public.is_staff_user(auth.uid()));

CREATE POLICY note_outbox_insert_staff ON public.note_outbox
FOR INSERT TO authenticated
WITH CHECK (public.is_staff_user(auth.uid()));

CREATE POLICY note_outbox_update_staff ON public.note_outbox
FOR UPDATE TO authenticated
USING (public.is_staff_user(auth.uid()))
WITH CHECK (public.is_staff_user(auth.uid()));

COMMIT;
