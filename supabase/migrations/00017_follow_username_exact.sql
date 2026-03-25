-- Adds username-based following with exact-match lookup (username or profile id).

-- Profiles: add username for exact lookup
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- Normalize username storage for consistent exact matching.
-- (We still do case-insensitive matching in lookup functions.)
CREATE OR REPLACE FUNCTION public.normalize_profile_username()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    NEW.username := lower(btrim(NEW.username));
    IF NEW.username = '' THEN
      NEW.username := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_profile_username ON public.profiles;
CREATE TRIGGER trg_normalize_profile_username
  BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_profile_username();

-- Enforce uniqueness (case-insensitive) for non-null usernames.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique_ci
  ON public.profiles (lower(username))
  WHERE username IS NOT NULL;

-- Follows: follower -> followed (one-way)
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);

-- RLS for follows (users can manage their own relationships)
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own follows" ON public.follows;
CREATE POLICY "Users can view own follows"
  ON public.follows FOR SELECT
  USING (follower_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own follows" ON public.follows;
CREATE POLICY "Users can create own follows"
  ON public.follows FOR INSERT
  WITH CHECK (follower_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own follows" ON public.follows;
CREATE POLICY "Users can delete own follows"
  ON public.follows FOR DELETE
  USING (follower_id = auth.uid());

-- Security-definer functions so following works even if profile RLS is restrictive.
CREATE OR REPLACE FUNCTION public.resolve_profile_exact(
  p_username TEXT,
  p_profile_id UUID
)
RETURNS TABLE (
  profile_id UUID,
  username TEXT,
  name TEXT,
  pronouns TEXT,
  school TEXT,
  role user_role,
  profile_picture_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  u TEXT;
BEGIN
  IF p_profile_id IS NOT NULL THEN
    RETURN QUERY
      SELECT
        p.id,
        p.username,
        p.name,
        p.pronouns,
        p.school,
        p.role,
        p.profile_picture_url
      FROM public.profiles p
      WHERE p.id = p_profile_id
      LIMIT 1;
    RETURN;
  END IF;

  u := lower(btrim(p_username));
  IF u IS NULL OR u = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT
      p.id,
      p.username,
      p.name,
      p.pronouns,
      p.school,
      p.role,
      p.profile_picture_url
    FROM public.profiles p
    WHERE p.username IS NOT NULL
      AND lower(p.username) = u
    LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_following(p_follower_id UUID)
RETURNS TABLE (
  followed_id UUID,
  username TEXT,
  name TEXT,
  pronouns TEXT,
  school TEXT,
  role user_role,
  profile_picture_url TEXT,
  followed_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      p.id AS followed_id,
      p.username,
      p.name,
      p.pronouns,
      p.school,
      p.role,
      p.profile_picture_url,
      p.created_at AS followed_created_at
    FROM public.follows f
    JOIN public.profiles p ON p.id = f.followed_id
    WHERE f.follower_id = p_follower_id
    ORDER BY f.created_at DESC;
END;
$$;

-- Allow authenticated users to execute the lookup/listing functions.
GRANT EXECUTE ON FUNCTION public.resolve_profile_exact(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_following(UUID) TO authenticated;

