

## Plano: Auto-gerar Relatório do Dr. Margem ao Abrir a Página

### Problema
O usuário precisa clicar manualmente em "Novo relatório" para ver dados atualizados. O relatório deveria se atualizar automaticamente ao abrir a página.

### Alterações

**`src/pages/DrMargemReports.tsx`**

1. Extrair função `mapReports` e `fetchReportsData` para reutilização
2. Substituir `fetchReports` por `initPage` que:
   - Busca os relatórios existentes
   - Verifica se o mais recente tem mais de 1 hora (`ONE_HOUR = 60 * 60 * 1000`)
   - Se estiver desatualizado ou não existir → chama `generate-weekly-report` silenciosamente (sem toast), depois recarrega
   - Se falhar a geração automática → exibe os dados existentes como fallback
3. O botão "Novo relatório" continua funcionando normalmente com toast de confirmação
4. Durante a geração automática, mostrar o estado `generating` (spinner) para feedback visual

### Detalhes técnicos
- A edge function já busca dados frescos das receitas a cada chamada
- Threshold de 1 hora evita gerar relatórios duplicados em acessos consecutivos
- Geração automática é silenciosa (sem toast), manual mantém toast

