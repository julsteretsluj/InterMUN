-- Ensure at least one conference exists so the app (room gate, SMT fallback) can load.
INSERT INTO conferences (id, name, committee, created_at)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'SEAMUN I 2027',
  'Policies with a Purpose',
  '2020-01-01T00:00:00Z'::timestamptz
WHERE NOT EXISTS (SELECT 1 FROM conferences LIMIT 1);
