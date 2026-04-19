-- SMT records per-criterion 1–8 scores for overall + collective chair awards (not committee-scoped rows).
ALTER TABLE award_assignments
  ADD COLUMN IF NOT EXISTS rubric_scores JSONB;

COMMENT ON COLUMN award_assignments.rubric_scores IS '1–8 scores keyed by rubric criterion (SEAMUN bands); null for committee-scoped assignments.';
