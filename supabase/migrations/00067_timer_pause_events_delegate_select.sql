-- Delegates on a committee allocation can read pause history (read-only).
CREATE POLICY "timer_pause_events_select_delegate"
  ON public.timer_pause_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.allocations a
      WHERE a.conference_id = timer_pause_events.conference_id
        AND a.user_id = auth.uid()
    )
  );
