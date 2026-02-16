

# Onboarding Interativo - Configuracao Inicial Guiada

## Objetivo

Transformar o primeiro passo do onboarding (atualmente um formulario unico) em um wizard conversacional de micro-etapas. O usuario responde uma pergunta por vez, de forma limpa e intuitiva, e o sistema preenche automaticamente a Area de Negocio com esses dados.

## O que sera perguntado (apenas dados basicos)

1. **Nome do negocio** - "Como se chama o seu negocio?"
2. **Tipo de negocio** - "Que tipo de negocio voce tem?" (cards visuais clicaveis)
3. **Vende no iFood?** - Sim/Nao
   - Se SIM: "Qual o plano?" (Entrega Propria / Entrega iFood)
   - Se SIM: "Quantos pedidos por mes?" + "Qual o ticket medio?"
4. **Faturamento mensal** - "Qual seu faturamento medio mensal?" (com opcao "Nao sei ainda")
5. **CMV desejado** - "Qual CMV voce deseja alcancar?" (com explicacao simples e valor padrao 30%)
6. **Como conheceu o Precify?** - Selecao rapida
7. **Importacao de dados** - Tela final oferecendo:
   - Importar insumos da planilha
   - Importar cardapio do iFood
   - Ou pular e fazer depois

## O que NAO sera perguntado

- Impostos e taxas financeiras
- Custos de producao (rateio)
- Despesas fixas e variaveis
- Regime tributario (sera movido para a Area de Negocio)

## Experiencia do Usuario

- Uma pergunta por tela (ou agrupamento logico minimo)
- Transicao suave entre perguntas (animacao slide)
- Barra de progresso sutil no topo
- Botao "Pular" discreto em perguntas opcionais
- Tom conversacional e acolhedor ("Otimo! Agora me conta...")
- Sem poluicao visual - fundo limpo, foco total na pergunta

## Secao Tecnica

### Arquivos Modificados

1. **`src/hooks/useOnboarding.ts`**
   - Expandir `OnboardingStep` para incluir sub-etapas do wizard: `"welcome" | "business_name" | "business_type" | "ifood_check" | "ifood_details" | "revenue" | "cmv" | "referral" | "import_data" | "ingredients" | "recipe" | "completed"`
   - Ou manter as 3 etapas macro e gerenciar sub-etapas internamente no componente

2. **`src/components/onboarding/BusinessConfigStep.tsx`** (reescrever)
   - Substituir o formulario unico por um wizard interno com estado `subStep`
   - Cada sub-etapa renderiza um card centralizado com a pergunta atual
   - Ao concluir todas as sub-etapas, salva tudo no profile e cria a loja

3. **`src/components/onboarding/OnboardingStepper.tsx`**
   - Adaptar para mostrar progresso mais granular (barra de progresso em vez de 3 bolinhas)

4. **`src/pages/Onboarding.tsx`**
   - Ajustes minimos de layout para acomodar o novo wizard

### Fluxo de Sub-etapas dentro do BusinessConfigStep

```text
[Boas-vindas] 
    |
[Nome do negocio] -- input texto
    |
[Tipo de negocio] -- cards visuais clicaveis
    |
[Vende no iFood?] -- Sim / Nao
    |-- Sim --> [Plano iFood] + [Pedidos/Ticket]
    |-- Nao --> pula
    |
[Faturamento mensal] -- input com opcao "Nao sei"
    |
[CMV desejado] -- slider ou input com explicacao
    |
[Como conheceu?] -- selecao rapida
    |
[Importar dados?] -- 3 opcoes visuais
    |-- Planilha --> abre SpreadsheetImportModal
    |-- iFood --> redireciona para import iFood
    |-- Pular --> avanca
```

### Dados salvos no banco

Todos os dados coletados serao persistidos no `profiles` e na tabela `stores`:

- `profiles.business_name`
- `profiles.business_type`
- `profiles.default_cmv`
- `profiles.monthly_revenue`
- `profiles.referral_source`
- `profiles.ifood_plan_type`
- `profiles.ifood_base_rate`
- `profiles.ifood_monthly_orders`
- `profiles.ifood_average_ticket`
- `stores` (criacao da loja padrao com nome e tipo)

### Design dos Cards de Pergunta

Cada sub-etapa segue o padrao:

- Emoji ou icone no topo
- Titulo conversacional (ex: "Como se chama o seu negocio?")
- Subtitulo explicativo curto
- Campo de entrada (input, cards, toggle)
- Botao "Continuar" (primario)
- Link "Pular" (discreto, para opcionais)
- Animacao `animate-in fade-in slide-in-from-bottom` na transicao

### Logica Condicional

- Se usuario responde "Nao" para iFood, pula direto para faturamento
- Se usuario clica "Nao sei" no faturamento, salva null e segue
- Na etapa de importacao, se usuario importa da planilha, ao fechar o modal avanca para o step de ingredients ja com dados preenchidos

