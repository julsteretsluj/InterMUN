BEGIN;

-- chat_messages: committee_all should respect chamber scope, not a single conference row only.
DROP POLICY IF EXISTS "chat_messages_select_committee_all" ON public.chat_messages;
CREATE POLICY "chat_messages_select_committee_all"
  ON public.chat_messages
  FOR SELECT
  USING (
    audience_scope = 'committee_all'
    AND public.user_can_access_chamber_conference(auth.uid(), chat_messages.conference_id)
  );

DROP POLICY IF EXISTS "chat_messages_insert_broadcast_staff" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_broadcast_staff"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND kind = 'broadcast'
    AND audience_scope IN ('committee_all', 'all_committees')
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
        AND p.role = chat_messages.sender_role
    )
  );

-- delegation notes: staff and delegates should be chamber-scoped.
DROP POLICY IF EXISTS delegation_notes_staff_select ON public.delegation_notes;
CREATE POLICY delegation_notes_staff_select
  ON public.delegation_notes
  FOR SELECT
  USING (
    public.user_can_access_chamber_conference(auth.uid(), delegation_notes.conference_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

DROP POLICY IF EXISTS delegation_notes_delegate_select ON public.delegation_notes;
CREATE POLICY delegation_notes_delegate_select
  ON public.delegation_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.allocations a
      JOIN public.conferences ac ON ac.id = a.conference_id
      JOIN public.conferences nc ON nc.id = delegation_notes.conference_id
      WHERE a.user_id = auth.uid()
        AND ac.event_id = nc.event_id
        AND public.committee_session_group_key(ac.committee) IS NOT NULL
        AND public.committee_session_group_key(ac.committee) = public.committee_session_group_key(nc.committee)
        AND (
          a.id = delegation_notes.sender_allocation_id
          OR EXISTS (
            SELECT 1
            FROM public.delegation_note_recipients r
            WHERE r.note_id = delegation_notes.id
              AND r.recipient_kind = 'allocation'
              AND r.recipient_allocation_id = a.id
          )
        )
    )
  );

COMMIT;
