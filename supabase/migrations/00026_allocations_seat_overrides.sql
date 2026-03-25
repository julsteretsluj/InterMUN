-- Seat-specific placard overrides in the committee room.
-- Stored on allocations rows for conference/committee scoping.

ALTER TABLE public.allocations
  ADD COLUMN IF NOT EXISTS display_name_override TEXT,
  ADD COLUMN IF NOT EXISTS display_pronouns_override TEXT,
  ADD COLUMN IF NOT EXISTS display_school_override TEXT;

