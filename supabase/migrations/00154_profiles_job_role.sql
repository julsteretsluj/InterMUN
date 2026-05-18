-- Optional job title for advisor accounts (e.g. MUN director, teacher).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_role text;
