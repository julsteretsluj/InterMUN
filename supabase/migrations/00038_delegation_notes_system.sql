-- Delegation-based notes system (replaces current chat_messages-based Notes UI)
-- Matches spec:
-- - Delegates see only notes they sent OR notes addressed to them
-- - Chairs see all committee notes; can star/forward/report
-- - SMT has 2 modes:
--   - unverified SMT: see forwarded notes in SMT inbox
--   - verified SMT (app-level cookie): see all notes for selected committee
-- - Notes are scoped by committee session: `conference_id`
-- - Notes require a topic label and an auto/placeholder concern flag

BEGIN;

-- Core note row
CREATE TABLE IF NOT EXISTS public.delegation_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES public.conferences(id) ON DELETE CASCADE,

  -- Required topic label (fixed choices from UI spec)
  topic TEXT NOT NULL CHECK (topic IN ('bloc forming', 'speech pois or pocs', 'questions', 'informal conversations')),

  content TEXT NOT NULL,
  concern_flag BOOLEAN NOT NULL DEFAULT FALSE,

  -- Sender can be either:
  -- - an allocation/delegate seat (sender_allocation_id)
  -- - a chair/SMT/admin profile (sender_profile_id)
  sender_allocation_id UUID REFERENCES public.allocations(id) ON DELETE SET NULL,
  sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,

  -- Chair forwarding workflow for SMT inbox
  forwarded_to_smt BOOLEAN NOT NULL DEFAULT FALSE,
  forwarded_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delegation_notes_conference_created
  ON public.delegation_notes (conference_id, created_at DESC);

-- Recipients: delegates (allocations), chairs (specific profile), or "any chair"
CREATE TABLE IF NOT EXISTS public.delegation_note_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.delegation_notes(id) ON DELETE CASCADE,

  recipient_kind TEXT NOT NULL CHECK (recipient_kind IN ('allocation', 'chair', 'chair_all')),
  recipient_allocation_id UUID REFERENCES public.allocations(id) ON DELETE CASCADE,
  recipient_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (
    (recipient_kind = 'allocation' AND recipient_allocation_id IS NOT NULL AND recipient_profile_id IS NULL)
    OR (recipient_kind = 'chair' AND recipient_profile_id IS NOT NULL AND recipient_allocation_id IS NULL)
    OR (recipient_kind = 'chair_all' AND recipient_allocation_id IS NULL AND recipient_profile_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_delegation_note_recipients_note
  ON public.delegation_note_recipients (note_id);

-- Per-chair star toggles
CREATE TABLE IF NOT EXISTS public.delegation_note_stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.delegation_notes(id) ON DELETE CASCADE,
  chair_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (note_id, chair_profile_id)
);

-- Per-chair reports
CREATE TABLE IF NOT EXISTS public.delegation_note_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.delegation_notes(id) ON DELETE CASCADE,
  chair_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.delegation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegation_note_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegation_note_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegation_note_reports ENABLE ROW LEVEL SECURITY;

-- --------------------
-- RLS: delegation_notes
-- --------------------

-- Staff (chair/smt/admin) can read all committee notes.
DROP POLICY IF EXISTS delegation_notes_staff_select ON public.delegation_notes;
CREATE POLICY delegation_notes_staff_select
  ON public.delegation_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  );

-- Delegates can read notes they sent (sender_allocation_id belongs to them)
-- OR notes addressed to them (a recipient allocation belongs to them).
DROP POLICY IF EXISTS delegation_notes_delegate_select ON public.delegation_notes;
CREATE POLICY delegation_notes_delegate_select
  ON public.delegation_notes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.allocations a
      WHERE a.id = delegation_notes.sender_allocation_id
        AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.delegation_note_recipients r
      JOIN public.allocations a2
        ON a2.id = r.recipient_allocation_id
      WHERE r.note_id = delegation_notes.id
        AND r.recipient_kind = 'allocation'
        AND a2.user_id = auth.uid()
    )
  );

-- Insert: delegates insert via sender_allocation_id; chairs/SMT/admin can also insert via sender_profile_id.
DROP POLICY IF EXISTS delegation_notes_insert_sender_allocation_delegate ON public.delegation_notes;
CREATE POLICY delegation_notes_insert_sender_allocation_delegate
  ON public.delegation_notes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.allocations a
      WHERE a.id = delegation_notes.sender_allocation_id
        AND a.user_id = auth.uid()
        AND a.conference_id = delegation_notes.conference_id
    )
  );

DROP POLICY IF EXISTS delegation_notes_insert_sender_profile_staff ON public.delegation_notes;
CREATE POLICY delegation_notes_insert_sender_profile_staff
  ON public.delegation_notes
  FOR INSERT
  WITH CHECK (
    sender_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  );

-- Update: only chairs/admin can forward.
DROP POLICY IF EXISTS delegation_notes_staff_update_forward ON public.delegation_notes;
CREATE POLICY delegation_notes_staff_update_forward
  ON public.delegation_notes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'admin')
    )
  );

-- -------------------------
-- RLS: delegation_note_recipients
-- -------------------------

-- Staff can read recipients.
DROP POLICY IF EXISTS delegation_note_recipients_staff_select ON public.delegation_note_recipients;
CREATE POLICY delegation_note_recipients_staff_select
  ON public.delegation_note_recipients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'smt', 'admin')
    )
  );

-- Delegates can read recipients for notes they can see.
DROP POLICY IF EXISTS delegation_note_recipients_delegate_select ON public.delegation_note_recipients;
CREATE POLICY delegation_note_recipients_delegate_select
  ON public.delegation_note_recipients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.delegation_notes n
      WHERE n.id = delegation_note_recipients.note_id
        AND (
          EXISTS (
            SELECT 1
            FROM public.allocations a
            WHERE a.id = n.sender_allocation_id
              AND a.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.delegation_note_recipients r2
            JOIN public.allocations a2
              ON a2.id = r2.recipient_allocation_id
            WHERE r2.note_id = n.id
              AND r2.recipient_kind = 'allocation'
              AND a2.user_id = auth.uid()
          )
        )
    )
  );

-- Insert recipients: only the original sender can add recipients, and delegates may only target assigned allocations.
DROP POLICY IF EXISTS delegation_note_recipients_insert ON public.delegation_note_recipients;
CREATE POLICY delegation_note_recipients_insert
  ON public.delegation_note_recipients
  FOR INSERT
  WITH CHECK (
    -- Sender owns the note
    EXISTS (
      SELECT 1
      FROM public.delegation_notes n
      WHERE n.id = delegation_note_recipients.note_id
        AND (
          EXISTS (
            SELECT 1
            FROM public.allocations a
            WHERE a.id = n.sender_allocation_id
              AND a.user_id = auth.uid()
          )
          OR n.sender_profile_id = auth.uid()
        )
    )
    AND (
      -- Allocation recipients: must be assigned and in the same conference
      (
        recipient_kind = 'allocation'
        AND recipient_allocation_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.allocations a2
          JOIN public.delegation_notes n2
            ON n2.id = delegation_note_recipients.note_id
          WHERE a2.id = delegation_note_recipients.recipient_allocation_id
            AND a2.conference_id = n2.conference_id
            AND a2.user_id IS NOT NULL
        )
      )
      OR
      -- Chair recipients: recipient profile must be a chair
      (
        recipient_kind = 'chair'
        AND recipient_profile_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = delegation_note_recipients.recipient_profile_id
            AND p.role IN ('chair', 'admin')
        )
      )
      OR
      -- Any chair
      (
        recipient_kind = 'chair_all'
        AND recipient_profile_id IS NULL
        AND recipient_allocation_id IS NULL
      )
    )
  );

-- -------------------------
-- RLS: delegation_note_stars
-- -------------------------

DROP POLICY IF EXISTS delegation_note_stars_staff_select ON public.delegation_note_stars;
CREATE POLICY delegation_note_stars_staff_select
  ON public.delegation_note_stars
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'admin')
    )
    AND chair_profile_id = auth.uid()
  );

DROP POLICY IF EXISTS delegation_note_stars_chair_insert ON public.delegation_note_stars;
CREATE POLICY delegation_note_stars_chair_insert
  ON public.delegation_note_stars
  FOR INSERT
  WITH CHECK (
    chair_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'admin')
    )
  );

DROP POLICY IF EXISTS delegation_note_stars_chair_delete ON public.delegation_note_stars;
CREATE POLICY delegation_note_stars_chair_delete
  ON public.delegation_note_stars
  FOR DELETE
  USING (
    chair_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'admin')
    )
  );

-- -------------------------
-- RLS: delegation_note_reports
-- -------------------------

DROP POLICY IF EXISTS delegation_note_reports_staff_insert ON public.delegation_note_reports;
CREATE POLICY delegation_note_reports_staff_insert
  ON public.delegation_note_reports
  FOR INSERT
  WITH CHECK (
    chair_profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('chair', 'admin')
    )
  );

-- No select policies needed for now (UI can be added later).

COMMIT;

