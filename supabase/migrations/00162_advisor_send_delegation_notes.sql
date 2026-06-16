-- Advisors may send delegation notes to assigned delegates and follow the thread.

BEGIN;

CREATE OR REPLACE FUNCTION public.advisor_note_recipient_allocation(
  p_advisor_id uuid,
  p_allocation_id uuid,
  p_note_id uuid
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
    JOIN public.advisor_delegate_assignments ada
      ON ada.advisor_profile_id = p_advisor_id
      AND ada.delegate_allocation_id = p_allocation_id
      AND ada.conference_id = n.conference_id
    WHERE n.id = p_note_id
      AND n.sender_profile_id = p_advisor_id
      AND public.is_advisor_user(p_advisor_id)
  );
$$;

ALTER FUNCTION public.advisor_note_recipient_allocation(uuid, uuid, uuid) OWNER TO postgres;

DROP POLICY IF EXISTS delegation_notes_advisor_forwarded_select ON public.delegation_notes;
CREATE POLICY delegation_notes_advisor_select
  ON public.delegation_notes
  FOR SELECT
  USING (
    public.is_advisor_user(auth.uid())
    AND public.user_can_access_chamber_conference(auth.uid(), conference_id)
    AND (
      forwarded_to_advisor_profile_id = auth.uid()
      OR sender_profile_id = auth.uid()
      OR (
        thread_id IS NOT NULL
        AND public.user_is_delegation_note_thread_participant(auth.uid(), thread_id)
      )
    )
  );

DROP POLICY IF EXISTS delegation_notes_insert_advisor_sender ON public.delegation_notes;
CREATE POLICY delegation_notes_insert_advisor_sender
  ON public.delegation_notes
  FOR INSERT
  WITH CHECK (
    public.is_advisor_user(auth.uid())
    AND sender_profile_id = auth.uid()
    AND sender_allocation_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.advisor_delegate_assignments ada
      WHERE ada.advisor_profile_id = auth.uid()
        AND ada.conference_id = delegation_notes.conference_id
    )
  );

DROP POLICY IF EXISTS delegation_note_recipients_advisor_select ON public.delegation_note_recipients;
CREATE POLICY delegation_note_recipients_advisor_select
  ON public.delegation_note_recipients
  FOR SELECT
  USING (
    public.is_advisor_user(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.delegation_notes n
      WHERE n.id = delegation_note_recipients.note_id
        AND public.user_can_access_chamber_conference(auth.uid(), n.conference_id)
        AND (
          n.forwarded_to_advisor_profile_id = auth.uid()
          OR n.sender_profile_id = auth.uid()
          OR (
            n.thread_id IS NOT NULL
            AND public.user_is_delegation_note_thread_participant(auth.uid(), n.thread_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS delegation_note_recipients_insert ON public.delegation_note_recipients;
CREATE POLICY delegation_note_recipients_insert
  ON public.delegation_note_recipients
  FOR INSERT
  WITH CHECK (
    public.user_owns_delegation_note(note_id, auth.uid())
    AND (
      (
        recipient_kind = 'allocation'
        AND recipient_allocation_id IS NOT NULL
        AND public.advisor_note_recipient_allocation(auth.uid(), recipient_allocation_id, note_id)
      )
      OR (
        recipient_kind = 'allocation'
        AND recipient_allocation_id IS NOT NULL
        AND public.allocation_valid_delegation_note_recipient(recipient_allocation_id, note_id)
      )
      OR (
        recipient_kind = 'chair'
        AND recipient_profile_id IS NOT NULL
        AND (
          public.is_delegation_note_chair_recipient_profile(recipient_profile_id)
          OR recipient_profile_id = auth.uid()
        )
      )
      OR (
        recipient_kind = 'chair_all'
        AND recipient_profile_id IS NULL
        AND recipient_allocation_id IS NULL
      )
    )
  );

COMMIT;
