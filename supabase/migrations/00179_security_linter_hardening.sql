BEGIN;

-- Pin function lookup to prevent caller-controlled search path resolution.
ALTER FUNCTION public.handle_new_user()
  SET search_path = '';
ALTER FUNCTION public.normalize_profile_username()
  SET search_path = '';
ALTER FUNCTION public.sync_roll_call_present_from_attendance()
  SET search_path = '';
ALTER FUNCTION public.committee_tab_key_normalize_committee(text)
  SET search_path = '';
ALTER FUNCTION public.committee_session_group_key_from_committee(text)
  SET search_path = '';
ALTER FUNCTION public.committee_tab_key(public.conferences)
  SET search_path = '';
ALTER FUNCTION public.committee_tab_key_sql(text, text, uuid)
  SET search_path = '';

-- Resolve conference membership without re-entering the circular
-- resolutions -> blocs -> memberships RLS chain.
CREATE OR REPLACE FUNCTION public.user_allocated_to_conference(
  p_uid uuid,
  p_conference_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.allocations a
    WHERE a.user_id = p_uid
      AND a.conference_id = p_conference_id
  );
$$;

CREATE OR REPLACE FUNCTION public.resolution_conference_id(p_resolution_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT r.conference_id
  FROM public.resolutions r
  WHERE r.id = p_resolution_id;
$$;

CREATE OR REPLACE FUNCTION public.bloc_conference_id(p_bloc_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
AS $$
  SELECT r.conference_id
  FROM public.blocs b
  JOIN public.resolutions r ON r.id = b.resolution_id
  WHERE b.id = p_bloc_id;
$$;

ALTER FUNCTION public.user_allocated_to_conference(uuid, uuid) OWNER TO postgres;
ALTER FUNCTION public.resolution_conference_id(uuid) OWNER TO postgres;
ALTER FUNCTION public.bloc_conference_id(uuid) OWNER TO postgres;

-- Replace legacy unrestricted write policies with operation-specific access.
DROP POLICY IF EXISTS "Blocs policies" ON public.blocs;
DROP POLICY IF EXISTS "Bloc memberships" ON public.bloc_memberships;
DROP POLICY IF EXISTS "Signatory requests" ON public.signatory_requests;
DROP POLICY IF EXISTS "resolutions_select_delegate_bloc_based" ON public.resolutions;

CREATE POLICY resolutions_select_allocated_delegate
  ON public.resolutions
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_profile_role()::text = 'delegate'
    AND public.user_allocated_to_conference(auth.uid(), conference_id)
  );

CREATE POLICY blocs_select_conference_participants
  ON public.blocs
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
    OR public.user_allocated_to_conference(
      auth.uid(),
      public.resolution_conference_id(blocs.resolution_id)
    )
  );

CREATE POLICY blocs_insert_staff
  ON public.blocs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  );

CREATE POLICY blocs_update_staff
  ON public.blocs
  FOR UPDATE
  TO authenticated
  USING (public.current_user_profile_role()::text IN ('chair', 'smt', 'admin'))
  WITH CHECK (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  );

CREATE POLICY blocs_delete_staff
  ON public.blocs
  FOR DELETE
  TO authenticated
  USING (public.current_user_profile_role()::text IN ('chair', 'smt', 'admin'));

CREATE POLICY bloc_memberships_select_conference_participants
  ON public.bloc_memberships
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
    OR user_id = auth.uid()
    OR public.user_allocated_to_conference(
      auth.uid(),
      public.bloc_conference_id(bloc_memberships.bloc_id)
    )
  );

CREATE POLICY bloc_memberships_insert_self
  ON public.bloc_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.current_user_profile_role()::text = 'delegate'
    AND public.user_allocated_to_conference(
      auth.uid(),
      public.bloc_conference_id(bloc_id)
    )
  );

CREATE POLICY bloc_memberships_delete_self
  ON public.bloc_memberships
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY signatory_requests_select_scoped
  ON public.signatory_requests
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.current_user_profile_role()::text IN ('chair', 'smt', 'admin')
  );

CREATE POLICY signatory_requests_insert_self
  ON public.signatory_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending'
    AND public.current_user_profile_role()::text = 'delegate'
    AND public.user_allocated_to_conference(
      auth.uid(),
      public.resolution_conference_id(resolution_id)
    )
  );

-- Intake writes use the server-side service role, so public table and storage
-- inserts are unnecessary and permit anonymous spam.
DROP POLICY IF EXISTS secretariat_registration_requests_insert_public
  ON public.secretariat_registration_requests;
DROP POLICY IF EXISTS secretariat_onboarding_insert_public
  ON storage.objects;

-- Public buckets serve object URLs without a broad storage.objects SELECT
-- policy. Removing these policies prevents clients from listing every object.
DROP POLICY IF EXISTS "Public can read committee logos" ON storage.objects;
DROP POLICY IF EXISTS "Public can read profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users select own profile pictures" ON storage.objects;

CREATE POLICY "Users select own profile pictures"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-pictures'
    AND COALESCE((string_to_array(name, '/'))[1], '') = 'profiles'
    AND COALESCE((string_to_array(name, '/'))[2], '') = auth.uid()::text
  );

-- The event-code resolver is intentionally used before authentication.
REVOKE ALL ON FUNCTION public.resolve_conference_event_id_by_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_conference_event_id_by_code(text) FROM anon;
REVOKE ALL ON FUNCTION public.resolve_conference_event_id_by_code(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_conference_event_id_by_code(text)
  TO anon, authenticated, service_role;

-- Client RPCs validate the signed-in caller internally. Remove inherited
-- PUBLIC/anon execution while retaining authenticated and service-role use.
-- Skip signatures that are absent on the remote (migrations may be out of sync).
DO $$
DECLARE
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.ack_note_delivery(uuid, text)',
    'public.add_chamber_second_topic_smt(uuid)',
    'public.admin_set_profile_role_by_email(text, text)',
    'public.apply_delegate_disciplinary_action(uuid, uuid, text, text)',
    'public.chair_assign_delegate_by_email(uuid, uuid, text)',
    'public.claim_allocation_code_gate(uuid, text)',
    'public.create_event_and_committee_as_staff(text, text, text, text, text, text)',
    'public.delegate_set_roll_attendance(uuid, text)',
    'public.ensure_smt_secretariat_conference_for_event(uuid)',
    'public.finalize_resolution_with_clauses(uuid, text[])',
    'public.forward_delegation_note_to_advisor(uuid, uuid)',
    'public.moderate_delegation_note(uuid, text, text)',
    'public.review_amendment(uuid, text, text, text)',
    'public.send_note_message(uuid, uuid, text, text, boolean, uuid, text, uuid[], uuid[], boolean, boolean)',
    'public.set_allocation_code_gate_enabled(uuid, boolean)',
    'public.set_committee_password_hash(uuid, text)',
    'public.set_conference_room_code(uuid, text)',
    'public.smt_promote_to_chair_by_email(text)',
    'public.update_chamber_committee_profile_smt(uuid, text, text, text, text, text, text, text, boolean, boolean)',
    'public.update_committee_session_smt(uuid, text, text, text, text, text, text, text, boolean, text, boolean)',
    'public.update_conference_event_smt(uuid, text, text, text)',
    'public.update_event_schedule_config_smt(uuid, jsonb)'
  ]
  LOOP
    IF to_regprocedure(function_signature) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', function_signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', function_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', function_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_signature);
  END LOOP;
END
$$;

-- RLS predicate helpers execute as the signed-in session.
DO $$
DECLARE
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.advisor_can_view_delegate_user(uuid, uuid)',
    'public.advisor_profile_for_allocation(uuid)',
    'public.allocation_valid_delegation_note_recipient(uuid, uuid)',
    'public.current_user_profile_role()',
    'public.delegation_note_conference_id(uuid)',
    'public.delegation_note_visible_to_delegate(uuid, uuid)',
    'public.is_advisor_user(uuid)',
    'public.is_delegation_note_chair_recipient_profile(uuid)',
    'public.user_chair_can_manage_participation_scores(uuid)',
    'public.user_delegate_can_manage_participation_feedback(uuid)',
    'public.user_is_delegation_note_thread_participant(uuid, uuid)',
    'public.user_owns_delegation_note(uuid, uuid)',
    'public.advisor_note_recipient_allocation(uuid, uuid, uuid)',
    'public.user_allocated_to_conference(uuid, uuid)',
    'public.resolution_conference_id(uuid)',
    'public.bloc_conference_id(uuid)'
  ]
  LOOP
    IF to_regprocedure(function_signature) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', function_signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', function_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', function_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_signature);
  END LOOP;
END
$$;

-- Internal plumbing and trigger functions are never called through PostgREST.
-- SECURITY DEFINER callers run nested functions as their postgres owner.
DO $$
DECLARE
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.audit_delegate_chair_feedback_scores()',
    'public.audit_digital_room_flags_state()',
    'public.bump_note_event_version()',
    'public.clear_allocation_code_claim_on_allocation_user_change()',
    'public.clear_allocation_code_claim_on_gate_code_change()',
    'public.copy_delegation_note_recipients_from_root(uuid, uuid)',
    'public.enqueue_note_outbox_event(uuid, uuid, text, jsonb)',
    'public.fn_delegation_note_after_insert()',
    'public.fn_delegation_note_after_insert_moderation_event()',
    'public.fn_delegation_note_report_hold()',
    'public.fn_notify_chat_broadcast()',
    'public.fn_notify_dais_announcement()',
    'public.fn_notify_delegation_note_recipient()',
    'public.fn_notify_signatory_request()',
    'public.handle_new_user()',
    'public.log_vote_item_motion_audit()',
    'public.maybe_auto_name_delegation_note_thread(uuid)',
    'public.note_message_after_insert()',
    'public.notify_delegation_note_recipients(uuid)',
    'public.sync_committee_session_history_from_procedure_state()'
  ]
  LOOP
    IF to_regprocedure(function_signature) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', function_signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', function_signature);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', function_signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', function_signature);
  END LOOP;
END
$$;

COMMIT;
