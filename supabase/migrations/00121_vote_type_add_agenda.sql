-- Add vote_items.vote_type value for agenda-floor ballots.
-- Must run as its own committed migration: PostgreSQL forbids using a new enum
-- label in the same transaction that adds it (55P04).

DO $en$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'vote_type'
      AND e.enumlabel = 'agenda'
  ) THEN
    ALTER TYPE public.vote_type ADD VALUE 'agenda';
  END IF;
END
$en$;
