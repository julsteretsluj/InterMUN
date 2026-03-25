-- Room code (short committee code after login)
ALTER TABLE conferences
  ADD COLUMN IF NOT EXISTS room_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_conferences_room_code_unique
  ON conferences (room_code)
  WHERE room_code IS NOT NULL;

-- One timer row per conference (dedupe then enforce)
DELETE FROM timers t1
USING timers t2
WHERE t1.conference_id = t2.conference_id
  AND t1.id > t2.id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_timers_one_per_conference
  ON timers (conference_id);

CREATE POLICY "Timers insert chairs" ON timers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
  );

-- Chairs set room code (only this column; conferences otherwise not client-updatable)
CREATE OR REPLACE FUNCTION public.set_conference_room_code(
  p_conference_id uuid,
  p_room_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_norm := NULLIF(upper(trim(p_room_code)), '');

  IF v_norm IS NOT NULL AND length(v_norm) < 4 THEN
    RAISE EXCEPTION 'room code must be at least 4 characters';
  END IF;

  IF v_norm IS NOT NULL AND EXISTS (
    SELECT 1 FROM conferences c
    WHERE c.room_code = v_norm AND c.id <> p_conference_id
  ) THEN
    RAISE EXCEPTION 'room code already in use';
  END IF;

  UPDATE conferences SET room_code = v_norm WHERE id = p_conference_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_conference_room_code(uuid, text) TO authenticated;

-- Speaker queue (chair-managed; delegates read their committee)
CREATE TABLE speaker_queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  allocation_id UUID REFERENCES allocations(id) ON DELETE SET NULL,
  label TEXT,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'current', 'done')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_speaker_queue_conference_order
  ON speaker_queue_entries (conference_id, sort_order);

ALTER TABLE speaker_queue_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "speaker_queue_select" ON speaker_queue_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
    OR EXISTS (
      SELECT 1 FROM allocations a
      WHERE a.conference_id = speaker_queue_entries.conference_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "speaker_queue_chair_all" ON speaker_queue_entries FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
  );

-- Roll call
CREATE TABLE roll_call_entries (
  conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
  allocation_id UUID NOT NULL REFERENCES allocations(id) ON DELETE CASCADE,
  present BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (conference_id, allocation_id)
);

CREATE INDEX idx_roll_call_conference ON roll_call_entries (conference_id);

ALTER TABLE roll_call_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roll_call_select" ON roll_call_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
    OR EXISTS (
      SELECT 1 FROM allocations a
      WHERE a.id = roll_call_entries.allocation_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "roll_call_chair_all" ON roll_call_entries FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
  );

-- Dais announcements (chairs write; delegates in committee read)
CREATE TABLE dais_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES conferences(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dais_conference_created ON dais_announcements (conference_id, created_at DESC);

ALTER TABLE dais_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dais_select" ON dais_announcements FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
    OR EXISTS (
      SELECT 1 FROM allocations a
      WHERE a.conference_id = dais_announcements.conference_id
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "dais_insert_chairs" ON dais_announcements FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "dais_delete_chairs" ON dais_announcements FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
  );
