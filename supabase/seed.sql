-- Seed default conference and guides (run after migrations)
-- created_at is old so optional seed_allocation_matrix.sql conferences stay "latest" when both run.

-- Default conference event: first gate code must be SEAMUNI2027 (matches migration 00010 / 00011).
INSERT INTO conference_events (id, name, tagline, event_code)
VALUES (
  '11111111-1111-1111-1111-111111111101',
  'SEAMUN I 2027',
  NULL,
  'SEAMUNI2027'
)
ON CONFLICT (id) DO UPDATE SET
  event_code = 'SEAMUNI2027',
  name = EXCLUDED.name;

INSERT INTO conferences (id, name, committee, created_at, event_id, committee_code, room_code) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'SEAMUN I 2027',
    'Policies with a Purpose',
    '2020-01-01T00:00:00Z',
    '11111111-1111-1111-1111-111111111101',
    'MAIN@SEED',
    'MAIN@SEED'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  committee = EXCLUDED.committee,
  event_id = EXCLUDED.event_id,
  committee_code = EXCLUDED.committee_code,
  room_code = EXCLUDED.room_code;

-- SMT second-gate committee code (after conference code SEAMUNI2027).
INSERT INTO conferences (
  id,
  event_id,
  name,
  committee,
  created_at,
  committee_code,
  room_code
)
VALUES (
  '22222222-2222-2222-2222-222222222202',
  '11111111-1111-1111-1111-111111111101',
  'Secretariat oversight',
  'SMT',
  '2027-01-02T00:00:00Z',
  'SECRETARIAT2027',
  'SECRETARIAT2027'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  committee = EXCLUDED.committee,
  event_id = EXCLUDED.event_id,
  committee_code = 'SECRETARIAT2027',
  room_code = 'SECRETARIAT2027';

INSERT INTO guides (slug, title, content) VALUES
  ('rop', 'Rules of Procedure (RoP)', E'# Rules of Procedure\n\n## Points and Motions\n- **Point of Order**: Correct procedure\n- **Point of Information**: Question to speaker\n- **Point of Personal Privilege**: Personal comfort\n- **Motion to Table**: Postpone debate\n- **Motion to Adjourn**: End session\n\n## Voting\n- Simple majority for procedural matters\n- 2/3 majority for substantive matters\n- Roll-call vote if requested'),
  ('examples', 'Examples', E'# Examples\n\n## Resolution Format\n```\nThe General Assembly,\n...\n1. Calls upon member states to...\n2. Urges the international community to...\n```\n\n## Position Paper Structure\n1. Background\n2. Country Policy\n3. Proposed Solutions'),
  ('templates', 'Templates', E'# Templates\n\n## Chair Report Template\n- Committee overview\n- Key discussion points\n- Resolutions passed\n- Recommendations'),
  ('chair-report', 'Chair Report', E'# Chair Report\n\nDocument committee proceedings and outcomes here.')
ON CONFLICT (slug) DO NOTHING;
