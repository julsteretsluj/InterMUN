-- Timer: floor label (delegate-visible preset name), pause reason on the row, pause audit log
ALTER TABLE public.timers
  ADD COLUMN IF NOT EXISTS floor_label text,
  ADD COLUMN IF NOT EXISTS current_pause_reason text;

COMMENT ON COLUMN public.timers.floor_label IS 'Shown to delegates with the timer (e.g. GSL 60s).';
COMMENT ON COLUMN public.timers.current_pause_reason IS 'Last pause explanation; cleared when the clock starts again.';

CREATE TABLE IF NOT EXISTS public.timer_pause_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  reason text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_timer_pause_events_conference_created
  ON public.timer_pause_events (conference_id, created_at DESC);

ALTER TABLE public.timer_pause_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timer_pause_events_select_chairs"
  ON public.timer_pause_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

CREATE POLICY "timer_pause_events_insert_chairs"
  ON public.timer_pause_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
    )
    AND created_by = auth.uid()
  );

-- Announcements: markdown/plain, pin one per committee, optional schedule
ALTER TABLE public.dais_announcements
  ADD COLUMN IF NOT EXISTS body_format text NOT NULL DEFAULT 'plain',
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS publish_at timestamptz;

ALTER TABLE public.dais_announcements
  DROP CONSTRAINT IF EXISTS dais_announcements_body_format_check;

ALTER TABLE public.dais_announcements
  ADD CONSTRAINT dais_announcements_body_format_check
  CHECK (body_format IN ('plain', 'markdown'));

CREATE UNIQUE INDEX IF NOT EXISTS dais_one_pinned_per_conference
  ON public.dais_announcements (conference_id)
  WHERE is_pinned = true;

-- Delegates only see announcements that are already published
DROP POLICY IF EXISTS "dais_select" ON public.dais_announcements;

CREATE POLICY "dais_select" ON public.dais_announcements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
    )
    OR (
      EXISTS (
        SELECT 1 FROM public.allocations a
        WHERE a.conference_id = dais_announcements.conference_id
          AND a.user_id = auth.uid()
      )
      AND (publish_at IS NULL OR publish_at <= now())
    )
  );

CREATE POLICY "dais_update_chairs" ON public.dais_announcements FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );
