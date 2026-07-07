-- Delegate speech outline checklist (talking points with done state).

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS speech_outline_points jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.speech_outline_points IS
  'Delegate-maintained GSL speech outline: array of { id, text, done }.';

COMMIT;
