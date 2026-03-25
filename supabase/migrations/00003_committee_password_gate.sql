-- Optional secondary gate: delegates enter committee password + allocation after Supabase auth.
-- Hash is produced by the app (scrypt); chairs/SMT set it via Chair → Committee access.
ALTER TABLE conferences ADD COLUMN IF NOT EXISTS committee_password_hash TEXT;

-- Only chairs/SMT may change the hash (column-level safety vs broad UPDATE on conferences).
CREATE OR REPLACE FUNCTION public.set_committee_password_hash(conference_id uuid, new_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('chair', 'smt')
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.conferences
  SET committee_password_hash = new_hash
  WHERE id = conference_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_committee_password_hash(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_committee_password_hash(uuid, text) TO authenticated;
