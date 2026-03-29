-- Chair can pause/resume floor countdown; delegates freeze on the same remaining time.
ALTER TABLE public.timers
ADD COLUMN IF NOT EXISTS is_running BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.timers.is_running IS 'When false, UI does not count down until the chair starts the clock again.';
