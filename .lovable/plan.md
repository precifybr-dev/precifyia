
# Corrigir erro ao excluir loja — Foreign Key sem CASCADE

## Problema

Ao tentar excluir uma loja secundaria, o banco de dados retorna o erro:
`update or delete on table "stores" violates foreign key constraint "calculation_history_store_id_fkey"`

Isso acontece porque 5 tabelas possuem foreign keys para `stores` sem `ON DELETE CASCADE`, impedindo a exclusao.

## Tabelas afetadas

| Tabela | Constraint | Status atual |
|---|---|---|
| calculation_history | calculation_history_store_id_fkey | SEM cascade |
| cmv_periodos | cmv_periodos_store_id_fkey | SEM cascade |
| combo_generation_usage | combo_generation_usage_store_id_fkey | SEM cascade |
| combos | combos_store_id_fkey | SEM cascade |
| topo_cardapio_simulacoes | topo_cardapio_simulacoes_store_id_fkey | SEM cascade |

As demais tabelas (recipes, ingredients, fixed_costs, etc.) ja possuem `ON DELETE CASCADE` e funcionam corretamente.

## Solucao

Uma unica migracao SQL que, para cada uma das 5 tabelas:
1. Remove a foreign key existente
2. Recria a mesma foreign key com `ON DELETE CASCADE`

Isso garante que ao excluir uma loja, todos os registros associados nessas tabelas sejam removidos automaticamente pelo banco.

## Secao Tecnica

Migracao SQL a ser executada:

```text
ALTER TABLE calculation_history
  DROP CONSTRAINT calculation_history_store_id_fkey,
  ADD CONSTRAINT calculation_history_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE cmv_periodos
  DROP CONSTRAINT cmv_periodos_store_id_fkey,
  ADD CONSTRAINT cmv_periodos_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE combo_generation_usage
  DROP CONSTRAINT combo_generation_usage_store_id_fkey,
  ADD CONSTRAINT combo_generation_usage_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE combos
  DROP CONSTRAINT combos_store_id_fkey,
  ADD CONSTRAINT combos_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE topo_cardapio_simulacoes
  DROP CONSTRAINT topo_cardapio_simulacoes_store_id_fkey,
  ADD CONSTRAINT topo_cardapio_simulacoes_store_id_fkey
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
```

Nenhum arquivo de codigo precisa ser alterado — o problema e exclusivamente no banco de dados.
