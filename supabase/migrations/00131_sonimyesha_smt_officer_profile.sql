-- Head of Community Outreach was listed on the secretariat roster but omitted from 00086.
-- Align role + display name when the auth user exists (allocation linked in 00130).

UPDATE public.profiles p
SET
  role = 'smt'::public.user_role,
  name = 'Head of Community Outreach - Myesha S.',
  updated_at = NOW()
FROM auth.users u
WHERE p.id = u.id
  AND lower(btrim(u.email)) = lower(trim('sonimyesha@gmail.com'));
