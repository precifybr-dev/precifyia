import { FileText, TrendingUp, TrendingDown, DollarSign, Percent, AlertTriangle } from "lucide-react";

interface SimplifiedDREBlockProps {
  monthlyRevenue: number | null;
  fixedExpensesTotal: number;
  variableExpensesTotal: number;
}

export default function SimplifiedDREBlock({
  monthlyRevenue,
  fixedExpensesTotal,
  variableExpensesTotal,
}: SimplifiedDREBlockProps) {
  const hasRevenue = monthlyRevenue && monthlyRevenue > 0;
  const totalExpenses = fixedExpensesTotal + variableExpensesTotal;
  
  // Resultado Líquido = Faturamento − Despesas Totais
  const netResult = hasRevenue ? monthlyRevenue - totalExpenses : null;
  
  // Margem Líquida (%) = (Resultado Líquido / Faturamento) × 100
  const netMarginPercent = hasRevenue && netResult !== null
    ? (netResult / monthlyRevenue) * 100
    : null;

  const isProfit = netResult !== null && netResult >= 0;
  const isLoss = netResult !== null && netResult < 0;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return "—";
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">DRE Simplificado</h3>
          <p className="text-sm text-muted-foreground">Demonstrativo de Resultado do Exercício</p>
        </div>
      </div>

      {/* DRE Table */}
      <div className="space-y-1">
        {/* Faturamento */}
        <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="font-medium text-foreground">Faturamento Médio Mensal</span>
          </div>
          <span className="font-display font-bold text-lg text-success">
            {hasRevenue ? `R$ ${formatCurrency(monthlyRevenue)}` : "—"}
          </span>
        </div>

        {/* Separator */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-sm text-muted-foreground">(−) Despesas do Negócio</span>
          <div className="flex-1 border-t border-dashed border-border" />
        </div>

        {/* Despesas Fixas */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-foreground">Despesas Fixas</span>
          </div>
          <div className="text-right">
            <span className="font-medium text-rose-600">
              − R$ {formatCurrency(fixedExpensesTotal)}
            </span>
            {hasRevenue && (
              <span className="text-xs text-muted-foreground ml-2">
                ({((fixedExpensesTotal / monthlyRevenue) * 100).toFixed(1)}%)
              </span>
            )}
          </div>
        </div>

        {/* Despesas Variáveis */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-foreground">Despesas Variáveis</span>
          </div>
          <div className="text-right">
            <span className="font-medium text-orange-600">
              − R$ {formatCurrency(variableExpensesTotal)}
            </span>
            {hasRevenue && (
              <span className="text-xs text-muted-foreground ml-2">
                ({((variableExpensesTotal / monthlyRevenue) * 100).toFixed(1)}%)
              </span>
            )}
          </div>
        </div>

        {/* Total Despesas */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
          <span className="font-medium text-muted-foreground">Total Despesas</span>
          <span className="font-display font-bold text-foreground">
            − R$ {formatCurrency(totalExpenses)}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t-2 border-border my-2" />

        {/* Resultado Líquido */}
        <div className={`flex items-center justify-between p-4 rounded-lg border-2 ${
          isProfit 
            ? 'bg-success/10 border-success/30' 
            : isLoss 
              ? 'bg-destructive/10 border-destructive/30' 
              : 'bg-muted/50 border-border'
        }`}>
          <div className="flex items-center gap-2">
            {isLoss ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <DollarSign className="w-5 h-5 text-success" />
            )}
            <span className="font-semibold text-foreground">Lucro Mensal do Negócio</span>
          </div>
          <span className={`font-display text-2xl font-bold ${
            isProfit ? 'text-success' : isLoss ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            {netResult !== null 
              ? `${isLoss ? '−' : ''} R$ ${formatCurrency(Math.abs(netResult))}`
              : "—"
            }
          </span>
        </div>

        {/* Margem Líquida */}
        <div className={`flex items-center justify-between p-4 rounded-lg ${
          isProfit 
            ? 'bg-success/5 border border-success/20' 
            : isLoss 
              ? 'bg-destructive/5 border border-destructive/20' 
              : 'bg-muted/30'
        }`}>
          <div className="flex items-center gap-2">
            <Percent className={`w-5 h-5 ${isProfit ? 'text-success' : isLoss ? 'text-destructive' : 'text-muted-foreground'}`} />
            <span className="font-medium text-foreground">Margem Líquida</span>
          </div>
          <span className={`font-display text-xl font-bold ${
            isProfit ? 'text-success' : isLoss ? 'text-destructive' : 'text-muted-foreground'
          }`}>
            {formatPercent(netMarginPercent)}
          </span>
        </div>
      </div>

      {/* Alert for loss */}
      {isLoss && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">
            Suas despesas estão maiores que o faturamento. Revise os gastos para equilibrar as contas.
          </p>
        </div>
      )}

      {/* Texto educativo */}
      {hasRevenue && netResult !== null && (
        <p className="text-xs text-muted-foreground mt-4 text-center p-3 bg-muted/30 rounded-lg">
          Despesas do negócio são pagas com o faturamento total do mês, não por produto individual.
        </p>
      )}

      {!hasRevenue && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Informe o faturamento mensal para calcular o resultado
        </p>
      )}
    </div>
  );
}
