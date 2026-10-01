-- Separate GSL / Speakers queue from Opening speeches list in the same table.

ALTER TABLE public.speaker_queue_entries
  ADD COLUMN IF NOT EXISTS list_kind TEXT NOT NULL DEFAULT 'gsl';

ALTER TABLE public.speaker_queue_entries
  DROP CONSTRAINT IF EXISTS speaker_queue_entries_list_kind_check;

ALTER TABLE public.speaker_queue_entries
  ADD CONSTRAINT speaker_queue_entries_list_kind_check
  CHECK (list_kind IN ('gsl', 'opening'));

COMMENT ON COLUMN public.speaker_queue_entries.list_kind IS
  'Which Speakers-tab list this row belongs to: gsl (Speaker list) or opening (Opening speeches).';

CREATE INDEX IF NOT EXISTS idx_speaker_queue_conference_kind_order
  ON public.speaker_queue_entries (conference_id, list_kind, sort_order);
