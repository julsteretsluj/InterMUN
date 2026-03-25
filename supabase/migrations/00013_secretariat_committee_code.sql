-- SMT / secretariat committee (second gate). Code: SECRETARIAT2027 — same conference event as SEAMUNI2027.
-- created_at late so SMT "implicit latest" and ordering by created_at prefer this row when appropriate.

INSERT INTO conferences (
  id,
  event_id,
  name,
  committee,
  committee_code,
  room_code,
  created_at
)
VALUES (
  '22222222-2222-2222-2222-222222222202',
  '11111111-1111-1111-1111-111111111101',
  'Secretariat oversight',
  'SMT',
  'SECRETARIAT2027',
  'SECRETARIAT2027',
  '2027-01-02T00:00:00Z'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  event_id = EXCLUDED.event_id,
  name = EXCLUDED.name,
  committee = EXCLUDED.committee,
  committee_code = 'SECRETARIAT2027',
  room_code = 'SECRETARIAT2027';

INSERT INTO timers (conference_id)
SELECT '22222222-2222-2222-2222-222222222202'
WHERE EXISTS (SELECT 1 FROM conferences WHERE id = '22222222-2222-2222-2222-222222222202')
  AND NOT EXISTS (
    SELECT 1 FROM timers WHERE conference_id = '22222222-2222-2222-2222-222222222202'
  );
