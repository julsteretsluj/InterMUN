-- Advisor role: oversight of assigned delegate(s); no access to notes unless chair/SMT forwards.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role' AND e.enumlabel = 'advisor'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'advisor';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.advisor_delegate_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delegate_allocation_id uuid NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (advisor_profile_id, delegate_allocation_id),
  UNIQUE (delegate_allocation_id)
);

CREATE INDEX IF NOT EXISTS idx_advisor_delegate_assignments_advisor
  ON public.advisor_delegate_assignments (advisor_profile_id);

CREATE INDEX IF NOT EXISTS idx_advisor_delegate_assignments_conference
  ON public.advisor_delegate_assignments (conference_id);

ALTER TABLE public.delegation_notes
  ADD COLUMN IF NOT EXISTS forwarded_to_advisor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.delegation_notes
  ADD COLUMN IF NOT EXISTS forwarded_to_advisor_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_advisor_user(p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_uid AND p.role::text = 'advisor'
  );
$$;

ALTER FUNCTION public.is_advisor_user(uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.advisor_can_view_delegate_user(
  p_advisor_id uuid,
  p_delegate_user_id uuid
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
    FROM public.advisor_delegate_assignments ada
    JOIN public.allocations a ON a.id = ada.delegate_allocation_id
    WHERE ada.advisor_profile_id = p_advisor_id
      AND a.user_id = p_delegate_user_id
  );
$$;

ALTER FUNCTION public.advisor_can_view_delegate_user(uuid, uuid) OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.advisor_profile_for_allocation(p_allocation_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT ada.advisor_profile_id
  FROM public.advisor_delegate_assignments ada
  WHERE ada.delegate_allocation_id = p_allocation_id
  LIMIT 1;
$$;

ALTER FUNCTION public.advisor_profile_for_allocation(uuid) OWNER TO postgres;

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
    )
    OR EXISTS (
      SELECT 1
      FROM target t
      JOIN public.advisor_delegate_assignments ada ON ada.advisor_profile_id = p_user_id
      JOIN public.conferences ac ON ac.id = ada.conference_id
      WHERE ac.event_id = t.event_id
        AND t.grp IS NOT NULL
        AND public.committee_session_group_key(ac.committee) = t.grp
    );
$$;

ALTER TABLE public.advisor_delegate_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS advisor_assignments_staff_all ON public.advisor_delegate_assignments;
CREATE POLICY advisor_assignments_staff_all
  ON public.advisor_delegate_assignments
  FOR ALL
  USING (public.is_staff_user(auth.uid()))
  WITH CHECK (public.is_staff_user(auth.uid()));

DROP POLICY IF EXISTS advisor_assignments_advisor_select ON public.advisor_delegate_assignments;
CREATE POLICY advisor_assignments_advisor_select
  ON public.advisor_delegate_assignments
  FOR SELECT
  USING (advisor_profile_id = auth.uid());

-- Delegation notes: advisors only see notes forwarded to them.
DROP POLICY IF EXISTS delegation_notes_advisor_forwarded_select ON public.delegation_notes;
CREATE POLICY delegation_notes_advisor_forwarded_select
  ON public.delegation_notes
  FOR SELECT
  USING (
    forwarded_to_advisor_profile_id = auth.uid()
    AND public.is_advisor_user(auth.uid())
    AND public.user_can_access_chamber_conference(auth.uid(), conference_id)
  );

DROP POLICY IF EXISTS delegation_notes_staff_update_forward ON public.delegation_notes;
CREATE POLICY delegation_notes_staff_update_forward
  ON public.delegation_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
    AND public.user_can_access_chamber_conference(auth.uid(), conference_id)
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
    AND public.user_can_access_chamber_conference(auth.uid(), conference_id)
  );

-- Profiles: advisors read assigned delegate only.
DROP POLICY IF EXISTS profiles_advisor_read_assigned_delegate ON public.profiles;
CREATE POLICY profiles_advisor_read_assigned_delegate
  ON public.profiles
  FOR SELECT
  USING (public.advisor_can_view_delegate_user(auth.uid(), id));

-- Documents: advisors read assigned delegate's docs (not write).
DROP POLICY IF EXISTS documents_advisor_read_assigned_delegate ON public.documents;
CREATE POLICY documents_advisor_read_assigned_delegate
  ON public.documents
  FOR SELECT
  USING (
    public.is_advisor_user(auth.uid())
    AND public.advisor_can_view_delegate_user(auth.uid(), user_id)
  );

-- Votes: advisors read assigned delegate's ballot rows.
DROP POLICY IF EXISTS votes_advisor_read_assigned_delegate ON public.votes;
CREATE POLICY votes_advisor_read_assigned_delegate
  ON public.votes
  FOR SELECT
  USING (
    public.is_advisor_user(auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.advisor_delegate_assignments ada
      WHERE ada.advisor_profile_id = auth.uid()
        AND ada.delegate_allocation_id = votes.allocation_id
    )
  );

CREATE OR REPLACE FUNCTION public.forward_delegation_note_to_advisor(
  p_note_id uuid,
  p_advisor_profile_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_conf uuid;
  v_sender_alloc uuid;
BEGIN
  IF NOT public.is_staff_user(auth.uid()) THEN
    RAISE EXCEPTION 'Only chair, SMT, or admin can forward notes to an advisor';
  END IF;

  SELECT conference_id, sender_allocation_id
  INTO v_conf, v_sender_alloc
  FROM public.delegation_notes
  WHERE id = p_note_id;

  IF v_conf IS NULL THEN
    RAISE EXCEPTION 'Note not found';
  END IF;

  IF NOT public.user_can_access_chamber_conference(auth.uid(), v_conf) THEN
    RAISE EXCEPTION 'Not allowed in this committee';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_advisor_profile_id AND p.role::text = 'advisor'
  ) THEN
    RAISE EXCEPTION 'Target is not an advisor account';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.advisor_delegate_assignments ada
    WHERE ada.advisor_profile_id = p_advisor_profile_id
      AND (
        ada.delegate_allocation_id = v_sender_alloc
        OR EXISTS (
          SELECT 1
          FROM public.delegation_note_recipients r
          WHERE r.note_id = p_note_id
            AND r.recipient_kind = 'allocation'
            AND r.recipient_allocation_id = ada.delegate_allocation_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'Advisor is not assigned to a delegate on this note';
  END IF;

  UPDATE public.delegation_notes
  SET
    forwarded_to_advisor_profile_id = p_advisor_profile_id,
    forwarded_to_advisor_at = now(),
    updated_at = now()
  WHERE id = p_note_id;
END;
$$;

REVOKE ALL ON FUNCTION public.forward_delegation_note_to_advisor(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forward_delegation_note_to_advisor(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_profile_role_by_email(
  p_email text,
  p_role text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_label text;
  uid uuid;
  v_role user_role;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_email := lower(trim(p_email));
  IF v_email IS NULL OR length(v_email) < 3 OR position('@' IN v_email) < 2 THEN
    RAISE EXCEPTION 'invalid email';
  END IF;

  v_label := lower(trim(p_role));
  IF v_label NOT IN ('delegate', 'chair', 'smt', 'advisor') THEN
    RAISE EXCEPTION 'role must be delegate, chair, smt, or advisor';
  END IF;

  v_role := v_label::user_role;

  SELECT id INTO uid FROM auth.users WHERE lower(trim(email)) = v_email LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'no user with that email';
  END IF;

  IF uid = auth.uid() AND v_role::text IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'cannot change your own role from the admin dashboard';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = uid) THEN
    RAISE EXCEPTION 'profile missing for user';
  END IF;

  UPDATE public.profiles
  SET role = v_role, updated_at = now()
  WHERE id = uid;
END;
$$;

COMMIT;
