-- Motion recording + voting hardening:
-- - single active/open motion per conference
-- - formal motion audit timeline
-- - delegates-only voting on currently open motion in their joined committee

BEGIN;

-- Enforce one open motion at a time per conference.
CREATE UNIQUE INDEX IF NOT EXISTS idx_vote_items_one_open_per_conference
  ON public.vote_items (conference_id)
  WHERE closed_at IS NULL;

-- Audit timeline for motion lifecycle actions.
CREATE TABLE IF NOT EXISTS public.motion_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  vote_item_id UUID NOT NULL REFERENCES public.vote_items(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'edited', 'opened', 'closed')),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_motion_audit_events_conf_created
  ON public.motion_audit_events (conference_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_motion_audit_events_vote_item_created
  ON public.motion_audit_events (vote_item_id, created_at DESC);

ALTER TABLE public.motion_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS motion_audit_events_select ON public.motion_audit_events;
CREATE POLICY motion_audit_events_select
  ON public.motion_audit_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text IN ('chair', 'smt', 'admin')
    )
    OR EXISTS (
      SELECT 1
      FROM public.allocations a
      WHERE a.conference_id = motion_audit_events.conference_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS motion_audit_events_insert_chair ON public.motion_audit_events;
CREATE POLICY motion_audit_events_insert_chair
  ON public.motion_audit_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text = 'chair'
    )
  );

CREATE OR REPLACE FUNCTION public.log_vote_item_motion_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.motion_audit_events (
      conference_id,
      vote_item_id,
      event_type,
      actor_profile_id,
      metadata
    )
    VALUES (
      NEW.conference_id,
      NEW.id,
      'created',
      v_actor,
      jsonb_build_object('vote_type', NEW.vote_type, 'title', NEW.title)
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (
      COALESCE(OLD.title, '') IS DISTINCT FROM COALESCE(NEW.title, '')
      OR COALESCE(OLD.description, '') IS DISTINCT FROM COALESCE(NEW.description, '')
      OR OLD.must_vote IS DISTINCT FROM NEW.must_vote
      OR COALESCE(OLD.required_majority, '') IS DISTINCT FROM COALESCE(NEW.required_majority, '')
      OR OLD.vote_type IS DISTINCT FROM NEW.vote_type
    ) THEN
      INSERT INTO public.motion_audit_events (
        conference_id,
        vote_item_id,
        event_type,
        actor_profile_id,
        metadata
      )
      VALUES (
        NEW.conference_id,
        NEW.id,
        'edited',
        v_actor,
        jsonb_build_object(
          'title', NEW.title,
          'must_vote', NEW.must_vote,
          'required_majority', NEW.required_majority
        )
      );
    END IF;

    IF OLD.closed_at IS NULL AND NEW.closed_at IS NOT NULL THEN
      INSERT INTO public.motion_audit_events (
        conference_id,
        vote_item_id,
        event_type,
        actor_profile_id,
        metadata
      )
      VALUES (
        NEW.conference_id,
        NEW.id,
        'closed',
        v_actor,
        jsonb_build_object('closed_at', NEW.closed_at)
      );
    ELSIF OLD.closed_at IS NOT NULL AND NEW.closed_at IS NULL THEN
      INSERT INTO public.motion_audit_events (
        conference_id,
        vote_item_id,
        event_type,
        actor_profile_id,
        metadata
      )
      VALUES (
        NEW.conference_id,
        NEW.id,
        'opened',
        v_actor,
        '{}'::jsonb
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vote_item_motion_audit ON public.vote_items;
CREATE TRIGGER trg_vote_item_motion_audit
AFTER INSERT OR UPDATE
ON public.vote_items
FOR EACH ROW
EXECUTE FUNCTION public.log_vote_item_motion_audit();

-- Delegate-only vote insert/update on currently open motion in their conference.
DROP POLICY IF EXISTS "Users can insert own vote" ON public.votes;
DROP POLICY IF EXISTS "Users can update own vote" ON public.votes;

CREATE POLICY "Users can insert own vote"
  ON public.votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text = 'delegate'
    )
    AND EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.allocations a
        ON a.conference_id = vi.conference_id
       AND a.user_id = auth.uid()
      WHERE vi.id = votes.vote_item_id
        AND vi.closed_at IS NULL
    )
  );

CREATE POLICY "Users can update own vote"
  ON public.votes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role::text = 'delegate'
    )
    AND EXISTS (
      SELECT 1
      FROM public.vote_items vi
      JOIN public.allocations a
        ON a.conference_id = vi.conference_id
       AND a.user_id = auth.uid()
      WHERE vi.id = votes.vote_item_id
        AND vi.closed_at IS NULL
    )
  );

COMMIT;

