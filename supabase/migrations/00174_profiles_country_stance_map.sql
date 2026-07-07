-- Per-delegate country position map (support / oppose / neutral / undecided) for whip counts.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_stance_map jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.country_stance_map IS
  'Delegate-maintained map of committee country -> stance label for bloc strategy.';

COMMIT;
