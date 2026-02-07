import { PieChart, Calculator, Package, Receipt, AlertTriangle, TrendingUp } from "lucide-react";

interface TotalProductCostBlockProps {
  fixedCostsTotal: number;
  variableCostsTotal: number;
  businessExpensesPercent: number | null;
  averagePrice: number | null;
  monthlyRevenue?: number | null;
}

export default function TotalProductCostBlock({
  fixedCostsTotal,
  variableCostsTotal,
  businessExpensesPercent,
  averagePrice,
  monthlyRevenue,
}: TotalProductCostBlockProps) {
  const totalProductionCosts = fixedCostsTotal + variableCostsTotal;
  const hasRevenue = monthlyRevenue && monthlyRevenue > 0;
  
  // Calculate production costs as % of monthly revenue (NOT average price)
  const productionCostsPercent = hasRevenue 
    ? (totalProductionCosts / monthlyRevenue) * 100 
    : null;
  
  // Total cost percentage = Production Costs % + Business Expenses %
  const totalCostPercent = productionCostsPercent !== null && businessExpensesPercent !== null
    ? productionCostsPercent + businessExpensesPercent
    : null;

  // If total exceeds 100%, the product is operating at a loss
  const isOverLimit = totalCostPercent !== null && totalCostPercent >= 100;
  const remainingMargin = totalCostPercent !== null ? 100 - totalCostPercent : null;

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
          <h3 className="font-display font-semibold text-lg text-foreground">Custo Total a Abater do Produto</h3>
          <p className="text-sm text-muted-foreground">Percentual do preço consumido para manter o negócio</p>
        </div>
      </div>

      {/* Formula Explanation */}
      <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border">
        <p className="text-xs text-muted-foreground mb-2 font-medium">FÓRMULA:</p>
        <p className="text-sm text-foreground">
          <span className="font-medium text-blue-600">% Custos Produção</span>
          <span className="mx-2">+</span>
          <span className="font-medium text-rose-600">% Despesas Negócio</span>
          <span className="mx-2">=</span>
          <span className="font-medium text-primary">% Custo Total</span>
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Production Costs */}
        <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Package className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Custos Produção</span>
          </div>
          <p className={`font-display text-2xl font-bold ${productionCostsPercent !== null ? 'text-blue-600' : 'text-muted-foreground'}`}>
            {formatPercent(productionCostsPercent)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            R$ {formatCurrency(totalProductionCosts)} / mês
          </p>
        </div>

        {/* Business Expenses */}
        <div className="text-center p-4 bg-rose-500/10 rounded-lg border border-rose-500/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-rose-500" />
            <span className="text-xs text-muted-foreground">Despesas Negócio</span>
          </div>
          <p className={`font-display text-2xl font-bold ${businessExpensesPercent !== null ? 'text-rose-600' : 'text-muted-foreground'}`}>
            {formatPercent(businessExpensesPercent)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            % do faturamento
          </p>
        </div>

        {/* Total */}
        <div className={`text-center p-4 rounded-lg border-2 ${isOverLimit ? 'bg-destructive/10 border-destructive/30' : 'bg-primary/10 border-primary/30'}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <PieChart className={`w-4 h-4 ${isOverLimit ? 'text-destructive' : 'text-primary'}`} />
            <span className="text-xs text-muted-foreground">Total a Abater</span>
          </div>
          <p className={`font-display text-2xl font-bold ${totalCostPercent !== null ? (isOverLimit ? 'text-destructive' : 'text-primary') : 'text-muted-foreground'}`}>
            {formatPercent(totalCostPercent)}
          </p>
          {remainingMargin !== null && (
            <p className={`text-xs mt-1 ${remainingMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
              {remainingMargin >= 0 ? `Margem: ${remainingMargin.toFixed(1)}%` : `Prejuízo: ${Math.abs(remainingMargin).toFixed(1)}%`}
            </p>
          )}
        </div>
      </div>

      {/* Visual Progress */}
      {totalCostPercent !== null && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className={`font-medium ${isOverLimit ? 'text-destructive' : 'text-success'}`}>
              {isOverLimit ? 'Prejuízo no produto' : 'Com margem de lucro'}
            </span>
            <span>100%</span>
          </div>
          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
            {/* 100% marker */}
            <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-foreground/50 z-10" />
            
            {/* Production costs fill */}
            <div 
              className="absolute left-0 top-0 h-full bg-blue-500 transition-all"
              style={{ width: `${Math.min(productionCostsPercent || 0, 100)}%` }}
            />
            
            {/* Business expenses fill (stacked) */}
            <div 
              className="absolute top-0 h-full bg-rose-500 transition-all"
              style={{ 
                left: `${Math.min(productionCostsPercent || 0, 100)}%`,
                width: `${Math.min(businessExpensesPercent || 0, 100 - (productionCostsPercent || 0))}%`
              }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-muted-foreground">Produção</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-rose-500" />
              <span className="text-muted-foreground">Negócio</span>
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
