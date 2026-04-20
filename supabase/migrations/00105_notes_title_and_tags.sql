-- Running notes (and other note rows): optional display title and tag list for organization.

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.notes.title IS 'Optional user-defined label for running notes (sidebar / list).';
COMMENT ON COLUMN public.notes.tags IS 'User-chosen tags (e.g. stances, crisis) for filtering and display.';
