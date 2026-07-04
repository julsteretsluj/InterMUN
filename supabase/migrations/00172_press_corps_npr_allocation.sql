BEGIN;

-- SEAMUN I 2027 Allocation Matrix (6): Press Corps gained NPR (PRE-005) and shifted
-- PRE-006..PRE-016 placards. Stable allocation UUIDs follow gate codes (uuid5).

UPDATE public.allocations SET country = 'NPR' WHERE id = '447786d7-9847-52e3-8bdb-de89c104a8a0';
UPDATE public.allocations SET country = 'Reuters' WHERE id = '5d6bb885-8eff-565d-81bf-4c8a7f85deb9';
UPDATE public.allocations SET country = 'Russia Today' WHERE id = 'd0837958-0844-55b1-b996-02c2f95e4612';
UPDATE public.allocations SET country = 'The Associated Press (AP)' WHERE id = '9f15f0e6-df2f-52f3-9d56-34f2b39368f0';
UPDATE public.allocations SET country = 'The Guardian' WHERE id = '36a6c619-c80e-5026-bcc7-a0fa5cd711c0';
UPDATE public.allocations SET country = 'The Lancet' WHERE id = 'fe9a14a1-1b7d-5c55-bc10-a4c765fdd5c5';
UPDATE public.allocations SET country = 'The New York Times' WHERE id = 'c4f64242-b7b5-5f97-8e31-bf829e982130';
UPDATE public.allocations SET country = 'The Onion' WHERE id = '6f2e9588-0ead-57bd-bb51-1ea612bf4d14';
UPDATE public.allocations SET country = 'The Straits Times' WHERE id = 'de3734a6-2641-5ac6-912c-3c380a90c3d0';
UPDATE public.allocations SET country = 'Wall Street Journal' WHERE id = 'c544fe9b-4edd-5ff5-9a82-db99ef17ba94';
UPDATE public.allocations SET country = 'Wikileak' WHERE id = 'bc914649-a27b-5018-baad-69189751b536';

INSERT INTO public.allocations (id, conference_id, user_id, country)
VALUES (
  '6c7c9b33-9446-53b9-98f5-d125182e203d',
  '8a544b29-0a9f-5162-9db9-f2eab400ea0d',
  NULL,
  'Xinhua News Agency'
)
ON CONFLICT (id) DO UPDATE SET country = EXCLUDED.country;

INSERT INTO public.allocation_gate_codes (allocation_id, code, updated_at)
VALUES ('6c7c9b33-9446-53b9-98f5-d125182e203d', 'PRE-016', NOW())
ON CONFLICT (allocation_id) DO UPDATE SET code = EXCLUDED.code, updated_at = EXCLUDED.updated_at;

COMMIT;
