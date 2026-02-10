
-- Fix CRITICAL: Enable RLS on role_permissions table
-- This table is structural/global config, so we allow authenticated SELECT but restrict writes to master
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read role-permission mappings (needed by useRBAC hook)
CREATE POLICY "Authenticated users can view role permissions"
ON public.role_permissions
FOR SELECT
TO authenticated
USING (true);

-- Only master can manage role permissions
CREATE POLICY "Only master can manage role permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (is_master(auth.uid()))
WITH CHECK (is_master(auth.uid()));
