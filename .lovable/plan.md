

## Remover "Colaboradores ilimitados" do banco de dados

### Problema
O código carrega os planos do banco de dados (`pricing_plans`), que tem prioridade sobre os dados locais (fallback). O registro do plano PRO no banco ainda contém `"Colaboradores ilimitados"` na coluna `features` (JSON).

### Solucao
Atualizar o campo `features` do plano PRO na tabela `pricing_plans`, removendo o item `"Colaboradores ilimitados"`.

### Detalhes tecnicos

**Migracao SQL**: Atualizar o JSON da coluna `features` do plano `pro` removendo o objeto `{"included": true, "text": "Colaboradores ilimitados"}`. O novo array fica:

```text
[
  {"included": true, "text": "Fichas tecnicas ilimitadas"},
  {"included": true, "text": "Insumos ilimitados"},
  {"included": true, "text": "Dashboard avancado + DRE"},
  {"included": true, "text": "Ate 15 analises de cardapio/mes"},
  {"included": true, "text": "Ate 10 combos estrategicos/mes"},
  {"included": true, "text": "Importacoes ilimitadas"},
  {"included": true, "text": "Ate 3 lojas"},
  {"included": true, "text": "Suporte prioritario via WhatsApp"}
]
```

Nenhuma alteracao de codigo e necessaria -- o problema e exclusivamente no banco de dados.
