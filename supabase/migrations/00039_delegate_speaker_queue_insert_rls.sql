-- Delegate request-to-speak: allow INSERT into speaker_queue_entries for their own allocation

ALTER TABLE public.speaker_queue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "speaker_queue_delegate_insert_waiting" ON public.speaker_queue_entries
FOR INSERT TO authenticated
WITH CHECK (
  status = 'waiting'
  AND allocation_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.allocations a
    WHERE a.id = speaker_queue_entries.allocation_id
      AND a.user_id = auth.uid()
      AND a.conference_id = speaker_queue_entries.conference_id
  )
);

