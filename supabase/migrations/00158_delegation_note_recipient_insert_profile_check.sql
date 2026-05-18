-- Recipient INSERT failed when the sender could not SELECT the target profile under RLS
-- (delegates sending to chairs; SMT self-test targeting an smt profile).

BEGIN;

CREATE OR REPLACE FUNCTION public.is_delegation_note_chair_recipient_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_profile_id
      AND p.role::text IN ('chair', 'admin', 'smt')
  );
$$;

ALTER FUNCTION public.is_delegation_note_chair_recipient_profile(uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.allocation_valid_delegation_note_recipient(
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
    FROM public.allocations a2
    JOIN public.conferences ac ON ac.id = a2.conference_id
    JOIN public.delegation_notes n ON n.id = p_note_id
    JOIN public.conferences nc ON nc.id = n.conference_id
    WHERE a2.id = p_allocation_id
      AND a2.user_id IS NOT NULL
      AND ac.event_id IS NOT DISTINCT FROM nc.event_id
      AND (
        a2.conference_id = n.conference_id
        OR public.committee_tab_key(ac) = public.committee_tab_key(nc)
        OR (
          coalesce(trim(ac.committee), '') <> ''
          AND coalesce(trim(nc.committee), '') <> ''
          AND public.committee_tab_key_normalize_committee(ac.committee)
            = public.committee_tab_key_normalize_committee(nc.committee)
        )
        OR (
          coalesce(trim(ac.committee), trim(ac.name), '') <> ''
          AND coalesce(trim(nc.committee), trim(nc.name), '') <> ''
          AND public.committee_tab_key_normalize_committee(
            coalesce(nullif(trim(ac.committee), ''), trim(ac.name))
          ) = public.committee_tab_key_normalize_committee(
            coalesce(nullif(trim(nc.committee), ''), trim(nc.name))
          )
        )
        OR lower(coalesce(nullif(trim(ac.committee), ''), trim(ac.name)))
          = lower(coalesce(nullif(trim(nc.committee), ''), trim(nc.name)))
      )
  );
$$;

ALTER FUNCTION public.allocation_valid_delegation_note_recipient(uuid, uuid) OWNER TO postgres;

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
