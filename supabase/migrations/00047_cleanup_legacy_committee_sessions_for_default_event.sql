-- Remove stale committee sessions for the default event so SMT shows only current matrix committees.
-- Keeps: latest matrix-generated conference ids and the SMT secretariat room code.

DELETE FROM public.conferences c
WHERE c.event_id = '11111111-1111-1111-1111-111111111101'
  AND COALESCE(UPPER(TRIM(c.committee_code)), '') <> 'SMT227'
  AND c.committee IS NOT NULL
  AND c.id NOT IN (
  '28dd6b38-d4a0-523b-a80c-ab10d8dfcd02',
  'f304963e-97b0-5c16-8f5d-cf7127f9ea1c',
  '0a2c8468-5781-50e6-9f5f-cd766df02b19',
  '6234a695-6c01-5c67-8c58-3d2ae943e97f',
  '8a544b29-0a9f-5162-9db9-f2eab400ea0d',
  'ac0cb54b-2fef-530c-b067-ff836a07e2e7',
  '43b6a984-c25b-50eb-9c6f-f84bf88f31f5',
  '82c8e317-7602-5cd3-9a54-cb99fd29e510',
  'ea335867-32b5-5120-9c09-4756fd9b899d',
  '1d9403b0-90ba-596d-b384-12a56904e2c7',
  'c528128f-e345-53de-87af-08b959d88aeb',
  '997909f3-6e59-5c48-9490-e2a5e698d060',
  'e69e3c59-db81-5536-8490-f7f939526461',
  '0dda7eac-a7d1-5dd0-81dc-3e3446338e1c',
  '9a0f8f27-c813-54c2-8f3f-ec970a7ae18f',
  'e2b02bf8-bd34-5fce-a231-318de3f818b2',
  'd15774ac-8751-53f3-85f8-19750979f897',
  '66798af7-78b5-5e91-8b42-2a0038ef3a2a',
  'f890e3d3-e965-57e9-a4bb-40058ee40f96',
  '51a2a065-93b3-5af9-9554-c61730727c64',
  '5ed866f9-bd94-5207-8ea1-10e0936d4595',
  '91c83106-5e5f-53cf-9356-4e9ab025306a',
  '3151a6d9-d887-5cf7-a363-b320bbc84633',
  'ce8715f3-e03b-53c5-bc87-042ee592b03e',
  'a2401203-2286-5021-bd4e-72667c1eb8d2',
  '79e87b23-e4e5-5a62-aaf8-dfd06a7805da',
  '46dbbb89-e1f7-5e30-81a9-b17dd75711f8',
  'bd186a99-d4b9-5b56-90d8-2a2c49b4674c'
  );
