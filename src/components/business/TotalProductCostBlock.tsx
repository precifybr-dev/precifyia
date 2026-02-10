import { Calculator, Package, AlertTriangle, TrendingUp, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TotalProductCostBlockProps {
  fixedCostsTotal: number;
  variableCostsTotal: number;
  monthlyRevenue?: number | null;
}

export default function TotalProductCostBlock({
  fixedCostsTotal,
  variableCostsTotal,
  monthlyRevenue,
}: TotalProductCostBlockProps) {
  const totalProductionCosts = fixedCostsTotal + variableCostsTotal;
  const hasRevenue = monthlyRevenue && monthlyRevenue > 0;
  
  const productionCostsPercent = hasRevenue 
    ? (totalProductionCosts / monthlyRevenue) * 100 
    : null;
  
  const isOverLimit = productionCostsPercent !== null && productionCostsPercent >= 100;
  const remainingMargin = productionCostsPercent !== null ? 100 - productionCostsPercent : null;

  const formatPercent = (value: number | null) => {
    if (value === null) return "—";
    return `${value.toFixed(2)}%`;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className={`bg-card rounded-xl border p-6 shadow-card transition-colors ${isOverLimit ? 'border-destructive/50 bg-destructive/5' : 'border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOverLimit ? 'bg-destructive/10' : 'bg-primary/10'}`}>
          {isOverLimit ? (
            <AlertTriangle className="w-5 h-5 text-destructive" />
          ) : (
            <Calculator className="w-5 h-5 text-primary" />
          )}
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">Custos de Produção (Rateio)</h3>
          <p className="text-sm text-muted-foreground">Percentual do faturamento aplicado sobre cada produto</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="w-5 h-5 text-yellow-500/70 cursor-help flex-shrink-0" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[320px] text-xs">
              <p className="font-semibold mb-1">Custos de produção do negócio</p>
              <p>Este percentual mostra quanto do faturamento mensal médio do seu negócio é usado para pagar os custos de produção.</p>
              <p className="mt-1">Ele é uma média geral do mês e serve como base para o cálculo dos produtos.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Metrics Grid - 2 columns */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Production Costs */}
        <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Custos Produção</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            R$ {formatCurrency(totalProductionCosts)} / mês
          </p>
        </div>

        {/* Total % */}
        <div className={`text-center p-4 rounded-lg border-2 ${isOverLimit ? 'bg-destructive/10 border-destructive/30' : 'bg-primary/10 border-primary/30'}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Calculator className={`w-4 h-4 ${isOverLimit ? 'text-destructive' : 'text-primary'}`} />
            <span className="text-xs text-muted-foreground">% do Faturamento</span>
          </div>
          <p className={`font-display text-2xl font-bold ${productionCostsPercent !== null ? (isOverLimit ? 'text-destructive' : 'text-primary') : 'text-muted-foreground'}`}>
            {formatPercent(productionCostsPercent)}
          </p>
          {remainingMargin !== null && (
            <p className={`text-xs mt-1 ${remainingMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
              {remainingMargin >= 0 ? `Margem: ${remainingMargin.toFixed(1)}%` : `Prejuízo: ${Math.abs(remainingMargin).toFixed(1)}%`}
            </p>
          )}
        </div>
      </div>

      {/* Visual Progress - simple single color */}
      {productionCostsPercent !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className={`font-medium ${isOverLimit ? 'text-destructive' : 'text-success'}`}>
              {isOverLimit ? 'Acima do faturamento' : 'Dentro do faturamento'}
            </span>
            <span>100%</span>
          </div>
          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
            <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-foreground/50 z-10" />
            <div 
              className={`absolute left-0 top-0 h-full transition-all ${isOverLimit ? 'bg-destructive' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(productionCostsPercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-muted-foreground">Custos de Produção</span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <TrendingUp className="w-3 h-3 text-success" />
              <span className="text-muted-foreground">Margem</span>
            </div>
          </div>
        </div>
      )}

      {/* Info messages */}
      {!hasRevenue && (
        <p className="text-xs text-muted-foreground mt-4 text-center p-3 bg-muted/50 rounded-lg">
          Informe o faturamento mensal para calcular o percentual de custos de produção
        </p>
      )}
      
      {hasRevenue && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Baseado no faturamento mensal de R$ {formatCurrency(monthlyRevenue)}
        </p>
      )}
    </div>
  );
}
