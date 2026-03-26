-- Committee logos: SMT can upload images (Supabase Storage) and URL is stored on `conferences`.

ALTER TABLE public.conferences
  ADD COLUMN IF NOT EXISTS committee_logo_url text;

-- Storage bucket: public read, authenticated writes restricted to chairs/SMT/admin.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'committee-logos') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('committee-logos', 'committee-logos', true);
  END IF;
END
$$;

-- Ensure RLS is enabled for object-level access control.
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read committee logos" ON storage.objects;
CREATE POLICY "Public can read committee logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'committee-logos');

DROP POLICY IF EXISTS "Chairs SMT admin manage committee logos" ON storage.objects;
CREATE POLICY "Chairs SMT admin manage committee logos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'committee-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('chair', 'smt', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'committee-logos'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role::text IN ('chair', 'smt', 'admin')
  )
);

