-- Break RLS recursion: delegation_notes SELECT referenced delegation_note_recipients
-- and recipients SELECT/INSERT referenced delegation_notes, causing infinite policy loops.

BEGIN;

CREATE OR REPLACE FUNCTION public.user_owns_delegation_note(p_note_id uuid, p_user_id uuid)
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
    JOIN public.allocations a ON a.id = n.sender_allocation_id
    WHERE n.id = p_note_id
      AND a.user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.delegation_notes n
    WHERE n.id = p_note_id
      AND n.sender_profile_id = p_user_id
  );
$$;

ALTER FUNCTION public.user_owns_delegation_note(uuid, uuid) OWNER TO postgres;

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
        OR EXISTS (
          SELECT 1
          FROM public.delegation_note_recipients r
          WHERE r.note_id = n.id
            AND r.recipient_kind = 'allocation'
            AND r.recipient_allocation_id = a.id
        )
      )
  );
$$;

ALTER FUNCTION public.delegation_note_visible_to_delegate(uuid, uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.delegation_note_conference_id(p_note_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT n.conference_id
  FROM public.delegation_notes n
  WHERE n.id = p_note_id
  LIMIT 1;
$$;

ALTER FUNCTION public.delegation_note_conference_id(uuid) OWNER TO postgres;

-- Delegates: read notes without querying recipients under RLS.
DROP POLICY IF EXISTS delegation_notes_delegate_select ON public.delegation_notes;
CREATE POLICY delegation_notes_delegate_select
  ON public.delegation_notes
  FOR SELECT
  USING (public.delegation_note_visible_to_delegate(auth.uid(), id));

-- Delegates: read recipient rows via note visibility (no delegation_notes policy hop).
DROP POLICY IF EXISTS delegation_note_recipients_delegate_select ON public.delegation_note_recipients;
CREATE POLICY delegation_note_recipients_delegate_select
  ON public.delegation_note_recipients
  FOR SELECT
  USING (public.delegation_note_visible_to_delegate(auth.uid(), note_id));

-- Insert recipients: verify ownership without SELECT on delegation_notes through RLS.
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
        AND EXISTS (
          SELECT 1
          FROM public.allocations a2
          WHERE a2.id = recipient_allocation_id
            AND a2.conference_id = public.delegation_note_conference_id(note_id)
            AND a2.user_id IS NOT NULL
        )
      )
      OR (
        recipient_kind = 'chair'
        AND recipient_profile_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = recipient_profile_id
            AND p.role::text IN ('chair', 'admin')
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
