

# Corrigir Bloqueio do Cardapio + Ajustar Limites do Menu Performance Score

## Problema

O modo `full_menu` (espelho do cardapio) esta sendo bloqueado pelo `check_and_increment_usage` na Edge Function `parse-ifood-menu`. Esse check roda ANTES de ler o `importType` do body, entao qualquer request -- seja cardapio ou importacao -- consome a quota de `ifood_import`.

Alem disso, os limites do **Menu Performance Score** (feature `menu_analysis`) estao incorretos no banco:
- Free: 1 (correto, mas precisa ser UNICO, nao mensal)
- Basic: 3 (precisa ser 5/mes)
- Pro: ilimitado (precisa ser 10/mes)

## Mudancas

### 1. Edge Function `parse-ifood-menu/index.ts` -- Liberar full_menu

- Mover a leitura do `rawBody` (linha 461) para ANTES do bloco de usage check (linha 435)
- Envolver o `check_and_increment_usage` em condicao: so executar se `importType !== "full_menu"`
- Melhorar mensagem de erro quando bloqueado: "Voce ja atingiu o limite de importacoes do seu plano. Faca upgrade para continuar importando."

### 2. Banco de dados -- Atualizar limites de `menu_analysis`

Atualizar a tabela `plan_features`:
- **Free**: `usage_limit = 1` (manter, mas a logica precisa tratar como uso unico/vitalicio)
- **Basic**: `usage_limit = 5` (era 3)
- **Pro**: `usage_limit = 10` (era NULL/ilimitado)

### 3. Banco de dados -- Logica de uso unico para Free

O `check_and_increment_usage` atual conta usos no mes corrente (`date_trunc('month', now())`). Para o plano Free, a analise deve ser de uso UNICO (vitalicio, nao reseta no mes). Criar uma funcao alternativa ou ajustar a existente para que, quando `plan = 'free'`, o count ignore a janela mensal e conte TODOS os usos historicos.

### 4. Edge Function `analyze-menu-performance/index.ts` -- Melhorar mensagem de erro

Quando o limite for atingido, retornar mensagem clara:
- Free: "Voce ja usou sua analise gratuita. Faca upgrade para o plano Basico ou Pro para continuar analisando seu cardapio."
- Basic/Pro: "Voce atingiu o limite de X analises este mes. Suas analises serao renovadas no proximo mes."

### 5. Frontend `useMenuMirror.ts` -- Tratar erro 403 com mensagem amigavel

No `analyzeMenu`, detectar `upgrade_required` na resposta e mostrar toast com mensagem clara ao inves de erro generico.

## Secao Tecnica

### Mudanca no `parse-ifood-menu/index.ts`

Reordenar linhas 435-465:

```text
// ANTES (bugado):
1. check_and_increment_usage (bloqueia tudo)
2. ler body (importType)

// DEPOIS (corrigido):
1. ler body (importType)
2. SE importType != "full_menu" → check_and_increment_usage
```

### SQL Migration

```sql
-- Atualizar limites do menu_analysis
UPDATE plan_features SET usage_limit = 5 WHERE feature = 'menu_analysis' AND plan = 'basic';
UPDATE plan_features SET usage_limit = 10 WHERE feature = 'menu_analysis' AND plan = 'pro';
```

### Ajuste na funcao `check_and_increment_usage`

Adicionar logica condicional: se o plano for `free`, contar usos desde SEMPRE (sem `>= v_start_of_month`), tornando o limite vitalicio.

```sql
-- Trecho modificado dentro da funcao:
IF v_plan = 'free' THEN
  SELECT count(*) INTO v_count
  FROM strategic_usage_logs
  WHERE user_id = _user_id AND endpoint = _endpoint;
ELSE
  SELECT count(*) INTO v_count
  FROM strategic_usage_logs
  WHERE user_id = _user_id AND endpoint = _endpoint
    AND created_at >= v_start_of_month;
END IF;
```

### Frontend `useMenuMirror.ts` -- analyzeMenu

Tratar resposta com `upgrade_required`:

```typescript
if (data?.upgrade_required) {
  toast({
    title: "Limite atingido",
    description: data.error || "Faca upgrade para continuar.",
    variant: "destructive",
  });
  return;
}
```

## Arquivos Modificados

1. `supabase/functions/parse-ifood-menu/index.ts` -- reordenar body parse, condicionar usage check
2. `supabase/functions/analyze-menu-performance/index.ts` -- melhorar mensagens de erro
3. `src/hooks/useMenuMirror.ts` -- tratar erro 403 com mensagem amigavel
4. Migration SQL -- atualizar `plan_features` e ajustar `check_and_increment_usage`

