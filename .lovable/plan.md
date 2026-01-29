
## Problema Identificado

O componente `IngredientsStep.tsx` (usado no Onboarding) está falhando ao adicionar insumos com o erro:

```
duplicate key value violates unique constraint "ingredients_user_id_code_key"
```

### Causa Raiz

1. A tabela `ingredients` tem a constraint `UNIQUE (user_id, code)` - ou seja, cada usuário deve ter códigos únicos
2. O campo `code` tem um default `nextval('ingredients_code_seq')` que é uma **sequência global** (compartilhada entre todos os usuários)
3. O componente `IngredientsStep.tsx` **não fornece o campo `code`** no INSERT, dependendo da sequence global
4. Quando o usuário já tem insumos (de outra loja, por exemplo), a sequence pode retornar um número que já existe para aquele `user_id`, causando violação da constraint

### Diferença entre os componentes

| Componente | Calcula código? | Funciona? |
|------------|-----------------|-----------|
| `Ingredients.tsx` (página principal) | Sim, calcula globalmente por usuário | Sim |
| `IngredientsStep.tsx` (onboarding) | Não, usa sequence global | **Não** |

---

## Plano de Correção

### Alterações no arquivo `src/components/onboarding/IngredientsStep.tsx`

**1. Adicionar função para obter próximo código**

Criar uma helper function que busca o maior código do usuário e retorna o próximo disponível:

```typescript
const getNextCode = async (userId: string): Promise<number> => {
  const { data } = await supabase
    .from("ingredients")
    .select("code")
    .eq("user_id", userId)
    .order("code", { ascending: false })
    .limit(1);
  
  return (data && data.length > 0 ? data[0].code : 0) + 1;
};
```

**2. Modificar função `handleAddIngredient`**

Atualizar para calcular e incluir o `code` no INSERT:

```typescript
const handleAddIngredient = async () => {
  // ... validações existentes ...

  setIsSaving(true);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    // Calcular próximo código disponível para o usuário
    const nextCode = await getNextCode(user.id);

    const { data, error } = await supabase
      .from("ingredients")
      .insert({
        user_id: user.id,
        code: nextCode, // <-- NOVO: incluir código calculado
        name: newIngredient.name.trim(),
        unit: newIngredient.unit,
        purchase_quantity: purchaseQty,
        purchase_price: purchasePrice,
        correction_factor: parseFloat(newIngredient.correction_factor) || 1,
      })
      .select()
      .single();

    if (error) throw error;
    // ... resto do código ...
  }
};
```

**3. Adicionar retry para colisões (robustez extra)**

Implementar tratamento de erro 23505 com retry automático, igual foi feito no `Ingredients.tsx`:

```typescript
if (error) {
  // Se for erro de unicidade, tentar novamente com código atualizado
  if (error.code === "23505" || error.message?.includes("duplicate key")) {
    const freshCode = await getNextCode(user.id);
    const { data: retryData, error: retryError } = await supabase
      .from("ingredients")
      .insert({ ...ingredientData, code: freshCode })
      .select()
      .single();
    
    if (retryError) throw retryError;
    // Usar retryData...
  } else {
    throw error;
  }
}
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/onboarding/IngredientsStep.tsx` | Adicionar cálculo de código global por usuário + retry em caso de colisão |

---

## Validação

Após a implementação, testar:
1. Acessar o fluxo de onboarding e adicionar um insumo
2. Verificar que o insumo é salvo sem erro
3. Adicionar múltiplos insumos em sequência
4. Confirmar que os códigos são sequenciais e únicos
