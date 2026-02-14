
-- Table: Architecture Prompts (registro de todos os prompts estruturais)
CREATE TABLE public.architecture_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('seguranca','backend','frontend','ux_educacao','backup_continuidade','infraestrutura','versionamento','logs_auditoria')),
  description text NOT NULL,
  prompt_text text NOT NULL DEFAULT '',
  implementation_date date,
  status text NOT NULL DEFAULT 'nao_implementado' CHECK (status IN ('implementado','parcial','nao_implementado')),
  criticality text NOT NULL DEFAULT 'medio' CHECK (criticality IN ('alto','medio','baixo')),
  related_files text[] DEFAULT '{}',
  related_functions text[] DEFAULT '{}',
  related_tables text[] DEFAULT '{}',
  related_policies text[] DEFAULT '{}',
  related_edge_functions text[] DEFAULT '{}',
  impacts text[] DEFAULT '{}',
  dependencies text[] DEFAULT '{}',
  auto_scan_result jsonb,
  auto_scan_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.architecture_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master can manage architecture_prompts"
ON public.architecture_prompts FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Table: Architecture History (histórico de alterações estruturais)
CREATE TABLE public.architecture_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id uuid REFERENCES public.architecture_prompts(id) ON DELETE SET NULL,
  action text NOT NULL,
  description text NOT NULL,
  old_status text,
  new_status text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.architecture_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master can manage architecture_history"
ON public.architecture_history FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Table: Architecture Base Checks (checklist de arquitetura base obrigatória)
CREATE TABLE public.architecture_base_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phase integer NOT NULL,
  phase_name text NOT NULL,
  check_name text NOT NULL,
  check_description text NOT NULL DEFAULT '',
  is_blocking boolean NOT NULL DEFAULT false,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.architecture_base_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master can manage architecture_base_checks"
ON public.architecture_base_checks FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'master'))
WITH CHECK (public.has_role(auth.uid(), 'master'));

-- Trigger for updated_at
CREATE TRIGGER update_architecture_prompts_updated_at
BEFORE UPDATE ON public.architecture_prompts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_architecture_base_checks_updated_at
BEFORE UPDATE ON public.architecture_base_checks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: Architecture Base Checks (Phases 1-5)
INSERT INTO public.architecture_base_checks (phase, phase_name, check_name, check_description, is_blocking, sort_order) VALUES
-- Phase 1 - Segurança (BLOQUEANTE)
(1, 'Segurança', 'Blindagem de dados administrativos', 'Nenhum acesso direto do frontend a dados sensíveis', true, 1),
(1, 'Segurança', 'Controle de acesso por role', 'RBAC com verificação server-side obrigatória', true, 2),
(1, 'Segurança', 'RLS aplicado', 'Row Level Security em todas as tabelas com dados de usuário', true, 3),
(1, 'Segurança', 'Rate limit server-side', 'Controle de taxa de requisições por endpoint', true, 4),
(1, 'Segurança', 'Setup admin seguro', 'MFA e verificação de identidade para acesso admin', true, 5),
(1, 'Segurança', 'Logs de ações críticas', 'Registro imutável de todas as ações sensíveis', true, 6),
-- Phase 2 - Backend
(2, 'Backend', 'Modelagem clara de dados', 'Schema normalizado com relacionamentos bem definidos', false, 7),
(2, 'Backend', 'Funções intermediárias obrigatórias', 'RPCs e Edge Functions como camada de validação', false, 8),
(2, 'Backend', 'Versionamento de schema', 'Migrações versionadas e rastreáveis', false, 9),
(2, 'Backend', 'Validação total no backend', 'Nenhum dado confiado vindo do frontend', false, 10),
-- Phase 3 - Continuidade (BLOQUEANTE)
(3, 'Backup & Continuidade', 'Exportação por empresa', 'Backup lógico isolado por tenant', true, 11),
(3, 'Backup & Continuidade', 'Arquivo proprietário versionado', 'Formato de exportação com versão do schema', true, 12),
(3, 'Backup & Continuidade', 'Validação de company_id', 'Bloqueio de import cruzado entre empresas', true, 13),
(3, 'Backup & Continuidade', 'Rollback em falha', 'Transação com reversão automática em erro', true, 14),
(3, 'Backup & Continuidade', 'Log de import/export', 'Registro de todas as operações de backup', true, 15),
-- Phase 4 - Ajuda
(4, 'Ajuda', 'FAQs no banco', 'Conteúdo de ajuda armazenado e versionado', false, 16),
(4, 'Ajuda', 'Categorização e tags', 'Sistema de busca por categorias e tags', false, 17),
(4, 'Ajuda', 'Ajuda contextual', 'Help inline vinculado a cada tela', false, 18),
(4, 'Ajuda', 'Desativação automática', 'Conteúdo desatualizado desativado por versão', false, 19),
-- Phase 5 - UX
(5, 'UX', 'Alertas automáticos de risco', 'Ex: margem baixa, churn alto', false, 20),
(5, 'UX', 'Persistência de preferências', 'localStorage versionado para preferências do usuário', false, 21),
(5, 'UX', 'Guias opcionais', 'Onboarding e tooltips contextuais', false, 22);

-- Indexes
CREATE INDEX idx_architecture_prompts_category ON public.architecture_prompts(category);
CREATE INDEX idx_architecture_prompts_status ON public.architecture_prompts(status);
CREATE INDEX idx_architecture_history_prompt_id ON public.architecture_history(prompt_id);
CREATE INDEX idx_architecture_base_checks_phase ON public.architecture_base_checks(phase);
