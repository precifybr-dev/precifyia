-- =====================================================
-- DEPARTAMENTO DE SEGURANÇA - Tabelas de Proteção de Dados
-- =====================================================

-- 1. Tabela para dados "deletados" (soft delete / lixeira)
CREATE TABLE public.deleted_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_table TEXT NOT NULL,
  original_id UUID NOT NULL,
  user_id UUID NOT NULL,
  store_id UUID,
  data JSONB NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_by UUID,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  restored_at TIMESTAMPTZ,
  is_restored BOOLEAN NOT NULL DEFAULT false
);

-- 2. Log de auditoria para todas as ações destrutivas
CREATE TABLE public.data_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  confirmation_steps INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- Índices para performance
-- =====================================================

CREATE INDEX idx_deleted_records_user_id ON public.deleted_records(user_id);
CREATE INDEX idx_deleted_records_original_table ON public.deleted_records(original_table);
CREATE INDEX idx_deleted_records_expires_at ON public.deleted_records(expires_at);
CREATE INDEX idx_deleted_records_is_restored ON public.deleted_records(is_restored);

CREATE INDEX idx_data_audit_log_user_id ON public.data_audit_log(user_id);
CREATE INDEX idx_data_audit_log_table_name ON public.data_audit_log(table_name);
CREATE INDEX idx_data_audit_log_created_at ON public.data_audit_log(created_at);

-- =====================================================
-- Enable RLS
-- =====================================================

ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies - deleted_records
-- =====================================================

-- Usuários veem apenas seus próprios registros deletados
CREATE POLICY "Users can view own deleted records"
  ON public.deleted_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Usuários podem inserir registros deletados (soft delete)
CREATE POLICY "Users can insert deleted records"
  ON public.deleted_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar (restaurar) seus próprios registros
CREATE POLICY "Users can update own deleted records"
  ON public.deleted_records
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Apenas MASTER pode deletar permanentemente
CREATE POLICY "Only master can permanently delete"
  ON public.deleted_records
  FOR DELETE
  USING (public.is_master(auth.uid()));

-- =====================================================
-- RLS Policies - data_audit_log
-- =====================================================

-- Usuários podem ver seus próprios logs de auditoria
CREATE POLICY "Users can view own audit logs"
  ON public.data_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- Qualquer usuário autenticado pode inserir logs
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.data_audit_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins podem ver todos os logs
CREATE POLICY "Admins can view all audit logs"
  ON public.data_audit_log
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'master')
  );

-- Ninguém pode deletar logs de auditoria (imutáveis)
-- Sem política DELETE = ninguém pode deletar