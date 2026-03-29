-- Tie floor timer to a vote item; optional per-speaker cap for moderated caucus.
ALTER TABLE public.timers
  ADD COLUMN IF NOT EXISTS vote_item_id UUID REFERENCES public.vote_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS per_speaker_mode BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_timers_vote_item_id ON public.timers (vote_item_id);

COMMENT ON COLUMN public.timers.vote_item_id IS 'When set, delegates only see this timer while viewing that motion, unless per_speaker_mode is on (caucus floor).';
COMMENT ON COLUMN public.timers.per_speaker_mode IS 'If true, total/left are per speaker; use Advance speaker to reset left to total.';
