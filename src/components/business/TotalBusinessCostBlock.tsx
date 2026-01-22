import { PieChart, TrendingDown, Receipt, Calculator } from "lucide-react";

interface TotalBusinessCostBlockProps {
  fixedExpensesTotal: number;
  variableExpensesTotal: number;
  monthlyRevenue: number | null;
}

export default function TotalBusinessCostBlock({
  fixedExpensesTotal,
  variableExpensesTotal,
  monthlyRevenue,
}: TotalBusinessCostBlockProps) {
  const hasRevenue = monthlyRevenue && monthlyRevenue > 0;
  
  const fixedPercent = hasRevenue 
    ? (fixedExpensesTotal / monthlyRevenue) * 100 
    : null;
  
  const variablePercent = hasRevenue 
    ? (variableExpensesTotal / monthlyRevenue) * 100 
    : null;
  
  const totalCostPercent = fixedPercent !== null && variablePercent !== null
    ? fixedPercent + variablePercent
    : null;

  const formatPercent = (value: number | null) => {
    if (value === null) return "—";
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">Custo Total do Negócio</h3>
          <p className="text-sm text-muted-foreground">Percentual do faturamento consumido pelas despesas</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Custos Fixos */}
        <div className="text-center p-4 bg-rose-500/10 rounded-lg border border-rose-500/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-rose-500" />
            <span className="text-sm text-muted-foreground">Fixos</span>
          </div>
          <p className={`font-display text-2xl font-bold ${fixedPercent !== null ? 'text-rose-600' : 'text-muted-foreground'}`}>
            {formatPercent(fixedPercent)}
          </p>
        </div>

        {/* Custos Variáveis */}
        <div className="text-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-muted-foreground">Variáveis</span>
          </div>
          <p className={`font-display text-2xl font-bold ${variablePercent !== null ? 'text-orange-600' : 'text-muted-foreground'}`}>
            {formatPercent(variablePercent)}
          </p>
        </div>

        {/* Total */}
        <div className="text-center p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
          <div className="flex items-center justify-center gap-2 mb-2">
            <PieChart className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <p className={`font-display text-2xl font-bold ${totalCostPercent !== null ? 'text-primary' : 'text-muted-foreground'}`}>
            {formatPercent(totalCostPercent)}
          </p>
        </div>
      </div>

      {!hasRevenue && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Informe o faturamento mensal nas configurações para calcular os percentuais
        </p>
      )}
    </div>
  );
}
