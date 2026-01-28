-- Criar enum de permissões
CREATE TYPE public.app_permission AS ENUM (
  'view_users',
  'edit_users',
  'impersonate_user',
  'reset_password',
  'view_financials',
  'view_metrics',
  'manage_plans',
  'respond_support',
  'manage_collaborators',
  'view_logs'
);

-- Tabela de permissões por role (configuração padrão)
CREATE TABLE public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role app_role NOT NULL,
    permission app_permission NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (role, permission)
);

-- Tabela de permissões específicas por usuário (override)
CREATE TABLE public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    permission app_permission NOT NULL,
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, permission)
);

-- Tabela de colaboradores (usuários admin/suporte)
CREATE TABLE public.collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    role app_role NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Inserir permissões padrão para ROLE_MASTER (todas as permissões)
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
  ('master', 'view_logs');

-- Permissões para ROLE_SUPORTE
INSERT INTO public.role_permissions (role, permission) VALUES
  ('suporte', 'view_users'),
  ('suporte', 'impersonate_user'),
  ('suporte', 'reset_password'),
  ('suporte', 'respond_support'),
  ('suporte', 'view_logs');

-- Permissões para ROLE_FINANCEIRO
INSERT INTO public.role_permissions (role, permission) VALUES
  ('financeiro', 'view_users'),
  ('financeiro', 'view_financials'),
  ('financeiro', 'view_metrics'),
  ('financeiro', 'manage_plans');

-- Permissões para ROLE_ANALISTA
INSERT INTO public.role_permissions (role, permission) VALUES
  ('analista', 'view_users'),
  ('analista', 'view_metrics'),
  ('analista', 'view_logs');

-- Função para verificar se usuário tem uma permissão específica
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission app_permission)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_permission BOOLEAN;
BEGIN
  -- Primeiro, verificar permissões específicas do usuário
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = _user_id AND permission = _permission
  ) INTO _has_permission;
  
  IF _has_permission THEN
    RETURN TRUE;
  END IF;
  
  -- Se não tem permissão específica, verificar pela role
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id AND rp.permission = _permission
  ) INTO _has_permission;
  
  RETURN _has_permission;
END;
$$;

-- Função para obter todas as permissões de um usuário
CREATE OR REPLACE FUNCTION public.get_user_permissions(_user_id UUID)
RETURNS SETOF app_permission
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT permission FROM (
    SELECT rp.permission
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
    
    UNION
    
    SELECT up.permission
    FROM public.user_permissions up
    WHERE up.user_id = _user_id
  ) combined;
END;
$$;

-- Função para verificar se usuário é colaborador ativo
CREATE OR REPLACE FUNCTION public.is_collaborator(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collaborators
    WHERE user_id = _user_id AND is_active = true
  )
$$;

-- Função para obter role do colaborador
CREATE OR REPLACE FUNCTION public.get_collaborator_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.collaborators
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1
$$;

-- Políticas RLS para role_permissions (somente leitura para colaboradores)
CREATE POLICY "Collaborators can view role permissions"
ON public.role_permissions FOR SELECT
USING (public.is_collaborator(auth.uid()) OR public.is_master(auth.uid()));

-- Políticas RLS para user_permissions
CREATE POLICY "Users can view their own permissions"
ON public.user_permissions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Masters can manage all permissions"
ON public.user_permissions FOR ALL
USING (public.is_master(auth.uid()))
WITH CHECK (public.is_master(auth.uid()));

-- Políticas RLS para collaborators
CREATE POLICY "Collaborators can view collaborators"
ON public.collaborators FOR SELECT
USING (public.is_collaborator(auth.uid()) OR public.is_master(auth.uid()));

CREATE POLICY "Only masters can manage collaborators"
ON public.collaborators FOR ALL
USING (public.is_master(auth.uid()))
WITH CHECK (public.is_master(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_collaborators_updated_at
BEFORE UPDATE ON public.collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Registrar o usuário master como colaborador
INSERT INTO public.collaborators (user_id, role, name, email, is_active, created_by)
SELECT 
  ur.user_id,
  'master'::app_role,
  'Master PRECIFY',
  'precify.br@gmail.com',
  true,
  ur.user_id
FROM public.user_roles ur
WHERE ur.role = 'master' AND ur.is_protected = true
ON CONFLICT (user_id) DO NOTHING;