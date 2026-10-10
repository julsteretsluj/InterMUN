-- Tables the app subscribes to via postgres_changes. Older projects added these in the dashboard;
-- keep the publication reproducible from migrations.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'allocations',
    'chair_delegate_points',
    'chair_session_points',
    'chair_speech_notes',
    'chat_messages',
    'committee_session_history',
    'committee_synced_state',
    'conferences',
    'dais_announcements',
    'delegation_note_recipients',
    'delegation_notes',
    'motion_audit_events',
    'roll_call_entries',
    'speaker_queue_entries',
    'user_notifications',
    'vote_items',
    'votes'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'supabase_realtime publication missing; skip app realtime tables.';
END
$$;
