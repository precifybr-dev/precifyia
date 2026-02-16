

# Corrigir trigger que bloqueia exclusao de loja

## Problema

A tabela `calculation_history` possui um trigger chamado `immutable_calculation_history` que bloqueia **todo** DELETE e UPDATE, com a mensagem:
*"Registros de calculo historico sao imutaveis e nao podem ser alterados ou excluidos."*

Quando o `ON DELETE CASCADE` tenta remover os registros vinculados a loja sendo excluida, esse trigger impede a operacao.

## Solucao

Alterar o trigger para bloquear apenas **UPDATE** (manter a imutabilidade dos dados), mas **permitir DELETE** (necessario para o CASCADE funcionar quando uma loja e removida).

## Secao Tecnica

Uma unica migracao SQL:

```text
CREATE OR REPLACE FUNCTION prevent_calculation_history_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Registros de calculo historico sao imutaveis e nao podem ser alterados.';
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS immutable_calculation_history ON calculation_history;

CREATE TRIGGER immutable_calculation_history
  BEFORE UPDATE ON calculation_history
  FOR EACH ROW
  EXECUTE FUNCTION prevent_calculation_history_modification();
```

Isso mantem a regra de negocio (historico nao pode ser editado) e permite que o CASCADE remova os registros quando a loja e excluida.

Nenhum arquivo de codigo precisa ser alterado.
