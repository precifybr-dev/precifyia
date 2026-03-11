

# Validacao Matematica e Guards Anti-Erro na Importacao iFood

## Contexto

O processador (`ifood-spreadsheet-processor.ts`) ja agrupa corretamente por ID unico do pedido (campo `pedido_associado_ifood_curto`) e consolida linhas do mesmo pedido antes de contar. A logica de per-order accumulators esta implementada.

O que falta sao **validacoes matematicas pos-processamento** para detectar erros estruturais e alertar o usuario antes de aplicar dados inconsistentes.

---

## O que sera implementado

### 1. Camada de Validacao no Processador

Adicionar ao `ifood-spreadsheet-processor.ts` uma interface `ValidationWarning` e uma funcao `validateConsolidation()` que roda apos o processamento e retorna alertas:

- **Validacao 1 -- Cupom vs Bruto**: Se `totalCupons > 40% do faturamentoBruto`, sinalizar erro critico
- **Validacao 2 -- Pedidos vs Linhas**: Se `totalPedidos === totalLinhas`, avisar que nao houve agrupamento
- **Validacao 3 -- Percentual iFood**: Se `percentualRealIfood > 60%`, provavel erro de consolidacao
- **Validacao 4 -- Ticket medio plausivel**: Se ticket medio for maior que o maior valor individual x2, possivel duplicacao
- **Validacao 5 -- Reconciliacao basica**: Verificar se `bruto - comissao - taxa - cupomLoja ~= liquido` dentro de margem de 5%

Cada validacao retorna `{ level: "error" | "warning", message: string }`.

A funcao `processIfoodSpreadsheet` passara a retornar tambem `totalLinhas` (numero de linhas brutas antes do agrupamento) e `warnings: ValidationWarning[]`.

### 2. Exibicao de Alertas no Dashboard

No `IfoodSpreadsheetImportModal.tsx`, apos o dashboard renderizar:

- Se houver warnings do tipo `error`, mostrar bloco vermelho com icone de alerta e a mensagem
- Se houver warnings do tipo `warning`, mostrar bloco amarelo informativo
- Se houver erro critico, desabilitar o botao "Aplicar ao Plano" e sugerir reimportacao
- Adicionar indicador visual mostrando "250 linhas agrupadas em 113 pedidos" para transparencia

### 3. Info de Agrupamento no Dashboard

Adicionar um pequeno badge/info no topo do dashboard mostrando:
- Linhas na planilha: X
- Pedidos unicos: Y
- Media de linhas por pedido: X/Y

Isso da confianca ao usuario de que o agrupamento esta correto.

---

## Arquivos modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/lib/ifood-spreadsheet-processor.ts` | Adicionar `ValidationWarning[]`, campo `totalLinhas`, funcao de validacao |
| `src/components/business/IfoodSpreadsheetImportModal.tsx` | Renderizar warnings, badge de agrupamento, bloquear aplicacao se erro critico |

## O que NAO sera alterado

- Banco de dados (sem migrations)
- Logica de agrupamento por ID (ja funciona corretamente)
- Fluxo de autenticacao
- Nenhuma outra funcionalidade do sistema

