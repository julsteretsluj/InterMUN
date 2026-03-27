-- RoP Procedure States:
-- - Model DebateOpen vs VotingProcedure so delegates can be locked out during votes.
-- - Constrain delegate votes to yes/no while voting_procedure is active.

BEGIN;

-- Procedure state per conference/session.
CREATE TABLE IF NOT EXISTS public.procedure_states (
  conference_id UUID PRIMARY KEY REFERENCES public.conferences(id) ON DELETE CASCADE,
  state TEXT NOT NULL DEFAULT 'debate_open' CHECK (state IN ('debate_open', 'voting_procedure')),
  current_vote_item_id UUID REFERENCES public.vote_items(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.procedure_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS procedure_states_select ON public.procedure_states;
CREATE POLICY procedure_states_select
  ON public.procedure_states
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS procedure_states_update_chair ON public.procedure_states;
CREATE POLICY procedure_states_update_chair
  ON public.procedure_states
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'admin')
    )
  );

DROP POLICY IF EXISTS procedure_states_insert_chair ON public.procedure_states;
CREATE POLICY procedure_states_insert_chair
  ON public.procedure_states
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'admin')
    )
  );

-- Tighten delegate vote insert/update constraints:
-- - only while procedure_states.state = voting_procedure
-- - only for the current_vote_item_id
-- - only yes/no (no abstain during Present & Voting)
DROP POLICY IF EXISTS "Users can insert own vote" ON public.votes;
DROP POLICY IF EXISTS "Users can update own vote" ON public.votes;

CREATE POLICY "Users can insert own vote"
  ON public.votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND value IN ('yes', 'no')
    AND EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.procedure_states ps
        ON ps.conference_id = vi.conference_id
      WHERE vi.id = votes.vote_item_id
        AND vi.closed_at IS NULL
        AND ps.state = 'voting_procedure'
        AND ps.current_vote_item_id = votes.vote_item_id
    )
  );

CREATE POLICY "Users can update own vote"
  ON public.votes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND value IN ('yes', 'no')
    AND EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.procedure_states ps
        ON ps.conference_id = vi.conference_id
      WHERE vi.id = votes.vote_item_id
        AND vi.closed_at IS NULL
        AND ps.state = 'voting_procedure'
        AND ps.current_vote_item_id = votes.vote_item_id
    )
  );

COMMIT;

