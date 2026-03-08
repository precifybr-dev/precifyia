

## Plan: Fix Schema SQL Generation & Auto-load Below CSV Export

### Problem
The `generate_schema_ddl()` function fails with "Acesso negado" because the edge function calls it using the service_role client, where `auth.uid()` returns null. The role check inside the function is redundant since the edge function already validates admin access.

### Changes

**1. Database Migration** — Remove the redundant role check from `generate_schema_ddl()`, since the edge function already validates admin/master role before calling it:

```sql
CREATE OR REPLACE FUNCTION public.generate_schema_ddl()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
-- Remove the has_role check (edge function already validates)
-- Keep the rest of the DDL generation logic identical
$$;
```

**2. Edit `src/pages/AdminExport.tsx`** — Restructure the page:
- Move the SQL Schema section **below** the CSV export cards (as requested)
- Auto-load the schema on mount (`useEffect` calling `handleLoadSchema`)
- Keep the "Recarregar" (refresh) and "Copiar SQL" buttons
- Show the SQL pre-generated and ready to copy on page load

### Files Affected

| Action | File |
|--------|------|
| Migration | Fix `generate_schema_ddl` — remove `auth.uid()` check |
| Edit | `src/pages/AdminExport.tsx` — move section below CSV, auto-load |

