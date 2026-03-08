CREATE OR REPLACE FUNCTION public.generate_schema_ddl()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result TEXT := '';
  tbl RECORD;
  col RECORD;
  pk RECORD;
  fk RECORD;
  first_col BOOLEAN;
BEGIN
  result := '-- ================================================================' || E'\n';
  result := result || '-- Schema SQL completo - Exportado em ' || now()::text || E'\n';
  result := result || '-- ================================================================' || E'\n\n';

  FOR tbl IN
    SELECT t.table_name
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    result := result || '-- ────────────────────────────────────────────' || E'\n';
    result := result || 'CREATE TABLE IF NOT EXISTS public.' || quote_ident(tbl.table_name) || ' (' || E'\n';
    
    first_col := true;
    FOR col IN
      SELECT c.column_name, c.data_type, c.udt_name, c.is_nullable, c.column_default,
             c.character_maximum_length
      FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = tbl.table_name
      ORDER BY c.ordinal_position
    LOOP
      IF NOT first_col THEN
        result := result || ',' || E'\n';
      END IF;
      first_col := false;

      result := result || '  ' || quote_ident(col.column_name) || ' ';
      
      IF col.data_type = 'USER-DEFINED' THEN
        result := result || col.udt_name;
      ELSIF col.data_type = 'ARRAY' THEN
        result := result || col.udt_name;
      ELSIF col.data_type = 'character varying' AND col.character_maximum_length IS NOT NULL THEN
        result := result || 'VARCHAR(' || col.character_maximum_length || ')';
      ELSE
        result := result || UPPER(col.data_type);
      END IF;

      IF col.column_default IS NOT NULL THEN
        result := result || ' DEFAULT ' || col.column_default;
      END IF;

      IF col.is_nullable = 'NO' THEN
        result := result || ' NOT NULL';
      END IF;
    END LOOP;

    FOR pk IN
      SELECT string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS cols
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = tbl.table_name AND tc.constraint_type = 'PRIMARY KEY'
      GROUP BY tc.constraint_name
    LOOP
      result := result || ',' || E'\n' || '  PRIMARY KEY (' || pk.cols || ')';
    END LOOP;

    FOR fk IN
      SELECT
        kcu.column_name,
        ccu.table_name AS ref_table,
        ccu.column_name AS ref_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.table_schema = 'public' AND tc.table_name = tbl.table_name AND tc.constraint_type = 'FOREIGN KEY'
    LOOP
      result := result || ',' || E'\n' || '  FOREIGN KEY (' || quote_ident(fk.column_name) || ') REFERENCES public.' || quote_ident(fk.ref_table) || '(' || quote_ident(fk.ref_column) || ')';
    END LOOP;

    result := result || E'\n);\n\n';
  END LOOP;

  RETURN result;
END;
$$;