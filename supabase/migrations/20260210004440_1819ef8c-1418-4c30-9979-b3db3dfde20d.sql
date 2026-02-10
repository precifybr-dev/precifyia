
-- Indices ja foram criados na migracao anterior.
-- Apenas remover RLS de role_permissions (admin_metrics e uma view, nao precisa de ALTER).
DROP POLICY IF EXISTS "Collaborators can view role permissions" ON public.role_permissions;
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;
