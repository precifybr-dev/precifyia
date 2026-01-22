import { useState } from "react";
import { PieChart, TrendingDown, Receipt, Calculator, AlertTriangle, Settings2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TotalBusinessCostBlockProps {
  fixedExpensesTotal: number;
  variableExpensesTotal: number;
  monthlyRevenue: number | null;
  costLimitPercent: number;
  onLimitChange?: (newLimit: number) => void;
}

export default function TotalBusinessCostBlock({
  fixedExpensesTotal,
  variableExpensesTotal,
  monthlyRevenue,
  costLimitPercent,
  onLimitChange,
}: TotalBusinessCostBlockProps) {
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [editLimitValue, setEditLimitValue] = useState(costLimitPercent.toString());

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

  const isOverLimit = totalCostPercent !== null && totalCostPercent > costLimitPercent;
  const excessPercent = isOverLimit ? totalCostPercent - costLimitPercent : 0;

  const formatPercent = (value: number | null) => {
    if (value === null) return "—";
    return `${value.toFixed(2)}%`;
  };

  const handleSaveLimit = () => {
    const newLimit = parseFloat(editLimitValue);
    if (!isNaN(newLimit) && newLimit > 0 && newLimit <= 100) {
      onLimitChange?.(newLimit);
      setIsEditingLimit(false);
    }
  };

  const handleCancelEdit = () => {
    setEditLimitValue(costLimitPercent.toString());
    setIsEditingLimit(false);
  };

  return (
    <div className={`bg-card rounded-xl border p-6 shadow-card transition-colors ${isOverLimit ? 'border-destructive/50 bg-destructive/5' : 'border-border'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isOverLimit ? 'bg-destructive/10' : 'bg-primary/10'}`}>
            {isOverLimit ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <Calculator className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">Despesas Totais do Negócio</h3>
            <p className="text-sm text-muted-foreground">Percentual do faturamento consumido pelas despesas fixas e variáveis</p>
          </div>
        </div>

        {/* Limit Configuration */}
        <div className="flex items-center gap-2">
          {isEditingLimit ? (
            <>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Limite:</span>
                <div className="relative w-20">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={editLimitValue}
                    onChange={(e) => setEditLimitValue(e.target.value)}
                    className="h-8 pr-6 text-right text-sm"
                    onKeyDown={(e) => e.key === "Enter" && handleSaveLimit()}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveLimit}>
                <Check className="w-4 h-4 text-success" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelEdit}>
                <X className="w-4 h-4 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <button
              onClick={() => setIsEditingLimit(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
            >
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Limite:</span>
              <span className="font-medium text-foreground">{costLimitPercent}%</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {isOverLimit && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Alerta de Risco Financeiro</p>
            <p className="text-sm text-destructive/80">
              Seu custo total está <strong>{excessPercent.toFixed(2)}%</strong> acima do limite configurado de {costLimitPercent}%. 
              Revise suas despesas para melhorar a saúde financeira do negócio.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Despesas Fixas */}
        <div className="text-center p-4 bg-rose-500/10 rounded-lg border border-rose-500/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Receipt className="w-4 h-4 text-rose-500" />
            <span className="text-sm text-muted-foreground">Desp. Fixas</span>
          </div>
          <p className={`font-display text-2xl font-bold ${fixedPercent !== null ? 'text-rose-600' : 'text-muted-foreground'}`}>
            {formatPercent(fixedPercent)}
          </p>
        </div>

        {/* Despesas Variáveis */}
        <div className="text-center p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-muted-foreground">Desp. Variáveis</span>
          </div>
          <p className={`font-display text-2xl font-bold ${variablePercent !== null ? 'text-orange-600' : 'text-muted-foreground'}`}>
            {formatPercent(variablePercent)}
          </p>
        </div>

        {/* Total */}
        <div className={`text-center p-4 rounded-lg border-2 ${isOverLimit ? 'bg-destructive/10 border-destructive/30' : 'bg-primary/10 border-primary/30'}`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <PieChart className={`w-4 h-4 ${isOverLimit ? 'text-destructive' : 'text-primary'}`} />
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <p className={`font-display text-2xl font-bold ${totalCostPercent !== null ? (isOverLimit ? 'text-destructive' : 'text-primary') : 'text-muted-foreground'}`}>
            {formatPercent(totalCostPercent)}
          </p>
        </div>
      </div>

      {/* Progress bar showing limit */}
      {hasRevenue && totalCostPercent !== null && (
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>0%</span>
            <span className={`font-medium ${isOverLimit ? 'text-destructive' : 'text-success'}`}>
              {isOverLimit ? 'Acima do limite' : 'Dentro do limite'}
            </span>
            <span>100%</span>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            {/* Limit marker */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-foreground/50 z-10"
              style={{ left: `${Math.min(costLimitPercent, 100)}%` }}
            />
            {/* Progress fill */}
            <div 
              className={`h-full rounded-full transition-all ${isOverLimit ? 'bg-destructive' : 'bg-success'}`}
              style={{ width: `${Math.min(totalCostPercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-muted-foreground">
              Limite: {costLimitPercent}%
            </span>
            <span className={`font-medium ${isOverLimit ? 'text-destructive' : 'text-success'}`}>
              Atual: {totalCostPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {!hasRevenue && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Informe o faturamento mensal nas configurações para calcular os percentuais
        </p>
      )}
    </div>
  );
}
