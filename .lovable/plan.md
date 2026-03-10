

## Plano: Texto explicativo no Custo Extra + Persistir última importação

### Problema 1: Custo Extra sem explicação
O card "Custo Extra Real do iFood" confunde o usuário porque o valor muda ao trocar entre plano 12% e 23% sem explicação visível.

**Solução:** Adicionar texto explicativo abaixo do resultado do custo extra, explicando que o custo total pago ao iFood é fixo e o "extra" é a diferença em relação à taxa base do plano selecionado. Quanto maior a taxa base, menor o "extra".

### Problema 2: Dados da última importação incompletos
A função `loadLastImport` carrega de `ifood_import_logs`, que não possui campos essenciais como `taxasEComissoes` e `servicosEPromocoes`. Isso faz o card de Custo Extra mostrar valores zerados ao reabrir o modal.

**Solução:** Alterar `loadLastImport` para carregar da tabela `ifood_monthly_metrics` (que tem todos os campos), mapeando corretamente todos os campos do `IfoodConsolidation`, incluindo:
- `taxas_comissoes_total` → `taxasEComissoes`
- `servicos_promocoes_total` → `servicosEPromocoes`
- `entrega_ifood_custo_total` → `totalDeliveryCost`
- `anuncios_total` → `totalAnuncios`
- `pedidos_com_cupom_total`, `pedidos_sem_cupom_total`, etc.
- `custo_extra_total`, `custo_extra_percentual`

### Alterações em `src/components/business/IfoodSpreadsheetImportModal.tsx`

1. **`loadLastImport`**: Trocar query de `ifood_import_logs` para `ifood_monthly_metrics` com `order("updated_at", desc).limit(1)`. Mapear todos os campos disponíveis para o objeto `IfoodConsolidation`.

2. **Card "Custo Extra Real"** (linhas ~745): Adicionar após o valor do custo extra um bloco explicativo:
   ```
   "O custo total pago ao iFood é fixo (R$ X). O 'custo extra' é quanto 
   você paga além da taxa base do plano selecionado. No plano de 12%, 
   a base é menor, então o extra parece maior. No de 23%, a base já 
   cobre mais do total."
   ```

### Arquivo editado
- `src/components/business/IfoodSpreadsheetImportModal.tsx`

