BEGIN;

-- Wrap auth.*() / current_setting() in RLS policies with (select ...) so Postgres
-- evaluates them once per query (initPlan) instead of once per row.
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Note: multiple_permissive_policies warnings are separate — merging those changes
-- authorization shape and is intentionally out of scope for this migration.

CREATE OR REPLACE FUNCTION private.wrap_rls_initplan_calls(expr text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  out text := expr;
BEGIN
  IF out IS NULL OR btrim(out) = '' THEN
    RETURN out;
  END IF;

  -- Protect already-wrapped calls so we do not double-wrap.
  out := replace(out, '(select auth.uid())', '<<<AUTH_UID>>>');
  out := replace(out, '(SELECT auth.uid())', '<<<AUTH_UID>>>');
  out := replace(out, '(select auth.role())', '<<<AUTH_ROLE>>>');
  out := replace(out, '(SELECT auth.role())', '<<<AUTH_ROLE>>>');
  out := replace(out, '(select auth.jwt())', '<<<AUTH_JWT>>>');
  out := replace(out, '(SELECT auth.jwt())', '<<<AUTH_JWT>>>');
  out := replace(out, '(select auth.email())', '<<<AUTH_EMAIL>>>');
  out := replace(out, '(SELECT auth.email())', '<<<AUTH_EMAIL>>>');

  out := regexp_replace(out, 'auth\.uid\s*\(\s*\)', '(select auth.uid())', 'gi');
  out := regexp_replace(out, 'auth\.role\s*\(\s*\)', '(select auth.role())', 'gi');
  out := regexp_replace(out, 'auth\.jwt\s*\(\s*\)', '(select auth.jwt())', 'gi');
  out := regexp_replace(out, 'auth\.email\s*\(\s*\)', '(select auth.email())', 'gi');

  out := regexp_replace(
    out,
    '\(select\s+current_setting\s*\(([^()]*)\)\s*\)',
    '<<<CURSET:\1>>>',
    'gi'
  );
  out := regexp_replace(
    out,
    'current_setting\s*\(([^()]*)\)',
    '(select current_setting(\1))',
    'gi'
  );
  out := regexp_replace(out, '<<<CURSET:([^>]+)>>>', '(select current_setting(\1))', 'g');

  out := replace(out, '<<<AUTH_UID>>>', '(select auth.uid())');
  out := replace(out, '<<<AUTH_ROLE>>>', '(select auth.role())');
  out := replace(out, '<<<AUTH_JWT>>>', '(select auth.jwt())');
  out := replace(out, '<<<AUTH_EMAIL>>>', '(select auth.email())');

  RETURN out;
END;
$$;

DO $$
DECLARE
  pol record;
  new_qual text;
  new_check text;
  role_list text;
  create_sql text;
  changed boolean;
BEGIN
  FOR pol IN
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  LOOP
    new_qual := private.wrap_rls_initplan_calls(pol.qual);
    new_check := private.wrap_rls_initplan_calls(pol.with_check);
    changed := (new_qual IS DISTINCT FROM pol.qual)
            OR (new_check IS DISTINCT FROM pol.with_check);
    IF NOT changed THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );

    IF pol.roles IS NULL OR cardinality(pol.roles) = 0 OR pol.roles = ARRAY['public']::name[] THEN
      role_list := 'public';
    ELSE
      SELECT string_agg(quote_ident(r), ', ' ORDER BY r)
      INTO role_list
      FROM unnest(pol.roles) AS r;
    END IF;

    create_sql := format(
      'CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
      pol.policyname,
      pol.schemaname,
      pol.tablename,
      CASE WHEN upper(pol.permissive) = 'RESTRICTIVE' THEN 'RESTRICTIVE' ELSE 'PERMISSIVE' END,
      pol.cmd,
      role_list
    );

    IF new_qual IS NOT NULL THEN
      create_sql := create_sql || ' USING (' || new_qual || ')';
    END IF;
    IF new_check IS NOT NULL THEN
      create_sql := create_sql || ' WITH CHECK (' || new_check || ')';
    END IF;

    EXECUTE create_sql;
  END LOOP;
END
$$;

DROP FUNCTION private.wrap_rls_initplan_calls(text);

COMMIT;
