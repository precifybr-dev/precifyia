
# Corrigir contador de lojas e layout mobile dos numeros

## Problema 1: Contador 3/3 apos exclusao

O banco de dados ainda contem 3 lojas para o usuario porque as exclusoes anteriores falhavam (trigger bloqueava CASCADE). Agora que o trigger foi corrigido, a exclusao funciona, mas o sidebar so exibe o contador `(3/3)` quando `canCreateStore` e falso (ou seja, ja no limite). A logica ja e reativa -- ao excluir com sucesso, `stores.length` diminui e o botao volta a funcionar.

Porem, ha um problema sutil: o botao "Nova Loja" no sidebar fica **totalmente desabilitado** quando `!canCreateStore`, sem oferecer feedback claro sobre o que fazer. Vou adicionar uma melhoria: sempre mostrar o contador `(atual/max)` para dar transparencia, e garantir que apos exclusao o estado atualize corretamente.

## Problema 2: Numeros sobrepostos no mobile

Os 3 cards de resumo (Total Anual, Media Mensal, Projecao Anual) usam `grid-cols-3` fixo com `text-xl` para valores monetarios grandes como "R$ 180.000,00". Em telas pequenas, os valores ultrapassam o limite do card.

---

## Solucao

### Arquivo 1: `src/components/layout/AppSidebar.tsx`
- Sempre exibir o contador `(storeCount/maxStores)` no botao "Nova Loja", nao apenas quando no limite
- Isso da transparencia ao usuario sobre quantas lojas restam

### Arquivo 2: `src/components/business/MonthlyRevenueBlock.tsx`
- Trocar `grid-cols-3` por `grid-cols-1 sm:grid-cols-3` nos summary cards
- Reduzir o tamanho da fonte dos valores de `text-xl` para `text-base sm:text-xl`
- Adicionar `truncate` ou `text-ellipsis overflow-hidden` nos valores para evitar sobreposicao
- Reduzir o padding em telas pequenas

### Arquivo 3: `src/components/store/StoreSwitcher.tsx`
- Mesma correcao no contador: sempre mostrar `(storeCount/maxStores)`

## Secao Tecnica

**AppSidebar.tsx (linha 145):**
Antes: so mostra contador quando `!canCreateStore`
Depois: sempre mostra `(storeCount/maxStores)` ao lado do botao

**MonthlyRevenueBlock.tsx (linhas 230-277):**
Alterar o grid dos summary cards:
```text
grid grid-cols-3 gap-3
-->
grid grid-cols-1 sm:grid-cols-3 gap-3
```

Alterar o tamanho da fonte dos valores:
```text
text-xl font-bold
-->
text-base sm:text-xl font-bold truncate
```

**StoreSwitcher.tsx:** Atualizar label do contador para ser consistente.
