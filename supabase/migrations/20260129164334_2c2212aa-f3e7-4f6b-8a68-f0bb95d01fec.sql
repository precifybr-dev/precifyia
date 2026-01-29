-- Populate role_permissions with default permissions for each role

-- Master role (all permissions)
INSERT INTO public.role_permissions (role, permission) VALUES
('master', 'view_users'),
('master', 'edit_users'),
('master', 'impersonate_user'),
('master', 'reset_password'),
('master', 'view_financials'),
('master', 'view_metrics'),
('master', 'manage_plans'),
('master', 'respond_support'),
('master', 'manage_collaborators'),
('master', 'view_logs')
ON CONFLICT DO NOTHING;

-- Admin role
INSERT INTO public.role_permissions (role, permission) VALUES
('admin', 'view_users'),
('admin', 'edit_users'),
('admin', 'view_metrics'),
('admin', 'view_logs')
ON CONFLICT DO NOTHING;

-- Suporte role
INSERT INTO public.role_permissions (role, permission) VALUES
('suporte', 'view_users'),
('suporte', 'impersonate_user'),
('suporte', 'reset_password'),
('suporte', 'respond_support'),
('suporte', 'view_logs')
ON CONFLICT DO NOTHING;

-- Financeiro role
INSERT INTO public.role_permissions (role, permission) VALUES
('financeiro', 'view_users'),
('financeiro', 'view_financials'),
('financeiro', 'view_metrics'),
('financeiro', 'manage_plans')
ON CONFLICT DO NOTHING;

-- Analista role
INSERT INTO public.role_permissions (role, permission) VALUES
('analista', 'view_users'),
('analista', 'view_metrics'),
('analista', 'view_logs')
ON CONFLICT DO NOTHING;

-- Also ensure the master user is in the collaborators table
INSERT INTO public.collaborators (user_id, email, name, role, is_active)
SELECT 
  ur.user_id,
  'precify.br@gmail.com',
  'Master Admin',
  'master'::app_role,
  true
FROM user_roles ur
WHERE ur.role = 'master'
AND NOT EXISTS (
  SELECT 1 FROM collaborators c WHERE c.user_id = ur.user_id
)
ON CONFLICT DO NOTHING;