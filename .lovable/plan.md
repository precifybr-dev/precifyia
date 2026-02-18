

# Melhorias Recomendadas para o Precify — STATUS

## ✅ 1. Dashboard Duplica Sidebar → RESOLVIDO
Sidebar inline removida (~170 linhas). Dashboard agora usa `<AppSidebar />`.

## ✅ 2. Trial Dinâmico → RESOLVIDO
Badge calcula dias restantes via `profile.created_at + 7 dias`. Oculto para planos pagos.

## ✅ 3. BusinessArea Duplicatas → RESOLVIDO
Removidos card "Regime Tributário" e bloco "Faturamento Mensal" do modo visualização.

## ⏳ 4. Leaked Password Protection → PENDENTE (config de auth)

## ✅ 5. PricingSummaryPanel Refatorado → RESOLVIDO
864 linhas → ~160 linhas orquestradora + 5 subcomponentes:
- `PricingInputsCard`
- `PricingMarginsCard`
- `PricingIfoodCard`
- `PricingPromotionCard`
- `PricingProductionCostCard`
- `PricingProfitCard`
