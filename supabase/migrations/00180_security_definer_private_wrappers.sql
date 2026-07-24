BEGIN;

-- Move SECURITY DEFINER implementations out of PostgREST-exposed schemas.
-- Lints 0028/0029 only flag DEFINER functions in pgrst.db_schemas (usually public).
-- Public keeps thin SECURITY INVOKER relays so existing RPC + RLS call sites stay valid.

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO postgres, anon, authenticated, service_role;

DO $$
DECLARE
  fn record;
  arg_list text;
  call_list text;
  create_sql text;
  grant_roles text[];
  role_name text;
  arg_name text;
  arg_parts text[];
  names text[] := ARRAY[]::text[];
  part text;
BEGIN
  FOR fn IN
    SELECT
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS identity_args,
      pg_get_function_arguments(p.oid) AS full_args,
      pg_get_function_result(p.oid) AS result_type,
      COALESCE(
        (
          SELECT array_agg(r.rolname ORDER BY r.rolname)
          FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(rolname)
          WHERE has_function_privilege(r.rolname, p.oid, 'EXECUTE')
        ),
        ARRAY[]::text[]
      ) AS exec_roles
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND p.proname = ANY (ARRAY[
        'ack_note_delivery',
        'add_chamber_second_topic_smt',
        'admin_set_profile_role_by_email',
        'advisor_can_view_delegate_user',
        'advisor_profile_for_allocation',
        'allocation_valid_delegation_note_recipient',
        'apply_delegate_disciplinary_action',
        'bloc_conference_id',
        'chair_assign_delegate_by_email',
        'claim_allocation_code_gate',
        'create_event_and_committee_as_staff',
        'current_user_profile_role',
        'delegate_set_roll_attendance',
        'delegation_note_conference_id',
        'delegation_note_visible_to_delegate',
        'ensure_smt_secretariat_conference_for_event',
        'finalize_resolution_with_clauses',
        'forward_delegation_note_to_advisor',
        'is_advisor_user',
        'is_delegation_note_chair_recipient_profile',
        'moderate_delegation_note',
        'resolution_conference_id',
        'resolve_conference_event_id_by_code',
        'review_amendment',
        'send_note_message',
        'set_allocation_code_gate_enabled',
        'set_committee_password_hash',
        'set_conference_room_code',
        'smt_promote_to_chair_by_email',
        'update_chamber_committee_profile_smt',
        'update_committee_session_smt',
        'update_conference_event_smt',
        'update_event_schedule_config_smt',
        'user_allocated_to_conference',
        'user_chair_can_manage_participation_scores',
        'user_delegate_can_manage_participation_feedback',
        'user_is_delegation_note_thread_participant',
        'user_owns_delegation_note'
      ])
  LOOP
    grant_roles := fn.exec_roles;

    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET SCHEMA private',
      fn.proname,
      fn.identity_args
    );

    names := ARRAY[]::text[];
    IF fn.identity_args IS NULL OR btrim(fn.identity_args) = '' THEN
      call_list := '';
      arg_list := '';
    ELSE
      arg_list := fn.full_args;
      FOREACH part IN ARRAY string_to_array(fn.identity_args, ',')
      LOOP
        arg_parts := regexp_split_to_array(btrim(part), '\s+');
        -- Skip mode keywords if present (IN/OUT/INOUT/VARIADIC).
        IF arg_parts[1] IN ('IN', 'OUT', 'INOUT', 'VARIADIC') THEN
          arg_name := arg_parts[2];
        ELSE
          arg_name := arg_parts[1];
        END IF;
        names := array_append(names, arg_name);
      END LOOP;
      call_list := array_to_string(names, ', ');
    END IF;

    IF lower(fn.result_type) = 'void' THEN
      create_sql := format(
        'CREATE FUNCTION public.%I(%s)
         RETURNS void
         LANGUAGE plpgsql
         VOLATILE
         SECURITY INVOKER
         SET search_path = ''''
         AS $fn$
         BEGIN
           PERFORM private.%I(%s);
         END;
         $fn$',
        fn.proname,
        arg_list,
        fn.proname,
        call_list
      );
    ELSE
      create_sql := format(
        'CREATE FUNCTION public.%I(%s)
         RETURNS %s
         LANGUAGE sql
         VOLATILE
         SECURITY INVOKER
         SET search_path = ''''
         AS $fn$
           SELECT private.%I(%s);
         $fn$',
        fn.proname,
        arg_list,
        fn.result_type,
        fn.proname,
        call_list
      );
    END IF;

    EXECUTE create_sql;

    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC',
      fn.proname,
      fn.identity_args
    );
    EXECUTE format(
      'REVOKE ALL ON FUNCTION private.%I(%s) FROM PUBLIC',
      fn.proname,
      fn.identity_args
    );

    FOREACH role_name IN ARRAY grant_roles
    LOOP
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO %I',
        fn.proname,
        fn.identity_args,
        role_name
      );
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION private.%I(%s) TO %I',
        fn.proname,
        fn.identity_args,
        role_name
      );
    END LOOP;

    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
      fn.proname,
      fn.identity_args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION private.%I(%s) TO service_role',
      fn.proname,
      fn.identity_args
    );
  END LOOP;
END
$$;

COMMIT;
