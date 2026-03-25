-- Per-allocation codes (placard / materials passwords). Chairs/SMT manage; delegates may read only their own row.
CREATE TABLE allocation_gate_codes (
  allocation_id UUID PRIMARY KEY REFERENCES allocations(id) ON DELETE CASCADE,
  code TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_allocation_gate_codes_allocation ON allocation_gate_codes(allocation_id);

ALTER TABLE allocation_gate_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chairs SMT manage allocation gate codes" ON allocation_gate_codes
FOR ALL TO authenticated
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

CREATE POLICY "Delegates read own allocation gate code" ON allocation_gate_codes
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM allocations a
    WHERE a.id = allocation_gate_codes.allocation_id
      AND a.user_id = auth.uid()
  )
);
