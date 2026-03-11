
CREATE OR REPLACE FUNCTION public.generate_schema_ddl()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result text := '';
  rec RECORD;
  col_rec RECORD;
  pk_cols text;
  uq_cols text;
  fk_section text := '';
  enum_names text[] := '{}';
  is_first boolean;
BEGIN
  result := '-- ═══════════════════════════════════════════════════════════════' || E'\n';
  result := result || '-- SCHEMA DDL COMPLETO — public' || E'\n';
  result := result || '-- Gerado em: ' || now()::text || E'\n';
  result := result || '-- ═══════════════════════════════════════════════════════════════' || E'\n\n';

  -- ═══ ENUMS ═══
  result := result || '-- ═══ ENUMS ═══' || E'\n\n';
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
    enum_names := array_append(enum_names, rec.enum_name);
    result := result || 'CREATE TYPE public.' || rec.enum_name || ' AS ENUM (';
    is_first := true;
    FOR i IN 1..array_length(rec.enum_values, 1) LOOP
      IF NOT is_first THEN result := result || ', '; END IF;
      result := result || '''' || rec.enum_values[i] || '''';
      is_first := false;
    END LOOP;
    result := result || ');' || E'\n';
  END LOOP;
  result := result || E'\n';

  -- ═══ TABLES (sem FKs inline) ═══
  result := result || '-- ═══ TABLES ═══' || E'\n\n';
  FOR rec IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    result := result || 'CREATE TABLE public.' || rec.table_name || ' (' || E'\n';
    is_first := true;
    FOR col_rec IN
      SELECT column_name, data_type, udt_name, is_nullable,
             column_default, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = rec.table_name
      ORDER BY ordinal_position
    LOOP
      IF NOT is_first THEN result := result || ',' || E'\n'; END IF;
      result := result || '  ' || col_rec.column_name || ' ';

      -- Type mapping
      IF col_rec.data_type = 'ARRAY' THEN
        DECLARE
          base_name text;
        BEGIN
          IF left(col_rec.udt_name, 1) = '_' THEN
            base_name := substring(col_rec.udt_name from 2);
          ELSE
            base_name := col_rec.udt_name;
          END IF;
          -- Check if it's a custom enum
          IF base_name = ANY(enum_names) THEN
            result := result || 'public.' || base_name || '[]';
          ELSE
            result := result || base_name || '[]';
          END IF;
        END;
      ELSIF col_rec.data_type = 'USER-DEFINED' THEN
        IF col_rec.udt_name = ANY(enum_names) THEN
          result := result || 'public.' || col_rec.udt_name;
        ELSE
          result := result || col_rec.udt_name;
        END IF;
      ELSIF col_rec.data_type = 'character varying' THEN
        IF col_rec.character_maximum_length IS NOT NULL THEN
          result := result || 'varchar(' || col_rec.character_maximum_length || ')';
        ELSE
          result := result || 'varchar';
        END IF;
      ELSIF col_rec.data_type = 'timestamp with time zone' THEN
        result := result || 'timestamptz';
      ELSIF col_rec.data_type = 'timestamp without time zone' THEN
        result := result || 'timestamp';
      ELSIF col_rec.data_type = 'boolean' THEN
        result := result || 'boolean';
      ELSIF col_rec.data_type = 'integer' THEN
        result := result || 'integer';
      ELSIF col_rec.data_type = 'bigint' THEN
        result := result || 'bigint';
      ELSIF col_rec.data_type = 'smallint' THEN
        result := result || 'smallint';
      ELSIF col_rec.data_type = 'numeric' THEN
        result := result || 'numeric';
      ELSIF col_rec.data_type = 'double precision' THEN
        result := result || 'double precision';
      ELSIF col_rec.data_type = 'real' THEN
        result := result || 'real';
      ELSIF col_rec.data_type = 'text' THEN
        result := result || 'text';
      ELSIF col_rec.data_type = 'uuid' THEN
        result := result || 'uuid';
      ELSIF col_rec.data_type = 'jsonb' THEN
        result := result || 'jsonb';
      ELSIF col_rec.data_type = 'json' THEN
        result := result || 'json';
      ELSIF col_rec.data_type = 'date' THEN
        result := result || 'date';
      ELSIF col_rec.data_type = 'bytea' THEN
        result := result || 'bytea';
      ELSE
        result := result || col_rec.data_type;
      END IF;

      -- Default
      IF col_rec.column_default IS NOT NULL THEN
        result := result || ' DEFAULT ' || col_rec.column_default;
      END IF;

      -- NOT NULL
      IF col_rec.is_nullable = 'NO' THEN
        result := result || ' NOT NULL';
      END IF;

      is_first := false;
    END LOOP;

    -- PRIMARY KEY
    SELECT string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position)
    INTO pk_cols
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public' AND tc.table_name = rec.table_name
      AND tc.constraint_type = 'PRIMARY KEY';

    IF pk_cols IS NOT NULL THEN
      result := result || ',' || E'\n' || '  PRIMARY KEY (' || pk_cols || ')';
    END IF;

    -- UNIQUE constraints
    FOR col_rec IN
      SELECT tc.constraint_name,
             string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS cols
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = rec.table_name
        AND tc.constraint_type = 'UNIQUE'
      GROUP BY tc.constraint_name
    LOOP
      result := result || ',' || E'\n' || '  UNIQUE (' || col_rec.cols || ')';
    END LOOP;

    result := result || E'\n' || ');' || E'\n\n';

    -- Collect FOREIGN KEYS for later
    FOR col_rec IN
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_schema AS ref_schema,
        ccu.table_name AS ref_table,
        ccu.column_name AS ref_column,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name AND tc.constraint_schema = ccu.constraint_schema
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name AND tc.constraint_schema = rc.constraint_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = rec.table_name
        AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
      IF col_rec.ref_schema = 'auth' THEN
        fk_section := fk_section || '-- FK (auth): ALTER TABLE public.' || rec.table_name
          || ' ADD CONSTRAINT ' || col_rec.constraint_name
          || ' FOREIGN KEY (' || col_rec.column_name || ')'
          || ' REFERENCES auth.' || col_rec.ref_table || '(' || col_rec.ref_column || ')';
        IF col_rec.delete_rule IS NOT NULL AND col_rec.delete_rule <> 'NO ACTION' THEN
          fk_section := fk_section || ' ON DELETE ' || col_rec.delete_rule;
        END IF;
        fk_section := fk_section || ';' || E'\n';
      ELSE
        fk_section := fk_section || 'ALTER TABLE public.' || rec.table_name
          || ' ADD CONSTRAINT ' || col_rec.constraint_name
          || ' FOREIGN KEY (' || col_rec.column_name || ')'
          || ' REFERENCES public.' || col_rec.ref_table || '(' || col_rec.ref_column || ')';
        IF col_rec.delete_rule IS NOT NULL AND col_rec.delete_rule <> 'NO ACTION' THEN
          fk_section := fk_section || ' ON DELETE ' || col_rec.delete_rule;
        END IF;
        fk_section := fk_section || ';' || E'\n';
      END IF;
    END LOOP;
  END LOOP;

  -- ═══ FOREIGN KEYS ═══
  result := result || '-- ═══ FOREIGN KEYS ═══' || E'\n';
  result := result || '-- NOTA: FKs para auth.users estao comentadas. Em Supabase, auth.users ja existe.' || E'\n';
  result := result || '-- Em PostgreSQL puro, crie o schema auth e a tabela users antes de descomentar.' || E'\n\n';
  result := result || fk_section || E'\n';

  -- ═══ INDEXES ═══
  result := result || '-- ═══ INDEXES ═══' || E'\n\n';
  FOR rec IN
    SELECT indexname, indexdef FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname NOT LIKE '%_pkey'
      AND indexname NOT LIKE '%_key'
    ORDER BY tablename, indexname
  LOOP
    result := result || rec.indexdef || ';' || E'\n';
  END LOOP;
  result := result || E'\n';

  -- ═══ RLS ═══
  result := result || '-- ═══ ROW LEVEL SECURITY ═══' || E'\n\n';
  FOR rec IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = true
    ORDER BY tablename
  LOOP
    result := result || 'ALTER TABLE public.' || rec.tablename || ' ENABLE ROW LEVEL SECURITY;' || E'\n';
  END LOOP;
  result := result || E'\n';

  -- ═══ POLICIES ═══
  result := result || '-- ═══ POLICIES ═══' || E'\n\n';
  FOR rec IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  LOOP
    result := result || 'CREATE POLICY "' || rec.policyname || '"' || E'\n';
    result := result || '  ON public.' || rec.tablename || E'\n';
    IF rec.permissive = 'PERMISSIVE' THEN
      result := result || '  AS PERMISSIVE' || E'\n';
    ELSE
      result := result || '  AS RESTRICTIVE' || E'\n';
    END IF;
    result := result || '  FOR ' || rec.cmd || E'\n';
    result := result || '  TO ' || array_to_string(rec.roles, ', ') || E'\n';
    IF rec.qual IS NOT NULL THEN
      result := result || '  USING (' || rec.qual || ')' || E'\n';
    END IF;
    IF rec.with_check IS NOT NULL THEN
      result := result || '  WITH CHECK (' || rec.with_check || ')';
    END IF;
    result := result || ';' || E'\n\n';
  END LOOP;

  -- ═══ FUNCTIONS ═══
  result := result || '-- ═══ FUNCTIONS ═══' || E'\n\n';
  FOR rec IN
    SELECT p.proname AS func_name, pg_get_functiondef(p.oid) AS func_def
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind IN ('f', 'p')
      AND p.proname != 'generate_schema_ddl'
    ORDER BY p.proname
  LOOP
    result := result || rec.func_def || ';' || E'\n\n';
  END LOOP;

  -- ═══ TRIGGERS ═══
  result := result || '-- ═══ TRIGGERS ═══' || E'\n\n';
  FOR rec IN
    SELECT trigger_name, event_manipulation, event_object_table,
           action_timing, action_statement, action_orientation
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name
  LOOP
    result := result || 'CREATE TRIGGER ' || rec.trigger_name || E'\n';
    result := result || '  ' || rec.action_timing || ' ' || rec.event_manipulation || E'\n';
    result := result || '  ON public.' || rec.event_object_table || E'\n';
    result := result || '  FOR EACH ' || rec.action_orientation || E'\n';
    result := result || '  EXECUTE FUNCTION ' || rec.action_statement || ';' || E'\n\n';
  END LOOP;

  -- ═══ VIEWS ═══
  result := result || '-- ═══ VIEWS ═══' || E'\n\n';
  FOR rec IN
    SELECT table_name, view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name
  LOOP
    result := result || 'CREATE OR REPLACE VIEW public.' || rec.table_name || ' AS' || E'\n';
    result := result || rec.view_definition || ';' || E'\n\n';
  END LOOP;

  -- ═══ REALTIME ═══
  result := result || '-- ═══ REALTIME ═══' || E'\n\n';
  FOR rec IN
    SELECT c.relname AS table_name
    FROM pg_publication_tables pt
    JOIN pg_class c ON c.oid = pt.pubrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pt.pubname = 'supabase_realtime' AND n.nspname = 'public'
    ORDER BY c.relname
  LOOP
    result := result || 'ALTER PUBLICATION supabase_realtime ADD TABLE public.' || rec.table_name || ';' || E'\n';
  END LOOP;

  result := result || E'\n' || '-- ═══ FIM DO SCHEMA ═══' || E'\n';
  RETURN result;
END;
$$;
