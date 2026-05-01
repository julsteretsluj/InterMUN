-- Agenda floor: default required majority 2/3; allow chair-recorded abstain (same roll rules as resolution/amendment).

BEGIN;

UPDATE public.vote_items
SET required_majority = '2/3'
WHERE procedure_code = 'agenda_floor';

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
    AND (
      value IN ('yes', 'no')
      OR (
        value = 'abstain'
        AND EXISTS (
          SELECT 1
          FROM public.vote_items vi
          LEFT JOIN public.allocations a
            ON a.conference_id = vi.conference_id
           AND a.user_id = votes.user_id
          LEFT JOIN public.roll_call_entries r
            ON r.conference_id = vi.conference_id
           AND r.allocation_id = a.id
          WHERE vi.id = votes.vote_item_id
            AND (
              vi.vote_type IN ('resolution', 'amendment')
              OR vi.procedure_code = 'agenda_floor'
            )
            AND COALESCE(r.attendance, 'absent') <> 'present_voting'
        )
      )
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.vote_items vi
        JOIN public.procedure_states ps ON ps.conference_id = vi.conference_id
        JOIN public.allocations a ON a.conference_id = vi.conference_id AND a.user_id = votes.user_id
        WHERE vi.id = votes.vote_item_id
          AND vi.closed_at IS NULL
          AND ps.state = 'voting_procedure'
          AND ps.current_vote_item_id = votes.vote_item_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.vote_items vi
        JOIN public.allocations a ON a.conference_id = vi.conference_id AND a.user_id = votes.user_id
        WHERE vi.id = votes.vote_item_id
          AND vi.closed_at IS NULL
          AND vi.procedure_code = 'agenda_floor'
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
    AND (
      value IN ('yes', 'no')
      OR (
        value = 'abstain'
        AND EXISTS (
          SELECT 1
          FROM public.vote_items vi
          LEFT JOIN public.allocations a
            ON a.conference_id = vi.conference_id
           AND a.user_id = votes.user_id
          LEFT JOIN public.roll_call_entries r
            ON r.conference_id = vi.conference_id
           AND r.allocation_id = a.id
          WHERE vi.id = votes.vote_item_id
            AND (
              vi.vote_type IN ('resolution', 'amendment')
              OR vi.procedure_code = 'agenda_floor'
            )
            AND COALESCE(r.attendance, 'absent') <> 'present_voting'
        )
      )
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.vote_items vi
        JOIN public.procedure_states ps ON ps.conference_id = vi.conference_id
        JOIN public.allocations a ON a.conference_id = vi.conference_id AND a.user_id = votes.user_id
        WHERE vi.id = votes.vote_item_id
          AND vi.closed_at IS NULL
          AND ps.state = 'voting_procedure'
          AND ps.current_vote_item_id = votes.vote_item_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.vote_items vi
        JOIN public.allocations a ON a.conference_id = vi.conference_id AND a.user_id = votes.user_id
        WHERE vi.id = votes.vote_item_id
          AND vi.closed_at IS NULL
          AND vi.procedure_code = 'agenda_floor'
      )
    )
  );

COMMIT;
