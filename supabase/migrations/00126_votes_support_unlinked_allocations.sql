-- Allow chairs/staff to record votes for unlinked placards by allocation.

BEGIN;

ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS allocation_id uuid REFERENCES public.allocations(id) ON DELETE CASCADE;

UPDATE public.votes v
SET allocation_id = a.id
FROM public.vote_items vi,
     public.allocations a
WHERE vi.id = v.vote_item_id
  AND a.conference_id = vi.conference_id
  AND a.user_id = v.user_id
  AND v.allocation_id IS NULL
  AND v.user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS votes_vote_item_allocation_unique
  ON public.votes (vote_item_id, allocation_id)
  WHERE allocation_id IS NOT NULL;

ALTER TABLE public.votes
  DROP CONSTRAINT IF EXISTS votes_vote_target_required;

ALTER TABLE public.votes
  ADD CONSTRAINT votes_vote_target_required
  CHECK (user_id IS NOT NULL OR allocation_id IS NOT NULL);

DROP POLICY IF EXISTS "Staff insert votes for committee motion" ON public.votes;
DROP POLICY IF EXISTS "Staff update votes for committee motion" ON public.votes;

CREATE POLICY "Staff insert votes for committee motion"
  ON public.votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'admin', 'smt')
    )
    AND EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.allocations a ON a.conference_id = vi.conference_id
      WHERE vi.id = votes.vote_item_id
        AND (
          (votes.allocation_id IS NOT NULL AND a.id = votes.allocation_id)
          OR (votes.allocation_id IS NULL AND votes.user_id IS NOT NULL AND a.user_id = votes.user_id)
        )
    )
    AND (
      value IN ('yes', 'no')
      OR (
        value = 'abstain'
        AND EXISTS (
          SELECT 1
          FROM public.vote_items vi
          WHERE vi.id = votes.vote_item_id
            AND (
              vi.vote_type IN ('resolution', 'amendment')
              OR vi.procedure_code = 'agenda_floor'
            )
        )
      )
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.vote_items vi
        JOIN public.procedure_states ps ON ps.conference_id = vi.conference_id
        JOIN public.allocations a ON a.conference_id = vi.conference_id
        WHERE vi.id = votes.vote_item_id
          AND vi.closed_at IS NULL
          AND ps.state = 'voting_procedure'
          AND ps.current_vote_item_id = votes.vote_item_id
          AND (
            (votes.allocation_id IS NOT NULL AND a.id = votes.allocation_id)
            OR (votes.allocation_id IS NULL AND votes.user_id IS NOT NULL AND a.user_id = votes.user_id)
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.vote_items vi
        JOIN public.allocations a ON a.conference_id = vi.conference_id
        WHERE vi.id = votes.vote_item_id
          AND vi.closed_at IS NULL
          AND vi.procedure_code = 'agenda_floor'
          AND (
            (votes.allocation_id IS NOT NULL AND a.id = votes.allocation_id)
            OR (votes.allocation_id IS NULL AND votes.user_id IS NOT NULL AND a.user_id = votes.user_id)
          )
      )
    )
  );

CREATE POLICY "Staff update votes for committee motion"
  ON public.votes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'admin', 'smt')
    )
    AND EXISTS (
      SELECT 1
      FROM public.vote_items vi
      WHERE vi.id = votes.vote_item_id
        AND vi.closed_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'admin', 'smt')
    )
    AND EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.allocations a ON a.conference_id = vi.conference_id
      WHERE vi.id = votes.vote_item_id
        AND (
          (votes.allocation_id IS NOT NULL AND a.id = votes.allocation_id)
          OR (votes.allocation_id IS NULL AND votes.user_id IS NOT NULL AND a.user_id = votes.user_id)
        )
    )
    AND (
      value IN ('yes', 'no')
      OR (
        value = 'abstain'
        AND EXISTS (
          SELECT 1
          FROM public.vote_items vi
          WHERE vi.id = votes.vote_item_id
            AND (
              vi.vote_type IN ('resolution', 'amendment')
              OR vi.procedure_code = 'agenda_floor'
            )
        )
      )
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.vote_items vi
        JOIN public.procedure_states ps ON ps.conference_id = vi.conference_id
        JOIN public.allocations a ON a.conference_id = vi.conference_id
        WHERE vi.id = votes.vote_item_id
          AND vi.closed_at IS NULL
          AND ps.state = 'voting_procedure'
          AND ps.current_vote_item_id = votes.vote_item_id
          AND (
            (votes.allocation_id IS NOT NULL AND a.id = votes.allocation_id)
            OR (votes.allocation_id IS NULL AND votes.user_id IS NOT NULL AND a.user_id = votes.user_id)
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.vote_items vi
        JOIN public.allocations a ON a.conference_id = vi.conference_id
        WHERE vi.id = votes.vote_item_id
          AND vi.closed_at IS NULL
          AND vi.procedure_code = 'agenda_floor'
          AND (
            (votes.allocation_id IS NOT NULL AND a.id = votes.allocation_id)
            OR (votes.allocation_id IS NULL AND votes.user_id IS NOT NULL AND a.user_id = votes.user_id)
          )
      )
    )
  );

COMMIT;
