

## Remover "Colaboradores ilimitados" do plano PRO no banco de dados

### Problema
A coluna `features` (JSONB) do plano PRO na tabela `pricing_plans` ainda contém o item `"Colaboradores ilimitados"`. Como o frontend prioriza os dados do banco sobre os fallbacks locais, esse texto continua aparecendo para o usuario.

### Solucao
Executar um UPDATE na tabela `pricing_plans` para remover o item `"Colaboradores ilimitados"` do array JSON, mantendo todos os demais itens intactos.

### Detalhes tecnicos

Sera executado o seguinte UPDATE via ferramenta de insercao/atualizacao de dados:

```text
UPDATE pricing_plans 
SET features = '[
  {"included": true, "text": "Fichas técnicas ilimitadas"},
  {"included": true, "text": "Insumos ilimitados"},
  {"included": true, "text": "Dashboard avançado + DRE"},
  {"included": true, "text": "Até 15 análises de cardápio/mês"},
  {"included": true, "text": "Até 10 combos estratégicos/mês"},
  {"included": true, "text": "Importações ilimitadas"},
  {"included": true, "text": "Até 3 lojas"},
  {"included": true, "text": "Suporte prioritário via WhatsApp"}
]'::jsonb
WHERE id = 'pro';
```

Nenhuma alteracao de codigo e necessaria -- o problema e exclusivamente no banco de dados.
