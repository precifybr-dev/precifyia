-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin', 'master');

-- Tabela de roles de usuários
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    is_protected BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Tabela para controle de primeiro acesso e 2FA
CREATE TABLE public.user_security (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    must_change_password BOOLEAN NOT NULL DEFAULT false,
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    mfa_verified BOOLEAN NOT NULL DEFAULT false,
    mfa_secret TEXT,
    last_mfa_code TEXT,
    mfa_code_expires_at TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de logs de acesso
CREATE TABLE public.access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    action TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Função para verificar role (security definer para evitar recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Função para verificar se é master
CREATE OR REPLACE FUNCTION public.is_master(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'master'
      AND is_protected = true
  )
$$;

-- Função para verificar segurança do usuário
CREATE OR REPLACE FUNCTION public.get_user_security(_user_id UUID)
RETURNS TABLE (
  must_change_password BOOLEAN,
  mfa_enabled BOOLEAN,
  mfa_verified BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT must_change_password, mfa_enabled, mfa_verified
  FROM public.user_security
  WHERE user_id = _user_id
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Masters can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_master(auth.uid()));

CREATE POLICY "Masters can manage roles"
ON public.user_roles FOR ALL
USING (public.is_master(auth.uid()))
WITH CHECK (public.is_master(auth.uid()));

-- Impedir remoção de usuário master protegido
CREATE POLICY "Protected roles cannot be deleted"
ON public.user_roles FOR DELETE
USING (is_protected = false OR public.is_master(auth.uid()) = false);

-- Políticas RLS para user_security
CREATE POLICY "Users can view their own security"
ON public.user_security FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security"
ON public.user_security FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Masters can view all security"
ON public.user_security FOR SELECT
USING (public.is_master(auth.uid()));

-- Políticas RLS para access_logs
CREATE POLICY "Users can view their own logs"
ON public.access_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Masters can view all logs"
ON public.access_logs FOR SELECT
USING (public.is_master(auth.uid()));

CREATE POLICY "System can insert logs"
ON public.access_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_security_updated_at
BEFORE UPDATE ON public.user_security
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();