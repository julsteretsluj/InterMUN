-- Dais announcements: structured links, buttons, and uploaded files.

ALTER TABLE public.dais_announcements
  ADD COLUMN IF NOT EXISTS resources jsonb NOT NULL DEFAULT '[]'::jsonb;
