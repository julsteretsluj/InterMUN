BEGIN;

-- Ensure designated SMT officers have `profiles.role = 'smt'`.
-- We store their display names in `profiles.name` as "Title - Name" because the
-- current schema has no dedicated SMT officer title columns.

INSERT INTO public.profiles (id, role, name)
SELECT
  u.id,
  'smt'::public.user_role,
  staff.display_name
FROM auth.users u
JOIN (
  VALUES
    ('smt-migration-placeholder-sg@invalid.example', 'Secretary General'),
    ('smt-migration-placeholder-01@invalid.example', 'Deputy Secretary General'),
    ('smt-migration-placeholder-03@invalid.example', 'Parliamentarian A'),
    ('smt-migration-placeholder-02@invalid.example', 'Parliamentarian B'),
    ('smt-migration-placeholder-04@invalid.example', 'Parliamentarian C'),
    ('smt-migration-placeholder-05@invalid.example', 'Head of Logistics'),
    ('smt-migration-placeholder-06@invalid.example', 'Head of Delegate Affairs'),
    ('smt-migration-placeholder-07@invalid.example', 'Head of Finance'),
    ('smt-migration-placeholder-08@invalid.example', 'Head of Public Relations & Advertising'),
    ('smt-migration-placeholder-09@invalid.example', 'Head of Media')
) AS staff(email, display_name)
  ON lower(trim(u.email)) = lower(trim(staff.email))
ON CONFLICT (id) DO UPDATE
SET
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  updated_at = NOW();

COMMIT;

