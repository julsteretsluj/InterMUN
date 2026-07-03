BEGIN;

-- =====================================================================
-- Milestones / achievements support.
--   1. Persist motion & resolution pass/fail so "caucuses passed" and
--      "resolutions passed" milestones are countable (previously the
--      outcome was computed client-side at close and never stored).
--   2. Append-only speech log so per-delegate "speeches delivered"
--      milestones are countable (the speaker queue is ephemeral).
-- =====================================================================

-- 1. Motion / resolution outcome ---------------------------------------
ALTER TABLE public.vote_items
  ADD COLUMN IF NOT EXISTS outcome text
    CHECK (outcome IN ('passed', 'failed')),
  ADD COLUMN IF NOT EXISTS outcome_recorded_at timestamptz;

CREATE INDEX IF NOT EXISTS vote_items_conference_outcome_idx
  ON public.vote_items (conference_id, outcome);

-- 2. Per-delegate speech log -------------------------------------------
CREATE TABLE IF NOT EXISTS public.committee_speech_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  allocation_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL,
  speaker_label text,
  -- Best-effort live procedure context (nullable: caucus debate has no open vote item).
  procedure_code text,
  vote_item_id uuid REFERENCES public.vote_items(id) ON DELETE SET NULL,
  spoke_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS committee_speech_events_conference_idx
  ON public.committee_speech_events (conference_id, spoke_at DESC);
CREATE INDEX IF NOT EXISTS committee_speech_events_allocation_idx
  ON public.committee_speech_events (allocation_id);

ALTER TABLE public.committee_speech_events ENABLE ROW LEVEL SECURITY;

-- Staff (chair/smt/admin) may log and read all speeches.
CREATE POLICY "committee_speech_events_insert_staff"
  ON public.committee_speech_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

CREATE POLICY "committee_speech_events_select_staff"
  ON public.committee_speech_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role::text IN ('chair', 'smt', 'admin')
    )
  );

-- Delegates may read their own delivered-speech rows.
CREATE POLICY "committee_speech_events_select_own"
  ON public.committee_speech_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.allocations a
      WHERE a.id = committee_speech_events.allocation_id
        AND a.user_id = auth.uid()
    )
  );

-- Advisors may read speeches for delegates assigned to them.
CREATE POLICY "committee_speech_events_select_advisor"
  ON public.committee_speech_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.advisor_delegate_assignments ada
      WHERE ada.delegate_allocation_id = committee_speech_events.allocation_id
        AND ada.advisor_profile_id = auth.uid()
    )
  );

-- 3. Let delegates/advisors read points for milestone counts ----------
--    (chair_session_points was previously staff-only for SELECT).
CREATE POLICY "chair_session_points_select_own"
  ON public.chair_session_points FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.allocations a
      WHERE a.id = chair_session_points.raised_by_allocation_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "chair_session_points_select_advisor"
  ON public.chair_session_points FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.advisor_delegate_assignments ada
      WHERE ada.delegate_allocation_id = chair_session_points.raised_by_allocation_id
        AND ada.advisor_profile_id = auth.uid()
    )
  );

COMMIT;
