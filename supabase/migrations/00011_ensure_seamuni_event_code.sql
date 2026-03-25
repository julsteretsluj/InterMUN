-- Canonical first-gate code for the default SEAMUN event (id fixed in 00010).
UPDATE conference_events
SET event_code = 'SEAMUNI2027'
WHERE id = '11111111-1111-1111-1111-111111111101';

INSERT INTO conference_events (id, name, tagline, event_code)
SELECT
  '11111111-1111-1111-1111-111111111101',
  'SEAMUN I 2027',
  NULL,
  'SEAMUNI2027'
WHERE NOT EXISTS (
  SELECT 1 FROM conference_events WHERE id = '11111111-1111-1111-1111-111111111101'
);
