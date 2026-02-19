

# Transformar "Meu Plano" em Central de Planos e Pagamentos

## Visao Geral

Transformar a pagina `/app/plan` de uma simples exibicao de plano em uma central completa de transparencia financeira, usando abas para organizar as informacoes. Inspirado nas referencias enviadas, mas adaptado ao Precify.

## Estrutura com Abas

A pagina tera 4 abas principais:

```text
[ Meu Plano ] [ Planos ] [ Pagamentos ] [ Faturas ]
```

### Aba 1 -- Meu Plano (conteudo atual)
Mantem o que ja existe:
- Card do plano atual com status e badge
- Barras de uso (fichas, insumos, IA, combos, importacoes)
- Botao de upgrade (se nao for Pro)
- Gestao de lojas

### Aba 2 -- Planos
Mostra todos os planos disponiveis diretamente na pagina (nao em modal):
- Cards dos 3 planos lado a lado (Teste, Essencial, Pro)
- Plano atual marcado como "Plano atual"
- Botao "Subir de plano" nos superiores
- Tabela de comparacao detalhada abaixo (PlanComparisonTable)
- Tudo visivel sem precisar abrir modal

### Aba 3 -- Pagamentos
Area de pagamentos com estado preparado para integracao futura:
- Sub-abas: Pendentes | Ultimos pagamentos
- Estado vazio elegante informando que o meio de pagamento sera integrado em breve
- Card lateral "Dados da conta" com nome do negocio e email

### Aba 4 -- Faturas
Historico de faturas/cobranças:
- Tabela com colunas: Mes, Periodo, Descricao, Valor, Baixar
- Estado vazio informando que faturas estarao disponiveis apos a integracao do pagamento
- Preparado para receber dados reais quando Stripe for integrado

## Detalhes Tecnicos

### Arquivo principal: `src/pages/MyPlan.tsx`

Refatorar para usar o componente Tabs do Radix (ja instalado):
- Extrair conteudo atual para um componente `PlanOverviewTab`
- Criar `PlansTab` reutilizando logica do `PricingSection` e `PlanComparisonTable`
- Criar `PaymentsTab` com estado placeholder
- Criar `InvoicesTab` com estado placeholder

### Novos componentes (dentro de `src/components/plan/`)

1. **`PlanOverviewTab.tsx`** -- conteudo atual do MyPlan (uso, status, lojas)
2. **`PlansTab.tsx`** -- grid de planos + tabela comparativa completa
3. **`PaymentsTab.tsx`** -- pagamentos pendentes/historico (placeholder)
4. **`InvoicesTab.tsx`** -- faturas (placeholder)

### MyPlan.tsx (reescrita)

Estrutura simplificada com Tabs:
```text
<AppLayout title="Planos e Pagamentos">
  <Tabs defaultValue="overview">
    <TabsList>
      <TabsTrigger value="overview">Meu Plano</TabsTrigger>
      <TabsTrigger value="plans">Planos</TabsTrigger>
      <TabsTrigger value="payments">Pagamentos</TabsTrigger>
      <TabsTrigger value="invoices">Faturas</TabsTrigger>
    </TabsList>
    <TabsContent value="overview"><PlanOverviewTab /></TabsContent>
    <TabsContent value="plans"><PlansTab /></TabsContent>
    <TabsContent value="payments"><PaymentsTab /></TabsContent>
    <TabsContent value="invoices"><InvoicesTab /></TabsContent>
  </Tabs>
</AppLayout>
```

### PlansTab -- Detalhes

- Reutiliza `usePublicPricing` e `PlanComparisonTable`
- Cards com: nome, preco, features, badge "Plano atual" ou botao "Subir de plano"
- Tabela de comparacao visivel por padrao (sem toggle, diferente do modal)
- Botao "Subir de plano" abre o PlanUpgradePrompt ou futuramente redireciona para checkout

### PaymentsTab -- Detalhes

- Duas sub-abas: "Pendentes" e "Ultimos pagamentos"
- Estado vazio com icone e texto: "Nenhum pagamento registrado. O meio de pagamento sera integrado em breve."
- Card lateral com dados da conta (nome do negocio, email)
- Campo "Inserir cupom" com input e botao (ja existe edge function `validate-coupon`)

### InvoicesTab -- Detalhes

- Tabela vazia com headers: Mes, Periodo, Descricao, Valor, Baixar
- Estado vazio: "As faturas estarao disponiveis assim que o meio de pagamento for integrado."

### Arquivos criados/alterados

1. **Criar** `src/components/plan/PlanOverviewTab.tsx`
2. **Criar** `src/components/plan/PlansTab.tsx`
3. **Criar** `src/components/plan/PaymentsTab.tsx`
4. **Criar** `src/components/plan/InvoicesTab.tsx`
5. **Alterar** `src/pages/MyPlan.tsx` -- refatorar para usar Tabs

Nenhuma migration SQL necessaria. Nenhuma edge function alterada.

