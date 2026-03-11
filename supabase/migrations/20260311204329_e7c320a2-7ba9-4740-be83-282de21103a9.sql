
CREATE OR REPLACE FUNCTION public.generate_schema_ddl()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result text := '';
  rec RECORD;
  col_rec RECORD;
  enum_rec RECORD;
  idx_rec RECORD;
  pol_rec RECORD;
  trig_rec RECORD;
  func_rec RECORD;
  view_rec RECORD;
  fk_rec RECORD;
  uq_rec RECORD;
  first_val boolean;
  col_list text;
BEGIN
  -- ═══════════════════════════════════════════════════════════════
  -- ENUMS
  -- ═══════════════════════════════════════════════════════════════
  result := result || E'\n-- ═══════════════════════════════════════════════════════════════\n';
  result := result || E'-- ENUMS\n';
  result := result || E'-- ═══════════════════════════════════════════════════════════════\n\n';

  FOR rec IN
    SELECT t.typname AS enum_name,
           array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname
  LOOP
    result := result || 'CREATE TYPE public.' || rec.enum_name || ' AS ENUM (';
    first_val := true;
    FOR i IN 1..array_length(rec.enum_values, 1) LOOP
      IF NOT first_val THEN
        result := result || ', ';
      END IF;
      result := result || '''' || rec.enum_values[i] || '''';
      first_val := false;
    END LOOP;
    result := result || E');\n\n';
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════
  -- TABLES
  -- ═══════════════════════════════════════════════════════════════
  result := result || E'\n-- ═══════════════════════════════════════════════════════════════\n';
  result := result || E'-- TABLES\n';
  result := result || E'-- ═══════════════════════════════════════════════════════════════\n\n';

  FOR rec IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    result := result || 'CREATE TABLE public.' || rec.table_name || E' (\n';

    -- Columns
    FOR col_rec IN
      SELECT c.column_name, c.data_type, c.udt_name, c.column_default,
             c.is_nullable, c.character_maximum_length,
             c.numeric_precision, c.numeric_scale
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = rec.table_name
      ORDER BY c.ordinal_position
    LOOP
      result := result || '  ' || col_rec.column_name || ' ';

      -- Type mapping
      IF col_rec.data_type = 'USER-DEFINED' THEN
        result := result || 'public.' || col_rec.udt_name;
      ELSIF col_rec.data_type = 'ARRAY' THEN
        result := result || col_rec.udt_name;
      ELSIF col_rec.data_type = 'character varying' AND col_rec.character_maximum_length IS NOT NULL THEN
        result := result || 'varchar(' || col_rec.character_maximum_length || ')';
      ELSE
        result := result || col_rec.data_type;
      END IF;

      IF col_rec.column_default IS NOT NULL THEN
        result := result || ' DEFAULT ' || col_rec.column_default;
      END IF;

      IF col_rec.is_nullable = 'NO' THEN
        result := result || ' NOT NULL';
      END IF;

      result := result || E',\n';
    END LOOP;

    -- Primary key
    FOR uq_rec IN
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = rec.table_name
        AND tc.constraint_type = 'PRIMARY KEY'
      ORDER BY kcu.ordinal_position
    LOOP
      result := result || '  PRIMARY KEY (' || uq_rec.column_name || E'),\n';
    END LOOP;

    -- Unique constraints
    FOR uq_rec IN
      SELECT tc.constraint_name,
             string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS cols
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = rec.table_name
        AND tc.constraint_type = 'UNIQUE'
      GROUP BY tc.constraint_name
    LOOP
      result := result || '  UNIQUE (' || uq_rec.cols || E'),\n';
    END LOOP;

    -- Foreign keys
    FOR fk_rec IN
      SELECT kcu.column_name,
             ccu.table_schema AS ref_schema,
             ccu.table_name AS ref_table,
             ccu.column_name AS ref_column,
             rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = rec.table_name
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
      result := result || '  FOREIGN KEY (' || fk_rec.column_name || ') REFERENCES '
        || fk_rec.ref_schema || '.' || fk_rec.ref_table || '(' || fk_rec.ref_column || ')';
      IF fk_rec.delete_rule = 'CASCADE' THEN
        result := result || ' ON DELETE CASCADE';
      ELSIF fk_rec.delete_rule = 'SET NULL' THEN
        result := result || ' ON DELETE SET NULL';
      END IF;
      result := result || E',\n';
    END LOOP;

    -- Remove trailing comma
    result := rtrim(result, E',\n') || E'\n';
    result := result || E');\n\n';
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════
  -- INDEXES
  -- ═══════════════════════════════════════════════════════════════
  result := result || E'\n-- ═══════════════════════════════════════════════════════════════\n';
  result := result || E'-- INDEXES\n';
  result := result || E'-- ═══════════════════════════════════════════════════════════════\n\n';

  FOR idx_rec IN
    SELECT indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
      AND indexname NOT LIKE 'pg_%'
    ORDER BY tablename, indexname
  LOOP
    result := result || idx_rec.indexdef || E';\n';
  END LOOP;
  result := result || E'\n';

  -- ═══════════════════════════════════════════════════════════════
  -- ROW LEVEL SECURITY
  -- ═══════════════════════════════════════════════════════════════
  result := result || E'\n-- ═══════════════════════════════════════════════════════════════\n';
  result := result || E'-- ROW LEVEL SECURITY\n';
  result := result || E'-- ═══════════════════════════════════════════════════════════════\n\n';

  -- RLS enabled tables
  FOR rec IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true
    ORDER BY c.relname
  LOOP
    result := result || 'ALTER TABLE public.' || rec.table_name || E' ENABLE ROW LEVEL SECURITY;\n';
  END LOOP;
  result := result || E'\n';

  -- Policies
  FOR pol_rec IN
    SELECT p.polname AS policy_name,
           c.relname AS table_name,
           CASE p.polcmd
             WHEN 'r' THEN 'SELECT'
             WHEN 'a' THEN 'INSERT'
             WHEN 'w' THEN 'UPDATE'
             WHEN 'd' THEN 'DELETE'
             WHEN '*' THEN 'ALL'
           END AS command,
           CASE p.polpermissive WHEN true THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END AS permissive,
           pg_get_expr(p.polqual, p.polrelid, true) AS using_expr,
           pg_get_expr(p.polwithcheck, p.polrelid, true) AS with_check_expr,
           ARRAY(SELECT rolname FROM pg_roles WHERE oid = ANY(p.polroles)) AS roles
    FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
    ORDER BY c.relname, p.polname
  LOOP
    result := result || 'CREATE POLICY "' || pol_rec.policy_name || E'"\n';
    result := result || '  ON public.' || pol_rec.table_name || E'\n';
    result := result || '  AS ' || pol_rec.permissive || E'\n';
    result := result || '  FOR ' || pol_rec.command || E'\n';

    IF array_length(pol_rec.roles, 1) > 0 AND pol_rec.roles[1] != 'public' THEN
      result := result || '  TO ' || array_to_string(pol_rec.roles, ', ') || E'\n';
    END IF;

    IF pol_rec.using_expr IS NOT NULL THEN
      result := result || '  USING (' || pol_rec.using_expr || E')\n';
    END IF;

    IF pol_rec.with_check_expr IS NOT NULL THEN
      result := result || '  WITH CHECK (' || pol_rec.with_check_expr || E')\n';
    END IF;

    result := result || E';\n\n';
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════
  -- FUNCTIONS
  -- ═══════════════════════════════════════════════════════════════
  result := result || E'\n-- ═══════════════════════════════════════════════════════════════\n';
  result := result || E'-- FUNCTIONS\n';
  result := result || E'-- ═══════════════════════════════════════════════════════════════\n\n';

  FOR func_rec IN
    SELECT pg_get_functiondef(p.oid) AS func_def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND p.proname != 'generate_schema_ddl'
    ORDER BY p.proname
  LOOP
    result := result || func_rec.func_def || E';\n\n';
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════
  -- TRIGGERS
  -- ═══════════════════════════════════════════════════════════════
  result := result || E'\n-- ═══════════════════════════════════════════════════════════════\n';
  result := result || E'-- TRIGGERS\n';
  result := result || E'-- ═══════════════════════════════════════════════════════════════\n\n';

  FOR trig_rec IN
    SELECT pg_get_triggerdef(t.oid, true) AS trig_def
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND NOT t.tgisinternal
    ORDER BY c.relname, t.tgname
  LOOP
    result := result || trig_rec.trig_def || E';\n';
  END LOOP;
  result := result || E'\n';

  -- ═══════════════════════════════════════════════════════════════
  -- VIEWS
  -- ═══════════════════════════════════════════════════════════════
  result := result || E'\n-- ═══════════════════════════════════════════════════════════════\n';
  result := result || E'-- VIEWS\n';
  result := result || E'-- ═══════════════════════════════════════════════════════════════\n\n';

  FOR view_rec IN
    SELECT table_name, view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name
  LOOP
    result := result || 'CREATE OR REPLACE VIEW public.' || view_rec.table_name || ' AS' || E'\n';
    result := result || view_rec.view_definition || E'\n\n';
  END LOOP;

  -- ═══════════════════════════════════════════════════════════════
  -- REALTIME PUBLICATION
  -- ═══════════════════════════════════════════════════════════════
  result := result || E'\n-- ═══════════════════════════════════════════════════════════════\n';
  result := result || E'-- REALTIME PUBLICATION\n';
  result := result || E'-- ═══════════════════════════════════════════════════════════════\n\n';

  FOR rec IN
    SELECT pt.schemaname, pt.tablename
    FROM pg_publication_tables pt
    WHERE pt.pubname = 'supabase_realtime' AND pt.schemaname = 'public'
    ORDER BY pt.tablename
  LOOP
    result := result || 'ALTER PUBLICATION supabase_realtime ADD TABLE public.' || rec.tablename || E';\n';
  END LOOP;

  RETURN result;
END;
$function$;
