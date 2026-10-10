-- Copyright (c) 2026 Intermun. All rights reserved.
-- FWC SEAMUN I 2027 RoP engine: fwc_crisis procedure profile, crisis session
-- state + Hawkins clock, directive workflow (signatures, audit, review
-- responses, floor votes, feed), crisis updates + pathway votes, powers,
-- statuses, inventories, delegate floor requests, end-of-day outcomes.
-- Rules themselves live in lib/rop/fwc-seamun-i-2027.ts; tables store state.

BEGIN;

-- =====================================================================
-- 1. Procedure profile: fwc_crisis
-- =====================================================================

ALTER TABLE public.conferences
  DROP CONSTRAINT IF EXISTS conferences_procedure_profile_check;

ALTER TABLE public.conferences
  ADD CONSTRAINT conferences_procedure_profile_check
  CHECK (procedure_profile IN ('default', 'eu_parliament', 'press_corps', 'fwc_crisis'));

COMMENT ON COLUMN public.conferences.procedure_profile IS
  'Procedure ruleset: default (GA-style), eu_parliament, press_corps, or fwc_crisis (FWC SEAMUN I 2027 crisis RoP).';

-- Extend the allowed-profile list inside the SMT committee RPCs without
-- re-declaring their bodies (keeps any later permission changes intact).
DO $$
DECLARE
  r record;
  v_def text;
  v_new text;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    WHERE p.proname IN ('update_chamber_committee_profile_smt', 'update_committee_session_smt')
  LOOP
    v_def := pg_get_functiondef(r.oid);
    v_new := regexp_replace(
      v_def,
      'v_profile NOT IN \(''default'', ''eu_parliament''(, ''press_corps'')?\)',
      'v_profile NOT IN (''default'', ''eu_parliament'', ''press_corps'', ''fwc_crisis'')',
      'g'
    );
    IF v_new <> v_def THEN
      EXECUTE v_new;
    END IF;
  END LOOP;
END
$$;

UPDATE public.conferences
SET procedure_profile = 'fwc_crisis', eu_guided_workflow_enabled = false
WHERE lower(btrim(coalesce(committee, ''))) LIKE 'fwc%'
   OR upper(btrim(coalesce(committee_code, ''))) LIKE 'FWC%';

-- =====================================================================
-- 2. Helpers
-- =====================================================================

-- Allocation ids seated to the caller (any conference). Used by RLS.
CREATE OR REPLACE FUNCTION private.fwc_my_allocation_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(array_agg(a.id), ARRAY[]::uuid[])
  FROM public.allocations a
  WHERE a.user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION private.fwc_my_allocation_ids() FROM public;
GRANT EXECUTE ON FUNCTION private.fwc_my_allocation_ids() TO authenticated;

-- =====================================================================
-- 3. Crisis session state + Hawkins clock (one row per canonical FWC conference)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.fwc_session_state (
  conference_id uuid PRIMARY KEY REFERENCES public.conferences(id) ON DELETE CASCADE,
  crisis_day integer NOT NULL DEFAULT 1 CHECK (crisis_day >= 1),
  crisis_session integer NOT NULL DEFAULT 1 CHECK (crisis_session >= 1),
  mod_caucus_count integer NOT NULL DEFAULT 0 CHECK (mod_caucus_count >= 0),
  motion_round integer NOT NULL DEFAULT 1 CHECK (motion_round >= 1),
  is_last_session boolean NOT NULL DEFAULT false,
  -- Mirrors of the code config (lib/rop) so the session trigger can freeze the clock.
  clock_rate numeric NOT NULL DEFAULT 6 CHECK (clock_rate > 0),
  clock_start_minutes integer NOT NULL DEFAULT 720,
  clock_carry_over boolean NOT NULL DEFAULT false,
  clock_session_started_at timestamptz,
  clock_session_base_minutes numeric,
  clock_override_minutes numeric,
  clock_override_at timestamptz,
  clock_paused boolean NOT NULL DEFAULT false,
  clock_paused_minutes numeric,
  clock_frozen_minutes numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fwc_session_state IS
  'FWC crisis counters (day/session/mod caucuses/motion round) and Hawkins in-game clock state. Created by the app.';

-- Anchor / freeze the Hawkins clock when the committee session starts or stops.
CREATE OR REPLACE FUNCTION private.fwc_clock_on_session_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event uuid;
  v_grp text;
  s record;
  v_elapsed numeric;
  v_now numeric;
BEGIN
  IF NEW.committee_session_started_at IS NOT DISTINCT FROM OLD.committee_session_started_at THEN
    RETURN NEW;
  END IF;

  SELECT c.event_id, public.committee_session_group_key(c.committee)
  INTO v_event, v_grp
  FROM public.conferences c
  WHERE c.id = NEW.conference_id;

  FOR s IN
    SELECT st.*
    FROM public.fwc_session_state st
    JOIN public.conferences c ON c.id = st.conference_id
    WHERE st.conference_id = NEW.conference_id
       OR (v_grp IS NOT NULL AND c.event_id = v_event AND public.committee_session_group_key(c.committee) = v_grp)
  LOOP
    IF NEW.committee_session_started_at IS NOT NULL THEN
      IF s.clock_session_started_at IS NOT DISTINCT FROM NEW.committee_session_started_at THEN
        CONTINUE;
      END IF;
      UPDATE public.fwc_session_state
      SET
        crisis_session = CASE WHEN s.clock_session_started_at IS NULL THEN s.crisis_session ELSE s.crisis_session + 1 END,
        motion_round = 1,
        clock_session_started_at = NEW.committee_session_started_at,
        clock_session_base_minutes = CASE
          WHEN s.clock_carry_over AND s.clock_frozen_minutes IS NOT NULL THEN s.clock_frozen_minutes
          ELSE s.clock_start_minutes
        END,
        clock_override_minutes = NULL,
        clock_override_at = NULL,
        clock_paused = false,
        clock_paused_minutes = NULL,
        updated_at = now()
      WHERE conference_id = s.conference_id;

      -- New crisis session: anonymity and MP reset.
      UPDATE public.fwc_character_states
      SET anonymity_used_session = false, mp_spent = 0, updated_at = now()
      WHERE conference_id = s.conference_id;
    ELSIF OLD.committee_session_started_at IS NOT NULL THEN
      IF s.clock_paused THEN
        v_now := coalesce(s.clock_paused_minutes, s.clock_frozen_minutes, s.clock_start_minutes);
      ELSIF s.clock_override_at IS NOT NULL
        AND s.clock_override_minutes IS NOT NULL
        AND s.clock_override_at >= OLD.committee_session_started_at THEN
        v_elapsed := greatest(0, extract(epoch FROM (now() - s.clock_override_at))) / 60.0;
        v_now := s.clock_override_minutes + v_elapsed * s.clock_rate;
      ELSE
        v_elapsed := greatest(0, extract(epoch FROM (now() - OLD.committee_session_started_at))) / 60.0;
        v_now := coalesce(
          CASE WHEN s.clock_session_started_at = OLD.committee_session_started_at THEN s.clock_session_base_minutes END,
          s.clock_start_minutes
        ) + v_elapsed * s.clock_rate;
      END IF;
      UPDATE public.fwc_session_state
      SET clock_frozen_minutes = v_now, clock_paused = false, clock_paused_minutes = NULL, updated_at = now()
      WHERE conference_id = s.conference_id;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fwc_clock_on_session_change ON public.procedure_states;
CREATE TRIGGER trg_fwc_clock_on_session_change
  AFTER INSERT OR UPDATE OF committee_session_started_at ON public.procedure_states
  FOR EACH ROW EXECUTE FUNCTION private.fwc_clock_on_session_change();

-- =====================================================================
-- 4. Character state additions
-- =====================================================================

ALTER TABLE public.fwc_character_states
  ADD COLUMN IF NOT EXISTS mp_spent integer NOT NULL DEFAULT 0 CHECK (mp_spent >= 0),
  ADD COLUMN IF NOT EXISTS meters jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.fwc_character_states.mp_spent IS
  'MP spent in the current crisis session (movement cycle). Reset when a new committee session starts.';
COMMENT ON COLUMN public.fwc_character_states.meters IS
  'Per-character meters keyed by lib/rop meter key (0–100).';

-- =====================================================================
-- 5. Directive workflow
-- =====================================================================

ALTER TABLE public.fwc_directives
  DROP CONSTRAINT IF EXISTS fwc_directives_approval_status_check;
ALTER TABLE public.fwc_directives
  ADD CONSTRAINT fwc_directives_approval_status_check
  CHECK (approval_status IN (
    'draft',
    'awaiting_signatures',
    'pending',
    'on_floor',
    'approved',
    'approved_with_conditions',
    'rejected',
    'needs_revision',
    'withdrawn'
  ));

ALTER TABLE public.fwc_directives
  ALTER COLUMN request_body SET DEFAULT '',
  ADD COLUMN IF NOT EXISTS character_power text,
  ADD COLUMN IF NOT EXISTS power_key text,
  ADD COLUMN IF NOT EXISTS assets text,
  ADD COLUMN IF NOT EXISTS resource text,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'authors'
    CHECK (visibility IN ('authors', 'committee')),
  ADD COLUMN IF NOT EXISTS response_to_author text,
  ADD COLUMN IF NOT EXISTS public_outcome text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS cabinet_key text,
  ADD COLUMN IF NOT EXISTS is_final boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crisis_day integer,
  ADD COLUMN IF NOT EXISTS crisis_session integer,
  ADD COLUMN IF NOT EXISTS crisis_update_id uuid,
  ADD COLUMN IF NOT EXISTS vote_item_id uuid REFERENCES public.vote_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS floor_outcome text CHECK (floor_outcome IS NULL OR floor_outcome IN ('passed', 'failed')),
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by_role text,
  ADD COLUMN IF NOT EXISTS acting_for_allocation_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.fwc_directives.response_to_author IS
  'Dais written response delivered to the author(s) (approve / conditions / reject / needs revision).';
COMMENT ON COLUMN public.fwc_directives.public_outcome IS
  'Outcome text published to the crisis feed (never the private request).';
COMMENT ON COLUMN public.fwc_directives.created_by_role IS
  'Actor attribution: delegate | smt_acting | chair. acting_for_allocation_id is set when SMT acted for a seat.';

CREATE INDEX IF NOT EXISTS fwc_directives_vote_item_idx ON public.fwc_directives (vote_item_id) WHERE vote_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS fwc_directives_day_idx ON public.fwc_directives (conference_id, crisis_day);

-- Recreate the public view with the new columns (anonymity still redacts authors).
DROP VIEW IF EXISTS public.fwc_directives_public;
CREATE VIEW public.fwc_directives_public
WITH (security_invoker = true) AS
SELECT
  id,
  conference_id,
  title,
  CASE WHEN anonymity_status = 'active' THEN NULL ELSE submitter_allocation_id END AS submitter_allocation_id,
  CASE WHEN anonymity_status = 'active' THEN '{}'::uuid[] ELSE co_submitter_allocation_ids END AS co_submitter_allocation_ids,
  directive_type,
  target_grid,
  request_body,
  assets_and_powers,
  character_power,
  assets,
  resource,
  reason,
  anonymity_status,
  approval_status,
  visibility,
  public_outcome,
  published_at,
  cabinet_key,
  is_final,
  crisis_day,
  crisis_session,
  vote_item_id,
  floor_outcome,
  submitted_at,
  created_at,
  updated_at
FROM public.fwc_directives;

GRANT SELECT ON public.fwc_directives_public TO authenticated;

-- Secret directives: staff, authors and co-signers only; committee-visible
-- types (cabinet) once submitted.
DROP POLICY IF EXISTS fwc_directives_select_chamber ON public.fwc_directives;
DROP POLICY IF EXISTS fwc_directives_select_scoped ON public.fwc_directives;
CREATE POLICY fwc_directives_select_scoped
  ON public.fwc_directives
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user((SELECT auth.uid()))
    OR submitter_allocation_id = ANY (private.fwc_my_allocation_ids())
    OR co_submitter_allocation_ids && private.fwc_my_allocation_ids()
    OR (
      visibility = 'committee'
      AND approval_status NOT IN ('draft', 'awaiting_signatures', 'withdrawn')
      AND public.user_can_access_chamber_conference((SELECT auth.uid()), conference_id)
    )
  );

CREATE TABLE IF NOT EXISTS public.fwc_directive_signatures (
  directive_id uuid NOT NULL REFERENCES public.fwc_directives(id) ON DELETE CASCADE,
  allocation_id uuid NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined')),
  responded_at timestamptz,
  responded_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (directive_id, allocation_id)
);

CREATE INDEX IF NOT EXISTS fwc_directive_signatures_allocation_idx
  ON public.fwc_directive_signatures (allocation_id);

COMMENT ON TABLE public.fwc_directive_signatures IS
  'Co-signer / sponsor sign-off for joint and cabinet directives.';

CREATE TABLE IF NOT EXISTS public.fwc_directive_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  directive_id uuid NOT NULL REFERENCES public.fwc_directives(id) ON DELETE CASCADE,
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_status text,
  to_status text,
  note text,
  internal boolean NOT NULL DEFAULT false,
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role text,
  acting_allocation_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fwc_directive_events_directive_idx
  ON public.fwc_directive_events (directive_id, created_at);

COMMENT ON TABLE public.fwc_directive_events IS
  'Directive audit history with actor attribution (actor_role delegate | smt_acting | chair | system).';

-- Floor vote on a cabinet directive resolves it automatically.
CREATE OR REPLACE FUNCTION private.fwc_on_vote_item_outcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  d record;
  v_event uuid;
  v_grp text;
BEGIN
  IF NEW.outcome IS NULL OR NEW.outcome IS NOT DISTINCT FROM OLD.outcome THEN
    RETURN NEW;
  END IF;

  FOR d IN
    SELECT id, conference_id, approval_status FROM public.fwc_directives
    WHERE vote_item_id = NEW.id AND approval_status = 'on_floor'
  LOOP
    UPDATE public.fwc_directives
    SET
      approval_status = CASE WHEN NEW.outcome = 'passed' THEN 'approved' ELSE 'rejected' END,
      floor_outcome = NEW.outcome,
      reviewed_at = now(),
      updated_at = now()
    WHERE id = d.id;
    INSERT INTO public.fwc_directive_events (directive_id, conference_id, action, from_status, to_status, note, actor_role)
    VALUES (
      d.id, d.conference_id, 'floor_result', 'on_floor',
      CASE WHEN NEW.outcome = 'passed' THEN 'approved' ELSE 'rejected' END,
      'Floor vote ' || NEW.outcome, 'system'
    );
  END LOOP;

  IF NEW.outcome = 'passed' AND NEW.procedure_code = 'moderated_caucus' THEN
    SELECT c.event_id, public.committee_session_group_key(c.committee) INTO v_event, v_grp
    FROM public.conferences c WHERE c.id = NEW.conference_id;
    UPDATE public.fwc_session_state st
    SET mod_caucus_count = st.mod_caucus_count + 1, updated_at = now()
    FROM public.conferences c
    WHERE c.id = st.conference_id
      AND (st.conference_id = NEW.conference_id
        OR (v_grp IS NOT NULL AND c.event_id = v_event AND public.committee_session_group_key(c.committee) = v_grp));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fwc_on_vote_item_outcome ON public.vote_items;
CREATE TRIGGER trg_fwc_on_vote_item_outcome
  AFTER UPDATE OF outcome ON public.vote_items
  FOR EACH ROW EXECUTE FUNCTION private.fwc_on_vote_item_outcome();

-- =====================================================================
-- 6. Crisis updates, pathway votes, public feed
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.fwc_crisis_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  pathways jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'qa', 'choosing', 'resolved')),
  is_breach boolean NOT NULL DEFAULT true,
  qa_ends_at timestamptz,
  chosen_pathway_key text,
  crisis_day integer,
  crisis_session integer,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fwc_crisis_updates_conference_idx
  ON public.fwc_crisis_updates (conference_id, created_at DESC);

COMMENT ON TABLE public.fwc_crisis_updates IS
  'Crisis updates: 5-minute Q&A with the chairs, then delegates choose a pathway (plurality).';

ALTER TABLE public.fwc_directives
  DROP CONSTRAINT IF EXISTS fwc_directives_crisis_update_id_fkey;
ALTER TABLE public.fwc_directives
  ADD CONSTRAINT fwc_directives_crisis_update_id_fkey
  FOREIGN KEY (crisis_update_id) REFERENCES public.fwc_crisis_updates(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.fwc_pathway_votes (
  crisis_update_id uuid NOT NULL REFERENCES public.fwc_crisis_updates(id) ON DELETE CASCADE,
  allocation_id uuid NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  pathway_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (crisis_update_id, allocation_id)
);

CREATE TABLE IF NOT EXISTS public.fwc_crisis_feed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN (
    'directive_outcome', 'press_release', 'crisis_update', 'pathway', 'announcement', 'day_result'
  )),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  directive_id uuid REFERENCES public.fwc_directives(id) ON DELETE SET NULL,
  crisis_update_id uuid REFERENCES public.fwc_crisis_updates(id) ON DELETE SET NULL,
  crisis_day integer,
  published_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fwc_crisis_feed_conference_idx
  ON public.fwc_crisis_feed (conference_id, created_at DESC);

COMMENT ON TABLE public.fwc_crisis_feed IS
  'Public crisis feed: published directive outcomes, press releases, crisis updates, pathway results, day winners.';

-- =====================================================================
-- 7. Powers, statuses, inventories
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.fwc_power_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  allocation_id uuid NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  power_key text NOT NULL,
  crisis_day integer NOT NULL,
  crisis_session integer NOT NULL,
  mod_caucus_index integer NOT NULL DEFAULT 0,
  directive_id uuid REFERENCES public.fwc_directives(id) ON DELETE SET NULL,
  note text,
  voided boolean NOT NULL DEFAULT false,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fwc_power_uses_allocation_idx
  ON public.fwc_power_uses (conference_id, allocation_id, power_key);

CREATE TABLE IF NOT EXISTS public.fwc_character_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  allocation_id uuid NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  status_key text NOT NULL,
  note text,
  active boolean NOT NULL DEFAULT true,
  applied_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  cleared_at timestamptz
);

CREATE INDEX IF NOT EXISTS fwc_character_statuses_active_idx
  ON public.fwc_character_statuses (conference_id, allocation_id) WHERE active;

CREATE TABLE IF NOT EXISTS public.fwc_inventory_items (
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  code text NOT NULL,
  cabinet text NOT NULL CHECK (cabinet IN ('public', 'A', 'B', 'C', 'D', 'E')),
  category text NOT NULL DEFAULT '',
  name text NOT NULL,
  location text,
  status text,
  holder_allocation_id uuid REFERENCES public.allocations(id) ON DELETE SET NULL,
  cabinet_allocation_ids uuid[] NOT NULL DEFAULT '{}',
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conference_id, code)
);

COMMENT ON TABLE public.fwc_inventory_items IS
  'Public inventory + Cabinet A–E inventories. cabinet_allocation_ids is synced by the app for RLS.';

-- =====================================================================
-- 8. Delegate floor requests (motions / points) and day outcomes
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.fwc_floor_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  allocation_id uuid NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('motion', 'point')),
  code text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  motion_round integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn', 'resolved')),
  seconds uuid[] NOT NULL DEFAULT '{}',
  objections uuid[] NOT NULL DEFAULT '{}',
  vote_item_id uuid REFERENCES public.vote_items(id) ON DELETE SET NULL,
  chair_note text,
  created_by_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_role text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS fwc_floor_requests_pending_idx
  ON public.fwc_floor_requests (conference_id, status, created_at);

COMMENT ON TABLE public.fwc_floor_requests IS
  'Delegate-raised motions (seconds / objections; one per delegate per round) and points for the chair.';

CREATE TABLE IF NOT EXISTS public.fwc_day_outcomes (
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  crisis_day integer NOT NULL,
  winning_cabinet text,
  summary text,
  announced_at timestamptz,
  announced_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  PRIMARY KEY (conference_id, crisis_day)
);

-- =====================================================================
-- 9. RLS
-- =====================================================================

ALTER TABLE public.fwc_session_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_directive_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_directive_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_crisis_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_pathway_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_crisis_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_power_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_character_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_floor_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_day_outcomes ENABLE ROW LEVEL SECURITY;

-- Chamber-readable tables.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fwc_session_state',
    'fwc_crisis_feed',
    'fwc_pathway_votes',
    'fwc_character_statuses',
    'fwc_floor_requests',
    'fwc_day_outcomes'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_chamber', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.user_can_access_chamber_conference((SELECT auth.uid()), conference_id))',
      t || '_select_chamber', t
    );
  END LOOP;
END
$$;

-- Staff write on every new table (delegate writes go through server actions).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fwc_session_state',
    'fwc_directive_signatures',
    'fwc_directive_events',
    'fwc_crisis_updates',
    'fwc_pathway_votes',
    'fwc_crisis_feed',
    'fwc_power_uses',
    'fwc_character_statuses',
    'fwc_inventory_items',
    'fwc_floor_requests',
    'fwc_day_outcomes'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_write_staff', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_staff_user((SELECT auth.uid()))) WITH CHECK (public.is_staff_user((SELECT auth.uid())))',
      t || '_write_staff', t
    );
  END LOOP;
END
$$;

DROP POLICY IF EXISTS fwc_directive_signatures_select_scoped ON public.fwc_directive_signatures;
CREATE POLICY fwc_directive_signatures_select_scoped
  ON public.fwc_directive_signatures
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user((SELECT auth.uid()))
    OR allocation_id = ANY (private.fwc_my_allocation_ids())
    OR EXISTS (SELECT 1 FROM public.fwc_directives d WHERE d.id = directive_id)
  );

DROP POLICY IF EXISTS fwc_directive_events_select_scoped ON public.fwc_directive_events;
CREATE POLICY fwc_directive_events_select_scoped
  ON public.fwc_directive_events
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user((SELECT auth.uid()))
    OR (
      NOT internal
      AND EXISTS (
        SELECT 1 FROM public.fwc_directives d
        WHERE d.id = directive_id
          AND (
            d.submitter_allocation_id = ANY (private.fwc_my_allocation_ids())
            OR d.co_submitter_allocation_ids && private.fwc_my_allocation_ids()
          )
      )
    )
  );

DROP POLICY IF EXISTS fwc_crisis_updates_select_chamber ON public.fwc_crisis_updates;
CREATE POLICY fwc_crisis_updates_select_chamber
  ON public.fwc_crisis_updates
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user((SELECT auth.uid()))
    OR (status <> 'draft' AND public.user_can_access_chamber_conference((SELECT auth.uid()), conference_id))
  );

DROP POLICY IF EXISTS fwc_power_uses_select_scoped ON public.fwc_power_uses;
CREATE POLICY fwc_power_uses_select_scoped
  ON public.fwc_power_uses
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user((SELECT auth.uid()))
    OR allocation_id = ANY (private.fwc_my_allocation_ids())
  );

DROP POLICY IF EXISTS fwc_inventory_items_select_scoped ON public.fwc_inventory_items;
CREATE POLICY fwc_inventory_items_select_scoped
  ON public.fwc_inventory_items
  FOR SELECT
  TO authenticated
  USING (
    public.is_staff_user((SELECT auth.uid()))
    OR (cabinet = 'public' AND public.user_can_access_chamber_conference((SELECT auth.uid()), conference_id))
    OR cabinet_allocation_ids && private.fwc_my_allocation_ids()
  );

-- =====================================================================
-- 10. Realtime
-- =====================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fwc_session_state',
    'fwc_directive_signatures',
    'fwc_directive_events',
    'fwc_crisis_updates',
    'fwc_pathway_votes',
    'fwc_crisis_feed',
    'fwc_power_uses',
    'fwc_character_statuses',
    'fwc_inventory_items',
    'fwc_floor_requests',
    'fwc_day_outcomes'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'supabase_realtime publication missing; skip FWC RoP realtime.';
END
$$;

COMMIT;
