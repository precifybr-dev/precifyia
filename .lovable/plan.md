

# Plano: Telas de Gestao de Cupons e Afiliados

## Resumo

Criar as telas de administracao no painel admin para gerenciar cupons, afiliados e comissoes. O modulo sera integrado como uma nova aba no AdminDashboard e um novo item no menu lateral.

## O que sera criado

### 1. Nova aba "Cupons & Afiliados" no Admin Dashboard

Uma nova secao com 3 sub-abas internas:

- **Cupons**: Listagem, criacao, edicao e desativacao de cupons. Filtros por tipo (influencer, trial, interno) e status. Exibe codigo, desconto, usos, validade.
- **Afiliados**: Listagem de afiliados com status, taxa de comissao, saldo pendente/pago. Acoes para aprovar/bloquear afiliados.
- **Comissoes**: Visao do ledger financeiro. Filtros por status (pending, eligible, approved, paid). Acoes em lote para avancar status. Historico de saques.

### 2. Atualizacao do menu lateral (AdminLayout)

Adicionar item "Cupons & Afiliados" com icone `Ticket` na navegacao, apontando para a secao `affiliates` do dashboard.

### 3. Nova aba no TabsList do AdminDashboard

Adicionar `TabsTrigger` com valor `affiliates` e o componente `AffiliatesDashboard` no `TabsContent`.

## Detalhes Tecnicos

### Arquivos novos
- `src/components/admin/AffiliatesDashboard.tsx` - Componente principal com sub-abas (Cupons, Afiliados, Comissoes)
- `src/hooks/useAffiliatesAdmin.ts` - Hook para buscar dados das tabelas `coupons`, `affiliates`, `commissions`, `coupon_uses`

### Arquivos modificados
- `src/components/admin/AdminLayout.tsx` - Adicionar item de menu `{ id: "affiliates", label: "Cupons & Afiliados", icon: Ticket, section: "affiliates", permission: "view_financials" }`
- `src/pages/AdminDashboard.tsx` - Adicionar TabsTrigger e TabsContent para a secao `affiliates`

### Funcionalidades da tela de Cupons
- Tabela com colunas: Codigo, Tipo, Desconto, Usos (atual/max), Validade, Status
- Botao "Novo Cupom" com formulario modal (codigo, tipo, desconto %, trial extra dias, max usos, data expiracao, affiliate vinculado)
- Toggle para ativar/desativar cupons
- KPIs: Total de cupons ativos, Total de usos, Cupons expirados

### Funcionalidades da tela de Afiliados
- Tabela: Nome/Email, Status, Taxa Comissao, Total Ganho, Pendente, Pago
- Acoes: Aprovar, Suspender, Editar taxa
- KPIs: Total afiliados ativos, Comissoes pendentes (R$), Comissoes pagas (R$)

### Funcionalidades da tela de Comissoes
- Tabela: Afiliado, Cliente, Mes, Valor, Status
- Filtros por status e por afiliado
- Acoes em lote: "Avancar para Eligible", "Aprovar selecionados"
- Chama a Edge Function `process-commissions` para acoes de status
- KPIs: Total pendente, Total eligible, Total aprovado, Total pago

### Seguranca
- Permissao `view_financials` para acessar a secao
- Todas as mutacoes de status passam pela Edge Function `process-commissions` (nunca direto no banco pelo cliente)
- Criacao/edicao de cupons via query direta (permitido pela RLS para master)

