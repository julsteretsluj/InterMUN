-- Optional in-app Google Doc embed (view/edit) for delegate resources
ALTER TABLE public.guides ADD COLUMN IF NOT EXISTS google_docs_url TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS google_docs_url TEXT;
ALTER TABLE public.speeches ADD COLUMN IF NOT EXISTS google_docs_url TEXT;
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS google_docs_url TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS google_docs_url TEXT;
