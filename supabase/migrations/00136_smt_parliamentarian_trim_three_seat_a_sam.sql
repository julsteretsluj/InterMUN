-- Remove extra "Parliamentarian" allocation rows (manual duplicates beyond the matrix).
-- Keep the three lowest-allocation-id rows per secretariat conference; move linked users
-- into free slots among those three; assign Sam (samridh061009@gmail.com) to seat A (rn 1);
-- delete surplus rows. Then re-apply Sparkle/Venice links by roster order.

BEGIN;

DO $$
DECLARE
  v_conf RECORD;
  v_sam uuid;
  v_extra_id uuid;
  v_extra_uid uuid;
  v_slot_id uuid;
  v_iter int := 0;
BEGIN
  SELECT id INTO v_sam
  FROM auth.users
  WHERE lower(btrim(email)) = lower(btrim('samridh061009@gmail.com'))
  LIMIT 1;

  FOR v_conf IN
    SELECT c.id AS cid
    FROM public.conferences c
    WHERE lower(btrim(c.committee)) = 'smt'
      OR upper(btrim(c.committee_code)) IN ('SMT227', 'SECRETARIAT2027')
  LOOP
    v_iter := 0;
    -- Move users from rows beyond the first 3 (by id) into empty slots among the first 3.
    LOOP
      v_extra_id := NULL;
      v_extra_uid := NULL;
      v_slot_id := NULL;

      SELECT a.id, a.user_id INTO v_extra_id, v_extra_uid
      FROM public.allocations a
      INNER JOIN (
        SELECT
          id,
          row_number() OVER (ORDER BY id) AS rn
        FROM public.allocations
        WHERE conference_id = v_conf.cid
          AND lower(btrim(country)) = 'parliamentarian'
      ) z ON z.id = a.id
      WHERE z.rn > 3
        AND a.user_id IS NOT NULL
      ORDER BY a.id
      LIMIT 1;

      EXIT WHEN v_extra_id IS NULL;

      SELECT a.id INTO v_slot_id
      FROM public.allocations a
      INNER JOIN (
        SELECT
          id,
          row_number() OVER (ORDER BY id) AS rn
        FROM public.allocations
        WHERE conference_id = v_conf.cid
          AND lower(btrim(country)) = 'parliamentarian'
      ) z ON z.id = a.id
      WHERE z.rn <= 3
        AND a.user_id IS NULL
      ORDER BY a.id
      LIMIT 1;

      IF v_slot_id IS NULL THEN
        EXIT;
      END IF;

      UPDATE public.allocations SET user_id = v_extra_uid WHERE id = v_slot_id;
      UPDATE public.allocations SET user_id = NULL WHERE id = v_extra_id;

      v_extra_id := NULL;
      v_extra_uid := NULL;
      v_slot_id := NULL;
      v_iter := v_iter + 1;
      IF v_iter > 50 THEN
        EXIT;
      END IF;
    END LOOP;

    IF v_sam IS NOT NULL THEN
      UPDATE public.allocations a
      SET user_id = NULL
      WHERE a.conference_id = v_conf.cid
        AND lower(btrim(a.country)) = 'parliamentarian'
        AND a.user_id = v_sam;

      UPDATE public.allocations a
      SET user_id = v_sam
      WHERE a.id = (
        SELECT id
        FROM public.allocations
        WHERE conference_id = v_conf.cid
          AND lower(btrim(country)) = 'parliamentarian'
        ORDER BY id
        LIMIT 1
      );
    END IF;

    DELETE FROM public.allocations a
    WHERE a.id IN (
      SELECT id
      FROM (
        SELECT
          id,
          row_number() OVER (ORDER BY id) AS rn
        FROM public.allocations
        WHERE conference_id = v_conf.cid
          AND lower(btrim(country)) = 'parliamentarian'
      ) q
      WHERE q.rn > 3
    );
  END LOOP;
END $$;

-- Re-link parliamentarians B / C (Sam is already on rn 1 above).
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
    RETURN;
  END IF;

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
END $$;

UPDATE public.profiles p
SET
  role = 'smt'::public.user_role,
  updated_at = NOW()
WHERE p.role = 'delegate'::public.user_role
  AND EXISTS (
    SELECT 1
    FROM public.allocations a
    INNER JOIN public.conferences c ON c.id = a.conference_id
    WHERE a.user_id = p.id
      AND (
        lower(btrim(c.committee)) = 'smt'
        OR upper(btrim(c.committee_code)) IN ('SMT227', 'SECRETARIAT2027')
      )
  );

COMMIT;
