-- SEAMUN I · 23–24 January 2027 (see conference handbook)
UPDATE conferences
SET
  name = 'SEAMUN I 2027',
  committee = NULL
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE conferences
SET
  name = 'SEAMUN I 2027',
  committee = NULLIF(committee, '')
WHERE name = 'Default Conference';
