-- Chat: replace per-user notes with a dedicated chat_messages table.
-- Supports:
-- - personal messages visible only to sender ("self")
-- - broadcast/announcement visible to everyone in the committee ("committee_all")
-- - exact committee scoping via conference_id (maps to `conferences` rows)

-- Message kind:
-- - personal: sender only
-- - broadcast: announcement; delegates must be on the committee to see

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role public.user_role NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('personal', 'broadcast')),
  audience_scope TEXT NOT NULL CHECK (audience_scope IN ('self', 'committee_all')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conference_created
  ON public.chat_messages (conference_id, created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- SELECT:
-- - personal: only sender
-- - broadcast (committee_all): staff OR delegates on this conference
DROP POLICY IF EXISTS "chat_messages_select_personal_sender" ON public.chat_messages;
CREATE POLICY "chat_messages_select_personal_sender"
  ON public.chat_messages
  FOR SELECT
  USING (
    audience_scope = 'self'
    AND sender_id = auth.uid()
  );

DROP POLICY IF EXISTS "chat_messages_select_committee_all" ON public.chat_messages;
CREATE POLICY "chat_messages_select_committee_all"
  ON public.chat_messages
  FOR SELECT
  USING (
    audience_scope = 'committee_all'
    AND (
      -- Staff can see broadcasts in any conference.
      EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('chair', 'smt', 'admin')
      )
      OR
      -- Delegates can see broadcasts only if they are allocated to this committee.
      EXISTS (
        SELECT 1
        FROM public.allocations a
        WHERE a.conference_id = chat_messages.conference_id
          AND a.user_id = auth.uid()
      )
    )
  );

-- INSERT:
-- - personal messages:
--   - everyone: visible only to sender
-- - broadcast messages:
--   - staff only (delegates cannot insert broadcast)
DROP POLICY IF EXISTS "chat_messages_insert_personal" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_personal"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND kind = 'personal'
    AND audience_scope = 'self'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = chat_messages.sender_role
    )
  );

DROP POLICY IF EXISTS "chat_messages_insert_broadcast_staff" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_broadcast_staff"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND kind = 'broadcast'
    AND audience_scope = 'committee_all'
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
        AND p.role = chat_messages.sender_role
    )
  );

-- UPDATE/DELETE:
-- SMT/admin can edit or delete any message.
DROP POLICY IF EXISTS "chat_messages_update_smt_admin" ON public.chat_messages;
CREATE POLICY "chat_messages_update_smt_admin"
  ON public.chat_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('smt', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('smt', 'admin')
    )
  );

DROP POLICY IF EXISTS "chat_messages_delete_smt_admin" ON public.chat_messages;
CREATE POLICY "chat_messages_delete_smt_admin"
  ON public.chat_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('smt', 'admin')
    )
  );

