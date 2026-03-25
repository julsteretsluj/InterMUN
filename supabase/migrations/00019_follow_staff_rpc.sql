-- Allow staff to resolve/list a user's following list (for future UI).

CREATE OR REPLACE FUNCTION public.get_following_for_follower(p_follower_id UUID)
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
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('chair', 'smt', 'admin')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

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

GRANT EXECUTE ON FUNCTION public.get_following_for_follower(UUID) TO authenticated;

