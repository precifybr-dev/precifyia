
# Exibir plano do usuario na sidebar e criar pagina "Meu Plano"

## Resumo

Tres mudancas:
1. Mostrar o plano atual do usuario no perfil da sidebar, com botao "Fazer upgrade" para planos Free e Essencial
2. Adicionar item "Meu Plano" no menu popover do usuario (entre Lixeira e Backup)
3. Criar pagina `/app/plan` com mini dashboard do plano: limites, uso atual e proximo vencimento

## O que muda para o usuario

- Na sidebar, abaixo do nome do usuario, aparece uma badge com o nome do plano (ex: "Plano Teste", "Plano Essencial", "Plano Pro")
- Para planos Free e Essencial, ao lado da badge aparece um botao "Fazer upgrade" que abre o PlanUpgradePrompt
- No menu popover (clicando no perfil), entre "Lixeira" e "Backup", aparece o item "Meu Plano" com icone de coroa
- A pagina "Meu Plano" mostra:
  - Nome do plano atual com badge colorida
  - Data do proximo vencimento (campo `subscription_expires_at` do profiles)
  - Cards de uso: fichas tecnicas, insumos, analises de cardapio, combos, importacoes -- cada um com barra de progresso mostrando "X de Y usados"
  - Botao de upgrade (para Free e Essencial)

## Secao Tecnica

### Arquivo 1: `src/components/layout/AppSidebar.tsx`

No bloco do perfil do usuario (linhas 195-208), adicionar:
- Importar `Crown` e `Badge` (Crown ja importado)
- Abaixo do email do usuario (`<p className="text-xs ...">`) adicionar uma linha com badge do plano:
  - Free: badge cinza "Plano Teste"
  - Basic: badge azul "Plano Essencial"  
  - Pro: badge dourada "Plano Pro"
- Para Free e Basic, ao lado da badge, texto clicavel "Upgrade" que abre o PlanUpgradePrompt
- Usar `userPlan` que ja vem do `useStore()`

No popover do usuario (linhas 210-238), adicionar entre o botao "Lixeira" e "Backup":
- Novo botao "Meu Plano" com icone `Crown`, navegando para `/app/plan`

Estado adicional:
- `const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);`
- Renderizar `<PlanUpgradePrompt>` no final do componente

### Arquivo 2: `src/pages/MyPlan.tsx` (novo)

Nova pagina com `AppLayout` wrapper contendo:
- Titulo: "Meu Plano"
- Card principal com nome do plano, status da assinatura e data de vencimento
- Grid de cards de uso (cada recurso com barra de progresso):
  - Fichas tecnicas: conta de `recipes` do usuario vs limite do plano
  - Insumos: conta de `ingredients` do usuario vs limite
  - Analises de cardapio: conta de `strategic_usage_logs` (endpoint `analyze-menu-performance`) vs limite
  - Combos estrategicos: conta de `strategic_usage_logs` (endpoint `generate-combo`) vs limite
  - Importacoes de planilha: conta de `strategic_usage_logs` (endpoint `analyze-spreadsheet-columns`) vs limite
- Para contagem mensal (basic/pro), filtra pelo mes atual
- Para free, contagem vitalicia
- Botao "Fazer Upgrade" no rodape (para Free e Essencial)
- Nota: "Limites sao por conta, independente do numero de lojas"

Dados carregados:
- `profiles` -> `user_plan`, `subscription_status`, `subscription_expires_at`
- `plan_features` -> limites de cada recurso
- `recipes` -> count
- `ingredients` -> count  
- `strategic_usage_logs` -> count por endpoint

### Arquivo 3: `src/App.tsx`

Adicionar rota:
```text
/app/plan -> <AppRoute><MyPlan /></AppRoute>
```

Importar `MyPlan` de `./pages/MyPlan`

### Mapeamento de dados do plano

| Recurso | Feature key (plan_features) | Tabela de contagem | Filtro |
|---|---|---|---|
| Fichas tecnicas | recipes | recipes (count) | user_id |
| Insumos | ingredients | ingredients (count) | user_id via store |
| Analise cardapio | analyze-menu | strategic_usage_logs | endpoint = analyze-menu-performance |
| Combos IA | generate-combo | strategic_usage_logs | endpoint = generate-combo |
| Import planilha | spreadsheet-import | strategic_usage_logs | endpoint = analyze-spreadsheet-columns |

### Labels dos planos

| Plano | Label | Cor da badge |
|---|---|---|
| free | Plano Teste | Cinza (secondary) |
| basic | Plano Essencial | Azul (default) |
| pro | Plano Pro | Dourada (outline com bg-yellow) |

### Vencimento

- Exibir `subscription_expires_at` formatado com `date-fns` no formato "dd/MM/yyyy"
- Se nulo ou plano free: "Sem vencimento (plano gratuito)"
- Se `subscription_status === "active"`: "Ativo - Renova em dd/MM/yyyy"
- Se `subscription_status === "canceled"`: "Cancelado - Expira em dd/MM/yyyy"
