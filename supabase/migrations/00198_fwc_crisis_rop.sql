-- Copyright (c) 2026 Intermun. All rights reserved.
-- FWC-only crisis RoP: directives, character positions, movement queue, meters.

BEGIN;

-- =====================================================================
-- 1. Directives
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.fwc_directives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  title text NOT NULL,
  submitter_allocation_id uuid NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  co_submitter_allocation_ids uuid[] NOT NULL DEFAULT '{}',
  directive_type text NOT NULL
    CHECK (directive_type IN (
      'personal',
      'joint',
      'cabinet',
      'press_release',
      'rapid_crisis_action'
    )),
  target_grid text,
  request_body text NOT NULL,
  assets_and_powers jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text,
  anonymity_status text NOT NULL DEFAULT 'inactive'
    CHECK (anonymity_status IN ('active', 'inactive')),
  approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN (
      'pending',
      'approved',
      'approved_with_conditions',
      'rejected',
      'needs_revision'
    )),
  resolution_details text,
  evaluation jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    anonymity_status = 'inactive'
    OR directive_type IN ('personal', 'joint', 'press_release')
  )
);

CREATE INDEX IF NOT EXISTS fwc_directives_conference_id_idx
  ON public.fwc_directives (conference_id);
CREATE INDEX IF NOT EXISTS fwc_directives_approval_status_idx
  ON public.fwc_directives (conference_id, approval_status);
CREATE INDEX IF NOT EXISTS fwc_directives_submitter_allocation_id_idx
  ON public.fwc_directives (submitter_allocation_id);

COMMENT ON TABLE public.fwc_directives IS
  'FWC crisis directives (personal/joint/cabinet/press/rapid). Canonical FWC conference_id.';

COMMENT ON COLUMN public.fwc_directives.evaluation IS
  'Chair Backroom 5-point evaluation payload (verdict, criterion_scores, recommended_resolution).';

-- Delegate-facing read: hide submitter when anonymity is active.
-- Chairs/SMT/admin should query fwc_directives (full row). The base table
-- SELECT policy is chamber-wide, so application code must use this view
-- (or redact submitter) for delegate UIs.
CREATE OR REPLACE VIEW public.fwc_directives_public
WITH (security_invoker = true) AS
SELECT
  id,
  conference_id,
  title,
  CASE
    WHEN anonymity_status = 'active' THEN NULL
    ELSE submitter_allocation_id
  END AS submitter_allocation_id,
  CASE
    WHEN anonymity_status = 'active' THEN '{}'::uuid[]
    ELSE co_submitter_allocation_ids
  END AS co_submitter_allocation_ids,
  directive_type,
  target_grid,
  request_body,
  assets_and_powers,
  reason,
  anonymity_status,
  approval_status,
  resolution_details,
  evaluation,
  created_at,
  updated_at
FROM public.fwc_directives;

COMMENT ON VIEW public.fwc_directives_public IS
  'Chamber-readable directives with submitter fields nulled when anonymity_status is active. Prefer this view for delegate UIs; chairs read fwc_directives.';

-- =====================================================================
-- 2. Character states (created by app on first FWC use; do not seed)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.fwc_character_states (
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  allocation_id uuid NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  current_grid text NOT NULL,
  base_mp integer NOT NULL,
  bonus_mp integer NOT NULL DEFAULT 0,
  anonymity_used_session boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conference_id, allocation_id)
);

CREATE INDEX IF NOT EXISTS fwc_character_states_allocation_id_idx
  ON public.fwc_character_states (allocation_id);

COMMENT ON TABLE public.fwc_character_states IS
  'Persistent FWC character position and MP. Created by the app on first FWC use from the static character catalog; do not seed.';

-- =====================================================================
-- 3. Movement queue
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.fwc_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id uuid NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  delegate_allocation_id uuid NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  current_grid text NOT NULL,
  target_grid text NOT NULL,
  base_mp integer NOT NULL,
  bonus_mp integer NOT NULL DEFAULT 0,
  terrain_type text NOT NULL
    CHECK (terrain_type IN (
      'road_pavement',
      'building_interior',
      'forest_trees',
      'water_shallow',
      'corrupted_terrain',
      'spore_cloud',
      'void_deep_rift',
      'impassable'
    )),
  post_movement_action text NOT NULL DEFAULT 'none'
    CHECK (post_movement_action IN (
      'search_for_evidence',
      'send_directive',
      'none'
    )),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fwc_movements_conference_id_idx
  ON public.fwc_movements (conference_id);
CREATE INDEX IF NOT EXISTS fwc_movements_status_idx
  ON public.fwc_movements (conference_id, status);
CREATE INDEX IF NOT EXISTS fwc_movements_delegate_allocation_id_idx
  ON public.fwc_movements (delegate_allocation_id);

COMMENT ON TABLE public.fwc_movements IS
  'Queued FWC map movements. Approving a row should update fwc_character_states.current_grid in application code.';

-- =====================================================================
-- 4. Meters (one row per canonical FWC conference; created by app)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.fwc_meters (
  conference_id uuid PRIMARY KEY REFERENCES public.conferences(id) ON DELETE CASCADE,
  public_panic_exposure integer NOT NULL DEFAULT 0
    CHECK (public_panic_exposure >= 0 AND public_panic_exposure <= 100),
  dimensional_breach_index integer NOT NULL DEFAULT 1
    CHECK (dimensional_breach_index >= 1 AND dimensional_breach_index <= 5),
  hive_strain_spore_density integer NOT NULL DEFAULT 0
    CHECK (hive_strain_spore_density >= 0 AND hive_strain_spore_density <= 100),
  covert_secrecy_index integer NOT NULL DEFAULT 0
    CHECK (covert_secrecy_index >= 0 AND covert_secrecy_index <= 100),
  subterranean_footprint integer NOT NULL DEFAULT 0
    CHECK (subterranean_footprint >= 0 AND subterranean_footprint <= 100),
  subject_control_rating integer NOT NULL DEFAULT 0
    CHECK (subject_control_rating >= 0 AND subject_control_rating <= 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.fwc_meters IS
  'FWC crisis meters (one row per canonical FWC conference). Created by the app on first FWC use; do not seed.';

-- =====================================================================
-- RLS: seated chamber (via user_can_access_chamber_conference) can SELECT.
-- Chairs / SMT / admin can write. Delegate writes go through server actions
-- (service role or later SECURITY DEFINER helpers).
-- =====================================================================

ALTER TABLE public.fwc_directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_character_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fwc_meters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fwc_directives_select_chamber ON public.fwc_directives;
CREATE POLICY fwc_directives_select_chamber
  ON public.fwc_directives
  FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_chamber_conference((SELECT auth.uid()), conference_id)
  );

DROP POLICY IF EXISTS fwc_directives_write_staff ON public.fwc_directives;
CREATE POLICY fwc_directives_write_staff
  ON public.fwc_directives
  FOR ALL
  TO authenticated
  USING (public.is_staff_user((SELECT auth.uid())))
  WITH CHECK (public.is_staff_user((SELECT auth.uid())));

DROP POLICY IF EXISTS fwc_character_states_select_chamber ON public.fwc_character_states;
CREATE POLICY fwc_character_states_select_chamber
  ON public.fwc_character_states
  FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_chamber_conference((SELECT auth.uid()), conference_id)
  );

DROP POLICY IF EXISTS fwc_character_states_write_staff ON public.fwc_character_states;
CREATE POLICY fwc_character_states_write_staff
  ON public.fwc_character_states
  FOR ALL
  TO authenticated
  USING (public.is_staff_user((SELECT auth.uid())))
  WITH CHECK (public.is_staff_user((SELECT auth.uid())));

DROP POLICY IF EXISTS fwc_movements_select_chamber ON public.fwc_movements;
CREATE POLICY fwc_movements_select_chamber
  ON public.fwc_movements
  FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_chamber_conference((SELECT auth.uid()), conference_id)
  );

DROP POLICY IF EXISTS fwc_movements_write_staff ON public.fwc_movements;
CREATE POLICY fwc_movements_write_staff
  ON public.fwc_movements
  FOR ALL
  TO authenticated
  USING (public.is_staff_user((SELECT auth.uid())))
  WITH CHECK (public.is_staff_user((SELECT auth.uid())));

DROP POLICY IF EXISTS fwc_meters_select_chamber ON public.fwc_meters;
CREATE POLICY fwc_meters_select_chamber
  ON public.fwc_meters
  FOR SELECT
  TO authenticated
  USING (
    public.user_can_access_chamber_conference((SELECT auth.uid()), conference_id)
  );

DROP POLICY IF EXISTS fwc_meters_write_staff ON public.fwc_meters;
CREATE POLICY fwc_meters_write_staff
  ON public.fwc_meters
  FOR ALL
  TO authenticated
  USING (public.is_staff_user((SELECT auth.uid())))
  WITH CHECK (public.is_staff_user((SELECT auth.uid())));

GRANT SELECT ON public.fwc_directives_public TO authenticated;

-- =====================================================================
-- Realtime (same guarded pattern as 00197_discipline_enforcement)
-- =====================================================================

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fwc_directives',
    'fwc_character_states',
    'fwc_movements',
    'fwc_meters'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'supabase_realtime publication missing; skip FWC crisis realtime.';
END
$$;

COMMIT;
