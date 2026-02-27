
# Layout Responsivo: Mobile vs Desktop

## Resumo

Adaptar o menu lateral (sidebar) para que no **celular** tenha comportamento diferente do **desktop**:

1. **Esconder a calculadora** no mobile
2. **Trocar o botao "Nova Loja"** por um **seletor de lojas** (StoreSwitcher) no mobile
3. **Manter tudo como esta** no desktop

## Mudancas

### 1. `src/components/layout/AppSidebar.tsx`

**Calculadora**: Envolver o `<FloatingCalculator />` com a classe `hidden lg:block` para que so apareca em telas grandes (desktop).

**Secao da loja**: No mobile, substituir o botao "Nova Loja" / "Upgrade PRO" por um `<StoreSwitcher />` compacto que permite trocar de loja rapidamente. No desktop, manter o comportamento atual.

Logica:
- Importar o hook `useIsMobile` de `src/hooks/use-mobile.tsx`
- Importar o componente `StoreSwitcher`
- Na area abaixo da loja ativa:
  - Se `isMobile`: renderizar o `<StoreSwitcher />` 
  - Se desktop: renderizar o botao "Nova Loja" / "Upgrade PRO" como hoje

### 2. Nenhum outro arquivo precisa ser alterado

O `StoreSwitcher` ja existe e funciona. O hook `useIsMobile` tambem ja existe. Apenas o `AppSidebar.tsx` sera modificado.

## Detalhes Tecnicos

```text
Mobile (< 768px):
+------------------+
| Logo Precify     |
+------------------+
| [Loja icon] Nome |
| Tipo negocio     |
+------------------+
| [StoreSwitcher]  |  <-- troca de loja
+------------------+
| Dashboard        |
| Area do Negocio  |
| ...              |
+------------------+

Desktop (>= 768px):
+------------------+
| Logo Precify     |
+------------------+
| [Loja icon] Nome | [Calc]
| Tipo negocio     |
+------------------+
| [+ Nova Loja]    |  <-- criar loja (PRO)
+------------------+
| Dashboard        |
| ...              |
+------------------+
```

## Arquivo modificado
- `src/components/layout/AppSidebar.tsx`
