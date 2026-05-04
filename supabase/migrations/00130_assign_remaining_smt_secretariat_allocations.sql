-- Link remaining SEAMUN secretariat roster emails to SMT allocation rows (see 00086,
-- lib/seamun-i-2027-secretariat-roster.ts). Clears each user's prior secretariat seats first
-- so UNIQUE(conference_id, user_id) stays satisfied. Parliamentarian seats share the label
-- "Parliamentarian"; order follows roster top-to-bottom (Sam → Sparkle → Venice).

DO $$
DECLARE
  v_smt_ids uuid[];
BEGIN
  SELECT coalesce(array_agg(c.id ORDER BY c.created_at, c.id), '{}'::uuid[])
  INTO v_smt_ids
  FROM public.conferences c
  WHERE lower(btrim(c.committee)) = 'smt'
    OR upper(btrim(c.committee_code)) IN ('SMT227', 'SECRETARIAT2027');

  IF v_smt_ids IS NULL OR cardinality(v_smt_ids) = 0 THEN
    RAISE NOTICE '00130: no SMT/secretariat conferences found; skipping';
    RETURN;
  END IF;

  UPDATE public.allocations a
  SET user_id = NULL
  WHERE a.conference_id = ANY (v_smt_ids)
    AND a.user_id IN (
      SELECT u.id
      FROM auth.users u
      WHERE lower(btrim(u.email)) IN (
        'emily.yhstudent@sisbschool.com',
        'samridh061009@gmail.com',
        'sparshikaw05@gmail.com',
        'venicekawisara25@gmail.com',
        'reddragonetz@gmail.com',
        'dominicstott09@gmail.com',
        'mannanparikh27@gmail.com',
        'sarana79262@gmail.com',
        'joannaherbert747@gmail.com',
        'sonimyesha@gmail.com'
      )
    );

  -- Deputy Secretary General
  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'deputy secretary general'
    AND lower(btrim(u.email)) = 'emily.yhstudent@sisbschool.com';

  -- Three Parliamentarian rows: stable order by allocation id
  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u,
    LATERAL (
      SELECT z.id
      FROM (
        SELECT
          a2.id,
          row_number() OVER (
            PARTITION BY a2.conference_id
            ORDER BY a2.id
          ) AS rn
        FROM public.allocations a2
        WHERE a2.conference_id = ANY (v_smt_ids)
          AND lower(btrim(a2.country)) = 'parliamentarian'
      ) z
      WHERE z.rn = 1
    ) pick
  WHERE a.id = pick.id
    AND lower(btrim(u.email)) = 'samridh061009@gmail.com';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u,
    LATERAL (
      SELECT z.id
      FROM (
        SELECT
          a2.id,
          row_number() OVER (
            PARTITION BY a2.conference_id
            ORDER BY a2.id
          ) AS rn
        FROM public.allocations a2
        WHERE a2.conference_id = ANY (v_smt_ids)
          AND lower(btrim(a2.country)) = 'parliamentarian'
      ) z
      WHERE z.rn = 2
    ) pick
  WHERE a.id = pick.id
    AND lower(btrim(u.email)) = 'sparshikaw05@gmail.com';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u,
    LATERAL (
      SELECT z.id
      FROM (
        SELECT
          a2.id,
          row_number() OVER (
            PARTITION BY a2.conference_id
            ORDER BY a2.id
          ) AS rn
        FROM public.allocations a2
        WHERE a2.conference_id = ANY (v_smt_ids)
          AND lower(btrim(a2.country)) = 'parliamentarian'
      ) z
      WHERE z.rn = 3
    ) pick
  WHERE a.id = pick.id
    AND lower(btrim(u.email)) = 'venicekawisara25@gmail.com';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'head of logistics'
    AND lower(btrim(u.email)) = 'reddragonetz@gmail.com';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'head of finance'
    AND lower(btrim(u.email)) = 'mannanparikh27@gmail.com';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'head of community outreach'
    AND lower(btrim(u.email)) = 'sonimyesha@gmail.com';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'head of delegate affairs'
    AND lower(btrim(u.email)) = 'dominicstott09@gmail.com';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'head of media'
    AND lower(btrim(u.email)) = 'joannaherbert747@gmail.com';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'head of pr & advertising'
    AND lower(btrim(u.email)) = 'sarana79262@gmail.com';

  UPDATE public.profiles p
  SET
    role = 'smt'::public.user_role,
    allocation = v.label,
    updated_at = NOW()
  FROM (
    VALUES
      ('emily.yhstudent@sisbschool.com', 'Deputy Secretary General'),
      ('samridh061009@gmail.com', 'Parliamentarian'),
      ('sparshikaw05@gmail.com', 'Parliamentarian'),
      ('venicekawisara25@gmail.com', 'Parliamentarian'),
      ('reddragonetz@gmail.com', 'Head of Logistics'),
      ('mannanparikh27@gmail.com', 'Head of Finance'),
      ('sonimyesha@gmail.com', 'Head of Community Outreach'),
      ('dominicstott09@gmail.com', 'Head of Delegate Affairs'),
      ('joannaherbert747@gmail.com', 'Head of Media'),
      ('sarana79262@gmail.com', 'Head of PR & Advertising')
  ) AS v(email, label)
  INNER JOIN auth.users u ON lower(btrim(u.email)) = lower(btrim(v.email))
  WHERE p.id = u.id;
END $$;
