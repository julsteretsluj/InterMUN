BEGIN;

-- Consolidate multiple permissive RLS policies per (table, action) into a single
-- TO authenticated policy with OR semantics (same as stacked permissive policies).
-- Also removes TO public fan-out that duplicated linter warnings across anon /
-- authenticator / dashboard_user / etc.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies

CREATE OR REPLACE FUNCTION private.rls_or_combine(exprs text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN exprs IS NULL OR cardinality(exprs) = 0 THEN NULL
    -- NULL expression in pg_policies means unrestricted (true).
    WHEN EXISTS (SELECT 1 FROM unnest(exprs) e WHERE e IS NULL) THEN 'true'
    ELSE (
      SELECT string_agg('(' || e || ')', ' OR ' ORDER BY ord)
      FROM unnest(exprs) WITH ORDINALITY AS t(e, ord)
    )
  END;
$$;

CREATE TEMP TABLE _rls_merge_pending (
  tablename text NOT NULL,
  pol_cmd text NOT NULL,
  sql text NOT NULL,
  PRIMARY KEY (tablename, pol_cmd)
);

DO $$
DECLARE
  tbl text;
  act text;
  pol record;
  contrib_count int;
  using_exprs text[];
  check_exprs text[];
  using_sql text;
  check_sql text;
  create_sql text;
  drop_names text[];
  needs_rebuild boolean;
  acts text[] := ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'];
  t record;
  i int;
BEGIN
  FOR t IN
    SELECT DISTINCT p.tablename
    FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.permissive = 'PERMISSIVE'
    ORDER BY p.tablename
  LOOP
    tbl := t.tablename;
    needs_rebuild := false;

    FOREACH act IN ARRAY acts LOOP
      SELECT count(*)::int INTO contrib_count
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = tbl
        AND p.permissive = 'PERMISSIVE'
        AND (p.cmd = act OR p.cmd = 'ALL');

      IF contrib_count > 1 THEN
        needs_rebuild := true;
        EXIT;
      END IF;
    END LOOP;

    IF NOT needs_rebuild THEN
      CONTINUE;
    END IF;

    drop_names := ARRAY[]::text[];
    FOR pol IN
      SELECT p.policyname
      FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = tbl
        AND p.permissive = 'PERMISSIVE'
    LOOP
      drop_names := array_append(drop_names, pol.policyname);
    END LOOP;

    FOREACH act IN ARRAY acts LOOP
      using_exprs := ARRAY[]::text[];
      check_exprs := ARRAY[]::text[];

      FOR pol IN
        SELECT p.policyname, p.cmd, p.qual, p.with_check
        FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename = tbl
          AND p.permissive = 'PERMISSIVE'
          AND (p.cmd = act OR p.cmd = 'ALL')
        ORDER BY p.policyname
      LOOP
        IF act IN ('SELECT', 'UPDATE', 'DELETE') THEN
          using_exprs := array_append(using_exprs, pol.qual);
        END IF;

        IF act IN ('INSERT', 'UPDATE') THEN
          IF pol.with_check IS NOT NULL THEN
            check_exprs := array_append(check_exprs, pol.with_check);
          ELSIF pol.qual IS NOT NULL THEN
            -- FOR ALL / UPDATE often omit WITH CHECK; USING applies to both.
            check_exprs := array_append(check_exprs, pol.qual);
          ELSE
            check_exprs := array_append(check_exprs, NULL);
          END IF;
        END IF;
      END LOOP;

      IF act = 'SELECT' AND cardinality(using_exprs) = 0 THEN
        CONTINUE;
      END IF;
      IF act = 'INSERT' AND cardinality(check_exprs) = 0 THEN
        CONTINUE;
      END IF;
      IF act = 'DELETE' AND cardinality(using_exprs) = 0 THEN
        CONTINUE;
      END IF;
      IF act = 'UPDATE'
         AND cardinality(using_exprs) = 0
         AND cardinality(check_exprs) = 0 THEN
        CONTINUE;
      END IF;

      using_sql := private.rls_or_combine(using_exprs);
      check_sql := private.rls_or_combine(check_exprs);

      create_sql := format(
        'CREATE POLICY %I ON public.%I AS PERMISSIVE FOR %s TO authenticated',
        tbl || '_' || lower(act) || '_merged',
        tbl,
        act
      );

      IF act IN ('SELECT', 'DELETE') THEN
        create_sql := create_sql || ' USING (' || coalesce(using_sql, 'true') || ')';
      ELSIF act = 'INSERT' THEN
        create_sql := create_sql || ' WITH CHECK (' || coalesce(check_sql, 'true') || ')';
      ELSE
        create_sql := create_sql
          || ' USING (' || coalesce(using_sql, 'true') || ')'
          || ' WITH CHECK (' || coalesce(check_sql, coalesce(using_sql, 'true')) || ')';
      END IF;

      INSERT INTO _rls_merge_pending(tablename, pol_cmd, sql)
      VALUES (tbl, act, create_sql)
      ON CONFLICT (tablename, pol_cmd) DO UPDATE SET sql = EXCLUDED.sql;
    END LOOP;

    IF drop_names IS NOT NULL THEN
      FOR i IN 1 .. cardinality(drop_names) LOOP
        EXECUTE format(
          'DROP POLICY IF EXISTS %I ON public.%I',
          drop_names[i],
          tbl
        );
      END LOOP;
    END IF;

    FOR pol IN
      SELECT p.sql
      FROM _rls_merge_pending p
      WHERE p.tablename = tbl
      ORDER BY p.pol_cmd
    LOOP
      EXECUTE pol.sql;
    END LOOP;

    DELETE FROM _rls_merge_pending WHERE tablename = tbl;
  END LOOP;
END
$$;

DROP TABLE IF EXISTS _rls_merge_pending;
DROP FUNCTION private.rls_or_combine(text[]);

COMMIT;
