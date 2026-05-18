-- Prevent duplicate recipient rows on the same note.

CREATE UNIQUE INDEX IF NOT EXISTS idx_delegation_note_recipients_unique_allocation
  ON public.delegation_note_recipients (note_id, recipient_allocation_id)
  WHERE recipient_kind = 'allocation' AND recipient_allocation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_delegation_note_recipients_unique_chair
  ON public.delegation_note_recipients (note_id, recipient_profile_id)
  WHERE recipient_kind = 'chair' AND recipient_profile_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_delegation_note_recipients_unique_chair_all
  ON public.delegation_note_recipients (note_id)
  WHERE recipient_kind = 'chair_all';
