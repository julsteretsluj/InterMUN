-- Per-committee speech notes by chairs, tied to the current speaker (timer + speaker list).

CREATE TABLE public.chair_speech_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  chair_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  allocation_id UUID REFERENCES public.allocations(id) ON DELETE SET NULL,
  speaker_label TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chair_speech_notes_conference_created
  ON public.chair_speech_notes (conference_id, created_at DESC);

CREATE INDEX idx_chair_speech_notes_chair_conference
  ON public.chair_speech_notes (chair_user_id, conference_id);

COMMENT ON TABLE public.chair_speech_notes IS
  'Private chair notes on a delegate speech; speaker_label mirrors timers.current_speaker; allocation_id when queue marks current.';

ALTER TABLE public.chair_speech_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chair_speech_notes_staff_select ON public.chair_speech_notes;
CREATE POLICY chair_speech_notes_staff_select
  ON public.chair_speech_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin')
    )
  );

DROP POLICY IF EXISTS chair_speech_notes_staff_insert ON public.chair_speech_notes;
CREATE POLICY chair_speech_notes_staff_insert
  ON public.chair_speech_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = chair_user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt', 'admin')
    )
  );

DROP POLICY IF EXISTS chair_speech_notes_author_update ON public.chair_speech_notes;
CREATE POLICY chair_speech_notes_author_update
  ON public.chair_speech_notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = chair_user_id)
  WITH CHECK (auth.uid() = chair_user_id);

DROP POLICY IF EXISTS chair_speech_notes_author_delete ON public.chair_speech_notes;
CREATE POLICY chair_speech_notes_author_delete
  ON public.chair_speech_notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = chair_user_id);

-- Enable in Supabase Dashboard → Replication for public.chair_speech_notes if you want live refresh.
