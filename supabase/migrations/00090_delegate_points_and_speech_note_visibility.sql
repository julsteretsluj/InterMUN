-- Delegate-scoped chair points + delegate visibility for chair speech notes.

BEGIN;

CREATE TABLE IF NOT EXISTS public.chair_delegate_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,
  chair_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  allocation_id UUID NOT NULL REFERENCES public.allocations(id) ON DELETE CASCADE,
  point_text TEXT NOT NULL DEFAULT '',
  starred BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chair_delegate_points_conference_created
  ON public.chair_delegate_points (conference_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chair_delegate_points_allocation_created
  ON public.chair_delegate_points (allocation_id, created_at DESC);

ALTER TABLE public.chair_delegate_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chair_delegate_points_staff_select ON public.chair_delegate_points;
CREATE POLICY chair_delegate_points_staff_select
  ON public.chair_delegate_points
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role IN ('smt', 'admin')
          OR (
            p.role = 'chair'
            AND EXISTS (
              SELECT 1
              FROM public.allocations a
              WHERE a.conference_id = chair_delegate_points.conference_id
                AND a.user_id = auth.uid()
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS chair_delegate_points_delegate_select ON public.chair_delegate_points;
CREATE POLICY chair_delegate_points_delegate_select
  ON public.chair_delegate_points
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.allocations a
      WHERE a.id = chair_delegate_points.allocation_id
        AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chair_delegate_points_staff_insert ON public.chair_delegate_points;
CREATE POLICY chair_delegate_points_staff_insert
  ON public.chair_delegate_points
  FOR INSERT
  TO authenticated
  WITH CHECK (
    chair_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role IN ('smt', 'admin')
          OR (
            p.role = 'chair'
            AND EXISTS (
              SELECT 1
              FROM public.allocations a
              WHERE a.conference_id = chair_delegate_points.conference_id
                AND a.user_id = auth.uid()
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS chair_delegate_points_staff_update ON public.chair_delegate_points;
CREATE POLICY chair_delegate_points_staff_update
  ON public.chair_delegate_points
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role IN ('smt', 'admin')
          OR (
            p.role = 'chair'
            AND EXISTS (
              SELECT 1
              FROM public.allocations a
              WHERE a.conference_id = chair_delegate_points.conference_id
                AND a.user_id = auth.uid()
            )
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role IN ('smt', 'admin')
          OR (
            p.role = 'chair'
            AND EXISTS (
              SELECT 1
              FROM public.allocations a
              WHERE a.conference_id = chair_delegate_points.conference_id
                AND a.user_id = auth.uid()
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS chair_delegate_points_staff_delete ON public.chair_delegate_points;
CREATE POLICY chair_delegate_points_staff_delete
  ON public.chair_delegate_points
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role IN ('smt', 'admin')
          OR (
            p.role = 'chair'
            AND EXISTS (
              SELECT 1
              FROM public.allocations a
              WHERE a.conference_id = chair_delegate_points.conference_id
                AND a.user_id = auth.uid()
            )
          )
        )
    )
  );

-- Speech notes: also readable by the delegate tied to allocation_id.
DROP POLICY IF EXISTS chair_speech_notes_staff_select ON public.chair_speech_notes;
CREATE POLICY chair_speech_notes_staff_select
  ON public.chair_speech_notes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.role IN ('smt', 'admin')
          OR (
            p.role = 'chair'
            AND EXISTS (
              SELECT 1
              FROM public.allocations a
              WHERE a.conference_id = chair_speech_notes.conference_id
                AND a.user_id = auth.uid()
            )
          )
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.allocations a
      WHERE a.id = chair_speech_notes.allocation_id
        AND a.user_id = auth.uid()
    )
  );

COMMIT;
