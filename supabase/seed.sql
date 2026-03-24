-- Seed default conference and guides (run after migrations)
INSERT INTO conferences (id, name, committee) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Default Conference', 'General Assembly')
ON CONFLICT (id) DO NOTHING;

INSERT INTO guides (slug, title, content) VALUES
  ('rop', 'Rules of Procedure (RoP)', E'# Rules of Procedure\n\n## Points and Motions\n- **Point of Order**: Correct procedure\n- **Point of Information**: Question to speaker\n- **Point of Personal Privilege**: Personal comfort\n- **Motion to Table**: Postpone debate\n- **Motion to Adjourn**: End session\n\n## Voting\n- Simple majority for procedural matters\n- 2/3 majority for substantive matters\n- Roll-call vote if requested'),
  ('examples', 'Examples', E'# Examples\n\n## Resolution Format\n```\nThe General Assembly,\n...\n1. Calls upon member states to...\n2. Urges the international community to...\n```\n\n## Position Paper Structure\n1. Background\n2. Country Policy\n3. Proposed Solutions'),
  ('templates', 'Templates', E'# Templates\n\n## Chair Report Template\n- Committee overview\n- Key discussion points\n- Resolutions passed\n- Recommendations'),
  ('chair-report', 'Chair Report', E'# Chair Report\n\nDocument committee proceedings and outcomes here.')
ON CONFLICT (slug) DO NOTHING;
