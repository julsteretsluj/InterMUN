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
    ('juleskittoastrop@gmail.com', 'Secretary General - Jules K.A.'),
    ('emily.yhstudent@sisbschool.com', 'Deputy Secretary General - Emily H.'),
    ('sparshikaw05@gmail.com', 'Parliamentarian A - Sparkle'),
    ('samridh061009@gmail.com', 'Parliamentarian B - Sam'),
    ('venicekawisara25@gmail.com', 'Parliamentarian C - Venice'),
    ('reddragonetz@gmail.com', 'Head of Logistics - Moonum'),
    ('liqinglin086@gmail.com', 'Deputy Head of Logistics - Alisa'),
    ('dominicstott09@gmail.com', 'Head of Delegate Affairs - Dominic S. S.'),
    ('mannanparikh27@gmail.com', 'Head of Finance - Mannan'),
    ('sarana79262@gmail.com', 'Head of Public Relations & Advertising - Phil'),
    ('joannaherbert747@gmail.com', 'Head of Media - Joanna')
) AS staff(email, display_name)
  ON lower(trim(u.email)) = lower(trim(staff.email))
ON CONFLICT (id) DO UPDATE
SET
  role = EXCLUDED.role,
  name = EXCLUDED.name,
  updated_at = NOW();

COMMIT;

