-- Durable wall-clock end for floor timers + ensure Realtime delivers timer rows.
-- Client-only anchors reset on remount/refetch; countdown_ends_at is the source of truth
-- while is_running. Names-only speaker sync must not touch this column.

ALTER TABLE public.timers
  ADD COLUMN IF NOT EXISTS countdown_ends_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.timers.countdown_ends_at IS
  'When is_running, remaining seconds = max(0, countdown_ends_at - now). Cleared on pause/reset.';

-- Backfill running rows so refresh/remount keeps counting down instead of restarting.
UPDATE public.timers
SET countdown_ends_at = NOW() + make_interval(secs => GREATEST(0, time_left_seconds))
WHERE is_running = true
  AND countdown_ends_at IS NULL
  AND GREATEST(COALESCE(time_left_seconds, 0), COALESCE(total_time_seconds, 0)) > 0;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'timers'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.timers;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'procedure_states'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.procedure_states;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'timer_pause_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.timer_pause_events;
    END IF;
  ELSE
    RAISE NOTICE 'supabase_realtime publication missing; skip timer realtime tables.';
  END IF;
END $$;
