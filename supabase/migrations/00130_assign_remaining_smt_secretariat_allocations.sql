-- Link remaining SEAMUN secretariat roster emails to SMT allocation rows (see 00086,
-- lib/seamun-i-2027-secretariat-roster.ts). Clears each user's prior secretariat seats first
-- so UNIQUE(conference_id, user_id) stays satisfied. Parliamentarian seats share the label
-- "Parliamentarian"; order follows roster top-to-bottom (slots 1–3).

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
        'smt-migration-placeholder-01@invalid.example',
        'smt-migration-placeholder-02@invalid.example',
        'smt-migration-placeholder-03@invalid.example',
        'smt-migration-placeholder-04@invalid.example',
        'smt-migration-placeholder-05@invalid.example',
        'smt-migration-placeholder-06@invalid.example',
        'smt-migration-placeholder-07@invalid.example',
        'smt-migration-placeholder-08@invalid.example',
        'smt-migration-placeholder-09@invalid.example',
        'smt-migration-placeholder-10@invalid.example'
      )
    );

  -- Deputy Secretary General
  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'deputy secretary general'
    AND lower(btrim(u.email)) = 'smt-migration-placeholder-01@invalid.example';

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
    AND lower(btrim(u.email)) = 'smt-migration-placeholder-02@invalid.example';

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
    AND lower(btrim(u.email)) = 'smt-migration-placeholder-03@invalid.example';

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
    AND lower(btrim(u.email)) = 'smt-migration-placeholder-04@invalid.example';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'head of logistics'
    AND lower(btrim(u.email)) = 'smt-migration-placeholder-05@invalid.example';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'head of finance'
    AND lower(btrim(u.email)) = 'smt-migration-placeholder-07@invalid.example';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'head of community outreach'
    AND lower(btrim(u.email)) = 'smt-migration-placeholder-10@invalid.example';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'head of delegate affairs'
    AND lower(btrim(u.email)) = 'smt-migration-placeholder-06@invalid.example';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'head of media'
    AND lower(btrim(u.email)) = 'smt-migration-placeholder-09@invalid.example';

  UPDATE public.allocations a
  SET user_id = u.id
  FROM auth.users u
  WHERE a.conference_id = ANY (v_smt_ids)
    AND lower(btrim(a.country)) = 'head of pr & advertising'
    AND lower(btrim(u.email)) = 'smt-migration-placeholder-08@invalid.example';

  UPDATE public.profiles p
  SET
    role = 'smt'::public.user_role,
    allocation = v.label,
    updated_at = NOW()
  FROM (
    VALUES
      ('smt-migration-placeholder-01@invalid.example', 'Deputy Secretary General'),
      ('smt-migration-placeholder-02@invalid.example', 'Parliamentarian'),
      ('smt-migration-placeholder-03@invalid.example', 'Parliamentarian'),
      ('smt-migration-placeholder-04@invalid.example', 'Parliamentarian'),
      ('smt-migration-placeholder-05@invalid.example', 'Head of Logistics'),
      ('smt-migration-placeholder-07@invalid.example', 'Head of Finance'),
      ('smt-migration-placeholder-10@invalid.example', 'Head of Community Outreach'),
      ('smt-migration-placeholder-06@invalid.example', 'Head of Delegate Affairs'),
      ('smt-migration-placeholder-09@invalid.example', 'Head of Media'),
      ('smt-migration-placeholder-08@invalid.example', 'Head of PR & Advertising')
  ) AS v(email, label)
  INNER JOIN auth.users u ON lower(btrim(u.email)) = lower(btrim(v.email))
  WHERE p.id = u.id;
END $$;
