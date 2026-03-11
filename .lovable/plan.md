

## Plano: Padronizar Fuso Horário para São Paulo (America/Sao_Paulo)

### Problema

O sistema usa `new Date()` e `toISOString()` que geram horários em UTC. Datas exibidas com `format()` e `toLocaleDateString("pt-BR")` usam o fuso do navegador do usuário, que pode variar. O banco de dados também opera em UTC. Não há padronização para `America/Sao_Paulo`.

### Solução

Duas frentes: **banco de dados** e **frontend**.

#### 1. Banco de dados — SET timezone na sessão

Criar migration:
```sql
ALTER DATABASE postgres SET timezone TO 'America/Sao_Paulo';
```
**Nota**: Isso não é permitido em Lovable Cloud. Em vez disso, usar `AT TIME ZONE 'America/Sao_Paulo'` nas queries onde necessário, e padronizar no frontend.

#### 2. Frontend — Utilitário centralizado

Criar `src/lib/date-utils.ts` com funções helper que forçam `timeZone: 'America/Sao_Paulo'`:

```typescript
export const SP_TIMEZONE = 'America/Sao_Paulo';

export function formatDateBR(date: string | Date, fmt?: string): string { ... }
export function formatDateTimeBR(date: string | Date): string { ... }
export function nowSP(): Date { ... }
```

Usar `date-fns-tz` ou `Intl.DateTimeFormat` com `timeZone: 'America/Sao_Paulo'` para garantir consistência.

#### 3. Substituir usos no código

Atualizar todos os arquivos que formatam datas para usar os helpers centralizados:

- **11+ arquivos** com `format(new Date(...), "dd/MM...", { locale: ptBR })` → usar `formatDateBR`
- **5+ arquivos** com `toLocaleDateString("pt-BR")` → usar `formatDateBR`
- **`toISOString()`** em logs/tracking permanece UTC (padrão correto para armazenamento)
- **Edge functions** que geram datas para exibição → adicionar timezone São Paulo

#### 4. Edge functions

Nas edge functions que geram conteúdo visível ao usuário (ex: `generate-weekly-report`), formatar com timezone São Paulo:

```typescript
new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
```

### Arquivos editados
- **Novo**: `src/lib/date-utils.ts` — helpers centralizados
- **Editados** (~15 arquivos): todos que formatam datas para exibição, incluindo:
  - `src/pages/AdminDashboard.tsx`
  - `src/pages/UserSupport.tsx`
  - `src/pages/Collaborators.tsx`
  - `src/components/admin/ArchitectureGovernanceDashboard.tsx`
  - `src/components/admin/FunnelDashboard.tsx`
  - `src/components/admin/CombosDashboard.tsx`
  - `src/components/admin/UserManagement.tsx`
  - `src/components/admin/FinancialDashboard.tsx`
  - `src/components/combos/ComboHistoryList.tsx`
  - `src/components/dashboard/WeeklyReportCard.tsx`
  - `src/components/business/IfoodSpreadsheetImportModal.tsx`
  - `src/hooks/useBackupRestore.ts`
  - `src/hooks/useEventTracking.ts`
  - Edge functions com datas visíveis

### Princípio
- **Armazenamento**: continua UTC (padrão)
- **Exibição**: sempre `America/Sao_Paulo`
- **Logs/tracking**: UTC (correto para auditoria)

