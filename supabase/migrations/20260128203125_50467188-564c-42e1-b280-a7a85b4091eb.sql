-- Tabela para consentimento de suporte
CREATE TABLE public.support_consent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  revoked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  granted_ip TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Tabela para logs detalhados de sessões de suporte (imutável)
CREATE TABLE public.support_session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  user_id UUID NOT NULL,
  consent_id UUID REFERENCES public.support_consent(id),
  access_type TEXT NOT NULL DEFAULT 'readonly' CHECK (access_type IN ('readonly', 'edit')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  admin_ip TEXT,
  admin_user_agent TEXT,
  actions_log JSONB DEFAULT '[]',
  session_token TEXT NOT NULL,
  auto_ended BOOLEAN DEFAULT false,
  end_reason TEXT
);

-- Tabela para alertas de abuso
CREATE TABLE public.support_abuse_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  alert_message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'
);

-- Criar índices
CREATE INDEX idx_support_consent_user ON public.support_consent(user_id);
CREATE INDEX idx_support_consent_ticket ON public.support_consent(ticket_id);
CREATE INDEX idx_support_consent_active ON public.support_consent(is_active) WHERE is_active = true;
CREATE INDEX idx_support_session_admin ON public.support_session_logs(admin_id);
CREATE INDEX idx_support_session_user ON public.support_session_logs(user_id);
CREATE INDEX idx_support_session_started ON public.support_session_logs(started_at);
CREATE INDEX idx_support_abuse_admin ON public.support_abuse_alerts(admin_id);
CREATE INDEX idx_support_abuse_unread ON public.support_abuse_alerts(is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.support_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_abuse_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para support_consent
-- Usuários podem ver e gerenciar seus próprios consentimentos
CREATE POLICY "Users can view own consent" 
  ON public.support_consent 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can grant consent" 
  ON public.support_consent 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can revoke consent" 
  ON public.support_consent 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Admins podem ver consentimentos (via função)
CREATE POLICY "Admins can view consent" 
  ON public.support_consent 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.collaborators 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      AND role IN ('master', 'admin', 'suporte')
    )
  );

-- Políticas para support_session_logs (IMUTÁVEIS - apenas MASTER pode ver)
CREATE POLICY "Only master can view session logs" 
  ON public.support_session_logs 
  FOR SELECT 
  USING (public.is_master(auth.uid()));

-- Insert apenas via service role (edge function)
CREATE POLICY "Service role can insert logs" 
  ON public.support_session_logs 
  FOR INSERT 
  WITH CHECK (false); -- Apenas service role pode inserir

-- Políticas para support_abuse_alerts (apenas MASTER)
CREATE POLICY "Only master can view abuse alerts" 
  ON public.support_abuse_alerts 
  FOR SELECT 
  USING (public.is_master(auth.uid()));

CREATE POLICY "Only master can update abuse alerts" 
  ON public.support_abuse_alerts 
  FOR UPDATE 
  USING (public.is_master(auth.uid()));

-- Função para contar sessões de um admin no dia
CREATE OR REPLACE FUNCTION public.count_admin_sessions_today(_admin_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.support_session_logs
  WHERE admin_id = _admin_id
    AND DATE(started_at) = CURRENT_DATE
$$;

-- Função para verificar se há consentimento ativo
CREATE OR REPLACE FUNCTION public.has_active_consent(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.support_consent
    WHERE user_id = _user_id
      AND is_active = true
      AND revoked_at IS NULL
      AND expires_at > now()
  )
$$;

-- Função para verificar se há consentimento vinculado a ticket
CREATE OR REPLACE FUNCTION public.get_active_consent(_user_id UUID)
RETURNS TABLE(
  consent_id UUID,
  ticket_id UUID,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id as consent_id, ticket_id, expires_at
  FROM public.support_consent
  WHERE user_id = _user_id
    AND is_active = true
    AND revoked_at IS NULL
    AND expires_at > now()
  ORDER BY granted_at DESC
  LIMIT 1
$$;