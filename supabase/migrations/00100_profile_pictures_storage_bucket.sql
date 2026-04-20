-- Profile pictures: authenticated users upload to profiles/<uuid>/…; public read for <img>.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'profile-pictures') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('profile-pictures', 'profile-pictures', true);
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

DROP POLICY IF EXISTS "Public can read profile pictures" ON storage.objects;
CREATE POLICY "Public can read profile pictures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

DROP POLICY IF EXISTS "Users insert own profile pictures" ON storage.objects;
CREATE POLICY "Users insert own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND COALESCE((string_to_array(name, '/'))[1], '') = 'profiles'
  AND COALESCE((string_to_array(name, '/'))[2], '') = (auth.uid())::text
);

DROP POLICY IF EXISTS "Users update own profile pictures" ON storage.objects;
CREATE POLICY "Users update own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND COALESCE((string_to_array(name, '/'))[1], '') = 'profiles'
  AND COALESCE((string_to_array(name, '/'))[2], '') = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'profile-pictures'
  AND COALESCE((string_to_array(name, '/'))[1], '') = 'profiles'
  AND COALESCE((string_to_array(name, '/'))[2], '') = (auth.uid())::text
);

DROP POLICY IF EXISTS "Users delete own profile pictures" ON storage.objects;
CREATE POLICY "Users delete own profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures'
  AND COALESCE((string_to_array(name, '/'))[1], '') = 'profiles'
  AND COALESCE((string_to_array(name, '/'))[2], '') = (auth.uid())::text
);
