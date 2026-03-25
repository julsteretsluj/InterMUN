-- SEAMUN I award tracking (chairs / SMT). See handbook: conference-wide, collective, committee-level.
CREATE TABLE award_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  committee_conference_id UUID REFERENCES conferences(id) ON DELETE CASCADE,
  recipient_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recipient_committee_id UUID REFERENCES conferences(id) ON DELETE SET NULL,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_award_assignments_category ON award_assignments (category);
CREATE INDEX idx_award_assignments_committee ON award_assignments (committee_conference_id);

ALTER TABLE award_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "award_assignments_select" ON award_assignments FOR SELECT TO authenticated
  USING (
    recipient_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
  );

CREATE POLICY "award_assignments_insert" ON award_assignments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
  );

CREATE POLICY "award_assignments_update" ON award_assignments FOR UPDATE TO authenticated
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

CREATE POLICY "award_assignments_delete" ON award_assignments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role IN ('chair', 'smt')
    )
  );
