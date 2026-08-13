-- Conference guides: structured links/buttons/files + public storage for PDFs and uploads.

ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS resources jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'guide-files') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('guide-files', 'guide-files', true);
  END IF;
END
$$;

DO $$
BEGIN
  BEGIN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping storage.objects RLS enable (insufficient privilege).';
    WHEN undefined_table THEN
      RAISE NOTICE 'Skipping storage.objects RLS enable (storage.objects missing).';
  END;
END
$$;

DROP POLICY IF EXISTS "Public can read guide files" ON storage.objects;
CREATE POLICY "Public can read guide files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'guide-files');

DROP POLICY IF EXISTS "Staff manage guide files" ON storage.objects;
CREATE POLICY "Staff manage guide files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'guide-files'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('chair', 'smt', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'guide-files'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('chair', 'smt', 'admin')
  )
);
