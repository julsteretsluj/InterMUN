-- Copyright (c) 2026 Intermun. All rights reserved.
-- Enforce disciplinary rights loss and harden the public RPC wrapper.

BEGIN;

-- Public INVOKER relay must expand RETURNS TABLE via SELECT * FROM.
CREATE OR REPLACE FUNCTION public.apply_delegate_disciplinary_action(
  p_conference_id uuid,
  p_allocation_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS TABLE (
  warning_count integer,
  strike_count integer,
  voting_rights_lost boolean,
  speaking_rights_suspended boolean,
  removed_from_committee boolean
)
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT *
  FROM private.apply_delegate_disciplinary_action(
    p_conference_id,
    p_allocation_id,
    p_action,
    p_reason
  );
$$;

REVOKE ALL ON FUNCTION public.apply_delegate_disciplinary_action(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_delegate_disciplinary_action(uuid, uuid, text, text) TO authenticated;

-- Block recording votes for allocations that lost voting rights.
DROP POLICY IF EXISTS "votes_deny_when_voting_rights_lost_insert" ON public.votes;
CREATE POLICY "votes_deny_when_voting_rights_lost_insert"
  ON public.votes
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    allocation_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.chair_delegate_discipline d
      JOIN public.vote_items vi ON vi.id = votes.vote_item_id
      WHERE d.allocation_id = votes.allocation_id
        AND d.conference_id = vi.conference_id
        AND d.voting_rights_lost IS TRUE
    )
  );

DROP POLICY IF EXISTS "votes_deny_when_voting_rights_lost_update" ON public.votes;
CREATE POLICY "votes_deny_when_voting_rights_lost_update"
  ON public.votes
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    allocation_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.chair_delegate_discipline d
      JOIN public.vote_items vi ON vi.id = votes.vote_item_id
      WHERE d.allocation_id = votes.allocation_id
        AND d.conference_id = vi.conference_id
        AND d.voting_rights_lost IS TRUE
    )
  );

-- Block speaker-queue adds when speaking is suspended or the delegate is removed.
DROP POLICY IF EXISTS "speaker_queue_deny_suspended_or_removed_insert" ON public.speaker_queue_entries;
CREATE POLICY "speaker_queue_deny_suspended_or_removed_insert"
  ON public.speaker_queue_entries
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    allocation_id IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.chair_delegate_discipline d
      WHERE d.allocation_id = speaker_queue_entries.allocation_id
        AND d.conference_id = speaker_queue_entries.conference_id
        AND (
          d.speaking_rights_suspended IS TRUE
          OR d.removed_from_committee IS TRUE
        )
    )
  );

-- Live updates for chair discipline panels.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chair_delegate_discipline'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chair_delegate_discipline;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'supabase_realtime publication missing; skip discipline realtime.';
END
$$;

COMMIT;
