-- SEAMUNs-style three-state roll call: absent | present_abstain | present_voting
ALTER TABLE public.roll_call_entries
  ADD COLUMN IF NOT EXISTS attendance text;

UPDATE public.roll_call_entries
SET attendance = CASE WHEN present IS TRUE THEN 'present_voting' ELSE 'absent' END
WHERE attendance IS NULL;

ALTER TABLE public.roll_call_entries
  ALTER COLUMN attendance SET DEFAULT 'absent';

ALTER TABLE public.roll_call_entries
  ALTER COLUMN attendance SET NOT NULL;

ALTER TABLE public.roll_call_entries
  DROP CONSTRAINT IF EXISTS roll_call_entries_attendance_check;

ALTER TABLE public.roll_call_entries
  ADD CONSTRAINT roll_call_entries_attendance_check
  CHECK (attendance IN ('absent', 'present_abstain', 'present_voting'));

CREATE OR REPLACE FUNCTION public.sync_roll_call_present_from_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.present := (NEW.attendance IN ('present_abstain', 'present_voting'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_roll_call_present_from_attendance ON public.roll_call_entries;
CREATE TRIGGER trg_roll_call_present_from_attendance
  BEFORE INSERT OR UPDATE OF attendance ON public.roll_call_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_roll_call_present_from_attendance();
