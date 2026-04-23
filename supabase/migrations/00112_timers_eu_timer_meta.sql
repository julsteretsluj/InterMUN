-- Persist chair-configured EU timer labels/tags per committee timer row.
ALTER TABLE public.timers
ADD COLUMN IF NOT EXISTS eu_timer_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.timers.eu_timer_meta IS
  'Chair-defined EU timer metadata keyed by slot (name/tag) for the 11 EU timer controls.';
