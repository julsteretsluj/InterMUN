-- Add profile fields used by SMT allocation matrix overview.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS notes text;

