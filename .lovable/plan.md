

## Plano: Versionamento de Prompts + Biblioteca Genérica para Novo SaaS

### Resumo

Três melhorias no painel de Governança:

1. **Histórico de versões por prompt** — Cada vez que um prompt é editado, a versão anterior é salva automaticamente. Dentro do card do prompt, uma seção "Histórico de Versões" mostra a evolução (v1 → v2 → v3...) com data, diff visual e qual versão está ativa.

2. **Aba "Novo SaaS" aprimorada** — Cada fase do checklist ganha uma lista de prompts genéricos associados (sem referências à Precify). Cada prompt tem botão "Copiar" para uso em qualquer projeto novo.

3. **Prompts atualizados refletindo o código atual** — Os prompts das edge functions que usam IA (generate-combo, generate-menu-strategy, analyze-spreadsheet-columns, generate-weekly-report, generate-combo-details, analyze-menu-performance, parse-ifood-menu) devem estar registrados e atualizados na tabela `architecture_prompts`.

---

### Implementação

#### 1. Nova tabela: `architecture_prompt_versions`

```sql
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
```

#### 2. Nova tabela: `saas_phase_prompts` (prompts genéricos por fase)

```sql
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

CREATE POLICY "Admin read phase prompts" ON public.saas_phase_prompts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'master') OR public.has_role(auth.uid(), 'admin'));
```

#### 3. Alterações no frontend

**`src/hooks/useArchitectureGovernance.ts`**:
- Adicionar fetch de `architecture_prompt_versions` por prompt
- Ao atualizar um prompt, salvar versão anterior automaticamente em `architecture_prompt_versions`
- Adicionar fetch de `saas_phase_prompts`

**`src/components/admin/ArchitectureGovernanceDashboard.tsx`**:
- No `PromptCard`: adicionar seção colapsável "Histórico de Versões" com timeline (v1, v2, v3...), mostrando data, texto e motivo da mudança. Botão "Copiar" em cada versão.
- Na aba "Novo SaaS": para cada fase, listar prompts genéricos da tabela `saas_phase_prompts` com botão "Copiar Prompt". Prompts são escritos de forma genérica (ex: "Implementar RBAC com papéis configuráveis..." sem mencionar Precify).

#### 4. Seed de prompts genéricos por fase

Inserir via migration prompts genéricos para as 5 fases do checklist existente. Exemplos:

- **Fase 1 (Segurança)**: "Implementar RBAC com papéis e permissões granulares", "Configurar RLS em todas as tabelas com dados de usuário"
- **Fase 2 (Backend)**: "Criar edge functions com rate limiting e validação de ownership"
- **Fase 3 (Continuidade)**: "Implementar backup/restore com exportação JSON criptografada"
- **Fase 4 (Ajuda/UX)**: "Criar sistema de ajuda contextual por seção com busca"
- **Fase 5 (Governança)**: "Implementar dashboard de maturidade com score ponderado"

---

### Arquivos editados
- `src/hooks/useArchitectureGovernance.ts` — versões + phase prompts
- `src/components/admin/ArchitectureGovernanceDashboard.tsx` — UI de versões no PromptCard + aba Novo SaaS com prompts copiáveis
- 1 migration SQL — tabelas + seed de prompts genéricos

