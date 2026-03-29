-- In-committee voting: only staff record yes/no per delegate; delegates cannot self-submit.
-- Skipped (absent) delegates have no row and do not count toward majority denominators.

BEGIN;

DROP POLICY IF EXISTS "Users can insert own vote" ON public.votes;
DROP POLICY IF EXISTS "Users can update own vote" ON public.votes;

CREATE POLICY "Staff insert votes for committee motion"
  ON public.votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'admin', 'smt')
    )
    AND value IN ('yes', 'no')
    AND EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.procedure_states ps ON ps.conference_id = vi.conference_id
      JOIN public.allocations a ON a.conference_id = vi.conference_id AND a.user_id = votes.user_id
      WHERE vi.id = votes.vote_item_id
        AND vi.closed_at IS NULL
        AND ps.state = 'voting_procedure'
        AND ps.current_vote_item_id = votes.vote_item_id
    )
  );

CREATE POLICY "Staff update votes for committee motion"
  ON public.votes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'admin', 'smt')
    )
    AND EXISTS (
      SELECT 1 FROM public.vote_items vi
      WHERE vi.id = votes.vote_item_id
        AND vi.closed_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'admin', 'smt')
    )
    AND value IN ('yes', 'no')
    AND EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.procedure_states ps ON ps.conference_id = vi.conference_id
      JOIN public.allocations a ON a.conference_id = vi.conference_id AND a.user_id = votes.user_id
      WHERE vi.id = votes.vote_item_id
        AND vi.closed_at IS NULL
        AND ps.state = 'voting_procedure'
        AND ps.current_vote_item_id = votes.vote_item_id
    )
  );

CREATE POLICY "Staff delete votes for committee motion"
  ON public.votes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'admin', 'smt')
    )
    AND EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.procedure_states ps ON ps.conference_id = vi.conference_id
      WHERE vi.id = votes.vote_item_id
        AND vi.closed_at IS NULL
        AND ps.state = 'voting_procedure'
        AND ps.current_vote_item_id = votes.vote_item_id
    )
  );

COMMIT;
