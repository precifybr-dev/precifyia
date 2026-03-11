
-- Table: architecture_prompt_versions
CREATE TABLE public.architecture_prompt_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES public.architecture_prompts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  prompt_text TEXT NOT NULL,
  description TEXT,
  change_reason TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(prompt_id, version_number)
);

ALTER TABLE public.architecture_prompt_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin read versions" ON public.architecture_prompt_versions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin insert versions" ON public.architecture_prompt_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

-- Table: saas_phase_prompts
CREATE TABLE public.saas_phase_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase INTEGER NOT NULL,
  phase_name TEXT NOT NULL,
  prompt_title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  problem_description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.saas_phase_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage phase prompts" ON public.saas_phase_prompts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));

-- Seed generic SaaS phase prompts
INSERT INTO public.saas_phase_prompts (phase, phase_name, prompt_title, prompt_text, problem_description, sort_order) VALUES
-- Phase 1: Security
(1, 'Segurança', 'Implementar RBAC com papéis e permissões granulares',
'Implemente um sistema de controle de acesso baseado em papéis (RBAC) com as seguintes características:
1. Crie uma tabela user_roles separada (nunca armazene roles na tabela de perfis)
2. Crie um enum app_role com os papéis necessários (ex: admin, user, viewer)
3. Crie uma função SECURITY DEFINER has_role(user_id, role) para verificação segura
4. Crie uma tabela role_permissions mapeando cada role às suas permissões
5. Crie uma função has_permission(user_id, permission) para verificação granular
6. Adicione triggers para prevenir auto-elevação de privilégios
7. Proteja o papel mais alto (master/owner) contra modificação por outros usuários
8. Registre tentativas de escalação de privilégios em logs de auditoria',
'Sem controle de acesso, qualquer usuário autenticado pode acessar dados e funcionalidades administrativas, expondo dados sensíveis e permitindo ações destrutivas.', 1),

(1, 'Segurança', 'Configurar RLS em todas as tabelas com dados de usuário',
'Para cada tabela que contenha dados de usuários:
1. Execute ALTER TABLE [tabela] ENABLE ROW LEVEL SECURITY
2. Crie policies de SELECT que filtrem por auth.uid() = user_id
3. Crie policies de INSERT com WITH CHECK (auth.uid() = user_id)
4. Crie policies de UPDATE e DELETE com USING (auth.uid() = user_id)
5. Para tabelas administrativas, use a função has_role() nas policies
6. Para tabelas públicas (sem dados sensíveis), permita SELECT para todos autenticados
7. Teste cada policy inserindo/lendo dados como diferentes usuários
8. Crie índices nas colunas user_id e store_id para performance das policies',
'Sem RLS, qualquer usuário pode ler, modificar ou deletar dados de outros usuários através de chamadas diretas à API.', 2),

(1, 'Segurança', 'Implementar Rate Limiting para endpoints críticos',
'Crie um sistema de rate limiting para proteger endpoints sensíveis:
1. Crie tabela rate_limit_entries com campos: key, endpoint, window_start, request_count, blocked_until
2. Bloqueie acesso total via RLS (USING false) - opere apenas via service_role
3. Crie função SECURITY DEFINER check_rate_limit(key, endpoint, max_requests, window_seconds, block_seconds)
4. A função deve: contar requests na janela, bloquear se exceder, retornar (allowed, remaining, retry_after)
5. Crie função de cleanup para entradas antigas (> 24h)
6. Aplique em: login, signup, reset password, geração de conteúdo IA, exportações
7. Use IP + user_id como chave composta quando possível
8. Retorne headers X-RateLimit-Remaining e Retry-After nas respostas',
'Sem rate limiting, o sistema fica vulnerável a ataques de força bruta, abuso de recursos de IA e scraping automatizado.', 3),

(1, 'Segurança', 'Blindar acesso frontend a dados administrativos',
'Garanta que dados administrativos nunca sejam acessíveis diretamente pelo frontend:
1. Crie views com security_invoker = on para métricas administrativas
2. Processe dados sensíveis exclusivamente via Edge Functions ou funções SECURITY DEFINER
3. Valide has_role(master/admin) dentro de cada função que retorna dados administrativos
4. Nunca exponha IDs de projeto, URLs internas ou chaves de API no código frontend
5. Crie tabelas de configuração (plan_features, commission_config) com RLS restritivo
6. Implemente logs de auditoria para toda ação administrativa
7. Use service_role apenas em Edge Functions, nunca no frontend',
'Dados estratégicos como métricas de receita, configurações de planos e cupons podem ser extraídos por usuários maliciosos via DevTools.', 4),

(1, 'Segurança', 'Implementar logs de ações críticas e auditoria',
'Crie um sistema completo de auditoria:
1. Crie tabela admin_audit_logs: admin_user_id, target_user_id, action, action_type, old_value, new_value, ip_address, user_agent
2. Crie tabela access_logs: user_id, action, success, ip_address, metadata
3. Crie tabela data_audit_log: user_id, table_name, record_id, action, old_data, new_data, confirmation_steps
4. Registre automaticamente via triggers: alterações de role, exclusões em massa, alterações de plano
5. Implemente RLS: apenas master/admin podem ler logs
6. Adicione índices por user_id e created_at para consultas rápidas
7. Crie Edge Function para registrar logins com IP e user-agent
8. Nunca permita UPDATE ou DELETE em tabelas de log (imutabilidade)',
'Sem logs de auditoria, é impossível rastrear violações de segurança, entender quem fez o quê, e cumprir requisitos de compliance.', 5),

-- Phase 2: Backend
(2, 'Backend', 'Criar Edge Functions com validação de ownership e rate limiting',
'Para cada Edge Function que manipula dados de usuários:
1. Extraia o JWT do header Authorization e valide com supabase.auth.getUser()
2. Antes de qualquer operação, confirme que o recurso pertence ao usuário (ownership check)
3. Aplique rate limiting chamando check_rate_limit() antes da lógica principal
4. Para funções administrativas, valide has_role(master/admin) no início
5. Retorne erros padronizados: 401 (não autenticado), 403 (sem permissão), 429 (rate limited)
6. Use try/catch com logging de erros sem expor detalhes internos
7. Valide e sanitize todos os inputs antes de processar
8. Para funções que usam IA, registre o uso em tabela de tracking',
'Edge Functions sem validação permitem que qualquer pessoa com o URL execute operações privilegiadas, acesse dados de outros usuários e abuse de recursos.', 1),

(2, 'Backend', 'Implementar validação de dados com triggers de banco',
'Crie triggers de validação para garantir integridade dos dados:
1. Para cada tabela principal, crie uma função validate_[tabela]_data()
2. Valide campos obrigatórios (NOT NULL check com mensagens claras)
3. Valide ranges numéricos (percentuais 0-100, valores não negativos)
4. Valide comprimento de strings (nomes < 200 chars)
5. Bloqueie NaN/Infinity em campos numéricos
6. Use triggers BEFORE INSERT OR UPDATE para interceptar dados inválidos
7. Retorne mensagens de erro em português para o usuário final
8. Use RAISE EXCEPTION com mensagens descritivas sem expor detalhes técnicos',
'Sem validação no banco, dados corrompidos podem ser inseridos via API direta, causando erros em cascata e cálculos incorretos.', 2),

(2, 'Backend', 'Criar sistema multi-tenant com isolamento por loja',
'Implemente isolamento de dados por loja/organização:
1. Crie tabela stores com user_id (dono), name, is_default
2. Adicione coluna store_id em todas as tabelas de dados do usuário
3. Crie tabela store_members para colaboradores: store_id, user_id, role, permissions
4. Crie funções SECURITY DEFINER: has_store_access(), can_write_store(), can_manage_store()
5. Atualize policies RLS para verificar store_id além de user_id
6. Implemente switch de loja no frontend com contexto React
7. Crie trigger para prevenir auto-promoção de membros
8. Implemente compartilhamento de despesas entre lojas via sharing_groups',
'Sem multi-tenancy, usuários com múltiplas unidades não conseguem separar dados, e colaboradores podem acessar dados de lojas não autorizadas.', 3),

-- Phase 3: Continuity
(3, 'Backup & Continuidade', 'Implementar backup/restore com exportação JSON',
'Crie um sistema completo de backup e restauração:
1. Crie Edge Function backup-restore que aceite ações: backup e restore
2. No backup: exporte todas as tabelas do usuário em JSON estruturado
3. Inclua metadados: versão do schema, data do backup, contagem de registros
4. Valide ownership antes de exportar (apenas dados do usuário autenticado)
5. No restore: valide o JSON contra o schema atual antes de inserir
6. Use transação para restore (tudo ou nada)
7. Registre cada operação de backup/restore em logs de auditoria
8. Implemente lixeira (soft delete) com expiração de 30 dias antes de exclusão permanente',
'Sem backup, uma exclusão acidental ou bug pode causar perda irreversível de dados críticos do negócio do usuário.', 1),

(3, 'Backup & Continuidade', 'Implementar lixeira com recuperação temporária',
'Crie um sistema de soft-delete com recuperação:
1. Crie tabela deleted_records: original_table, original_id, data (JSONB), deleted_at, expires_at, user_id
2. Em vez de DELETE direto, mova o registro para deleted_records
3. Defina expires_at = deleted_at + 30 dias
4. Crie página /lixeira no frontend listando itens excluídos por tabela
5. Implemente botão "Restaurar" que reinsere o registro na tabela original
6. Crie job/cron para limpar registros expirados periodicamente
7. Registre quem excluiu e quem restaurou em data_audit_log
8. Aplique RLS: usuário só vê seus próprios itens excluídos',
'Exclusões acidentais são permanentes, causando frustração e perda de trabalho que o usuário investiu horas configurando.', 2),

-- Phase 4: Help/UX
(4, 'Ajuda & Educação', 'Criar sistema de ajuda contextual por seção',
'Implemente ajuda integrada em cada seção do aplicativo:
1. Crie um mapeamento de categorias de ajuda por rota/seção
2. Para cada seção, defina: título, descrição, passos de uso, dicas, FAQ
3. Crie componente ContextualHelp com ícone de interrogação que abre drawer/modal
4. O conteúdo deve ser filtrado pela seção atual (useLocation)
5. Implemente busca textual dentro do conteúdo de ajuda
6. Adicione exemplos visuais e links para tutoriais quando disponíveis
7. Crie página /ajuda centralizada com todas as categorias
8. Meça quais seções de ajuda são mais acessadas via analytics',
'Usuários não encontram como usar funcionalidades, abandonam o produto por frustração e sobrecarregam o suporte com dúvidas básicas.', 1),

(4, 'Ajuda & Educação', 'Implementar onboarding guiado com progresso persistente',
'Crie uma experiência de onboarding passo a passo:
1. Defina os passos essenciais do onboarding (ex: configurar perfil, adicionar dados, criar primeiro item)
2. Persista o progresso na tabela de perfil (onboarding_step, onboarding_completed)
3. Crie componente OnboardingProgress visível no dashboard
4. Mostre dicas contextuais na primeira visita a cada seção
5. Celebre marcos alcançados com animações/confetti
6. Permita pular etapas mas mantenha o indicador de progresso
7. Envie email de boas-vindas com link para completar o onboarding
8. Rastreie taxa de conclusão do onboarding via analytics',
'Sem onboarding, novos usuários ficam perdidos, não configuram o sistema corretamente e churnam na primeira semana.', 2),

-- Phase 5: UX
(5, 'UX & Interface', 'Implementar design system com tokens semânticos',
'Crie um design system consistente e escalável:
1. Defina tokens CSS em :root usando HSL: --background, --foreground, --primary, --secondary, --muted, --accent, --destructive
2. Configure dark mode com tokens alternativos em .dark
3. Adicione todos os tokens no tailwind.config para uso com classes Tailwind
4. Nunca use cores hardcoded (text-white, bg-black) nos componentes
5. Crie variantes de componentes usando class-variance-authority (cva)
6. Use shadcn/ui como base e customize via tokens
7. Implemente gradientes e sombras como tokens reutilizáveis
8. Documente o design system em um "Livro do Sistema" interno',
'Sem design system, a interface fica inconsistente, manutenção é difícil, e dark mode quebra em múltiplos lugares.', 1),

-- Phase 6: Governance
(6, 'Governança', 'Implementar dashboard de maturidade com score ponderado',
'Crie um sistema de avaliação da saúde do projeto:
1. Defina fases com pesos: Segurança (30%), Backend (20%), Continuidade (20%), Ajuda (10%), UX (10%), Governança (10%)
2. Crie tabela de checklist base com itens por fase (architecture_base_checks)
3. Calcule score por fase: (itens completos / total) * 100
4. Calcule score geral: soma ponderada dos scores por fase
5. Crie tabela architecture_score_history para registrar snapshots
6. Implemente auto-snapshot ao acessar o dashboard
7. Crie sistema de certificação: selo "Arquitetura Aprovada" quando score >= 85 e segurança >= 90
8. Auto-revogue certificação se score cair abaixo dos mínimos
9. Visualize evolução com gráfico de linha temporal',
'Sem governança, o projeto degrada silenciosamente, acumula dívida técnica e perde controle sobre a qualidade e segurança.', 1),

(6, 'Governança', 'Implementar versionamento de prompts e decisões',
'Rastreie a evolução de prompts e decisões arquiteturais:
1. Crie tabela architecture_prompt_versions: prompt_id, version_number, prompt_text, change_reason
2. Ao editar um prompt, salve automaticamente a versão anterior
3. Incremente version_number automaticamente
4. Exiba timeline de versões no card do prompt (v1 → v2 → v3)
5. Permita copiar qualquer versão com um clique
6. Registre quem fez a alteração e quando
7. Crie biblioteca de prompts genéricos por fase para reutilização em novos projetos
8. Mantenha prompts genéricos (sem referências a projetos específicos)',
'Sem versionamento, prompts são perdidos ao serem editados, impossibilitando entender a evolução do projeto e replicar decisões em novos projetos.', 2);
