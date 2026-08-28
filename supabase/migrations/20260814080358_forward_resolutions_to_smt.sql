-- Chair forwards complete (finalized) resolutions to secretariat for Best Resolution review.

ALTER TABLE public.resolutions
  ADD COLUMN IF NOT EXISTS forwarded_to_smt_at timestamptz,
  ADD COLUMN IF NOT EXISTS forwarded_to_smt_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS resolutions_forwarded_to_smt_at_idx
  ON public.resolutions (forwarded_to_smt_at)
  WHERE forwarded_to_smt_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS resolutions_forwarded_to_smt_by_idx
  ON public.resolutions (forwarded_to_smt_by);

ALTER TABLE public.award_assignments
  ADD COLUMN IF NOT EXISTS resolution_id uuid REFERENCES public.resolutions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS award_assignments_resolution_id_idx
  ON public.award_assignments (resolution_id);

COMMENT ON COLUMN public.resolutions.forwarded_to_smt_at IS
  'When a chair forwarded this complete resolution to secretariat for Best Resolution review.';
COMMENT ON COLUMN public.award_assignments.resolution_id IS
  'Linked resolution when this award is Best Resolution (committee or conference).';

-- Bloc members can UPDATE resolutions (doc link, etc.). Only staff may change SMT-forward columns.
CREATE OR REPLACE FUNCTION public.protect_resolution_smt_forward_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.forwarded_to_smt_at IS DISTINCT FROM OLD.forwarded_to_smt_at
     OR NEW.forwarded_to_smt_by IS DISTINCT FROM OLD.forwarded_to_smt_by THEN
    IF NOT public.is_staff_user(auth.uid()) THEN
      RAISE EXCEPTION 'only staff can forward resolutions to secretariat';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS resolutions_protect_smt_forward ON public.resolutions;
CREATE TRIGGER resolutions_protect_smt_forward
  BEFORE UPDATE ON public.resolutions
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_resolution_smt_forward_columns();
