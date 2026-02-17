import { FileText, TrendingUp, DollarSign, Percent, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ProfitHealthStatus = "critico" | "apertado" | "saudavel" | "acima_media" | null;

interface SimplifiedDREBlockProps {
  monthlyRevenue: number | null;
  fixedExpensesTotal: number;
  variableExpensesTotal: number;
  totalExpenses: number;
  netResult: number | null;
  netMarginPercent: number | null;
  isProfit: boolean;
  fixedExpensesPercent: number | null;
  variableExpensesPercent: number | null;
  profitHealthStatus?: ProfitHealthStatus;
  isCalculating?: boolean;
}

const HEALTH_CONFIG: Record<
  Exclude<ProfitHealthStatus, null>,
  { color: string; bgColor: string; label: string; tooltip: string }
> = {
  critico: {
    color: "bg-destructive",
    bgColor: "bg-destructive/10 text-destructive",
    label: "Atenção ao lucro",
    tooltip:
      "Margens abaixo de 10% aumentam o risco do negócio.\nAvalie custos, preços ou estratégia de venda.",
  },
  apertado: {
    color: "bg-yellow-500",
    bgColor: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    label: "Lucro apertado",
    tooltip:
      "A margem média no food service costuma variar entre 10% e 20%.\nNo início do negócio, nem sempre é possível operar acima disso.",
  },
  saudavel: {
    color: "bg-success",
    bgColor: "bg-success/10 text-success",
    label: "Lucro saudável",
    tooltip:
      "A maioria dos estabelecimentos opera com margens entre 10% e 20%.\nEsta margem indica uma operação equilibrada.",
  },
  acima_media: {
    color: "bg-blue-500",
    bgColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    label: "Acima da média",
    tooltip:
      "Margens acima de 30% não são comuns no food service.\nVerifique se o preço está competitivo no mercado.",
  },
};

export default function SimplifiedDREBlock({
  monthlyRevenue,
  fixedExpensesTotal,
  variableExpensesTotal,
  totalExpenses,
  netResult,
  netMarginPercent,
  isProfit,
  fixedExpensesPercent,
  variableExpensesPercent,
  profitHealthStatus,
  isCalculating,
}: SimplifiedDREBlockProps) {
  const hasRevenue = monthlyRevenue !== null && monthlyRevenue > 0;
  const isLoss = netResult !== null && netResult < 0;

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return "—";
    return `${value.toFixed(2)}%`;
  };

  const healthConfig = profitHealthStatus ? HEALTH_CONFIG[profitHealthStatus] : null;

  if (isCalculating) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-12 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-14 bg-muted rounded" />
        </div>
      </div>
    );
  }

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
        <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="font-medium text-foreground">Faturamento Médio Mensal</span>
          </div>
          <span className="font-display font-bold text-lg text-success">
            {hasRevenue ? `R$ ${formatCurrency(monthlyRevenue)}` : "—"}
          </span>
        </div>

        <div className="flex items-center gap-2 py-2">
          <span className="text-sm text-muted-foreground">(−) Despesas do Negócio</span>
          <div className="flex-1 border-t border-dashed border-border" />
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-foreground">Despesas Fixas</span>
          </div>
          <div className="text-right">
            <span className="font-medium text-rose-600">
              − R$ {formatCurrency(fixedExpensesTotal)}
            </span>
            {fixedExpensesPercent !== null && (
              <span className="text-xs text-muted-foreground ml-2">
                ({fixedExpensesPercent.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-foreground">Despesas Variáveis</span>
          </div>
          <div className="text-right">
            <span className="font-medium text-orange-600">
              − R$ {formatCurrency(variableExpensesTotal)}
            </span>
            {variableExpensesPercent !== null && (
              <span className="text-xs text-muted-foreground ml-2">
                ({variableExpensesPercent.toFixed(1)}%)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
          <span className="font-medium text-muted-foreground">Total Despesas</span>
          <span className="font-display font-bold text-foreground">
            − R$ {formatCurrency(totalExpenses)}
          </span>
        </div>

        <div className="border-t-2 border-border my-2" />

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

        {/* Margem Líquida + Indicador de Saúde do Lucro */}
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
          <div className="flex items-center gap-3">
            {/* Health Indicator */}
            {healthConfig && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-help ${healthConfig.bgColor}`}>
                      <span className={`w-2 h-2 rounded-full ${healthConfig.color} flex-shrink-0`} />
                      {healthConfig.label}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs whitespace-pre-line text-sm">
                    {healthConfig.tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <span className={`font-display text-xl font-bold ${
              isProfit ? 'text-success' : isLoss ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {formatPercent(netMarginPercent)}
            </span>
          </div>
        </div>
      </div>

      {isLoss && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">
            Suas despesas estão maiores que o faturamento. Revise os gastos para equilibrar as contas.
          </p>
        </div>
      )}

      {hasRevenue && netResult !== null && (
        <>
          {/* Ponto de Equilíbrio */}
          {(() => {
            const breakEvenRevenue = variableExpensesPercent !== null && variableExpensesPercent < 100
              ? fixedExpensesTotal / (1 - variableExpensesPercent / 100)
              : null;

            if (breakEvenRevenue === null || breakEvenRevenue <= 0) return null;

            const isAboveBreakEven = monthlyRevenue !== null && monthlyRevenue >= breakEvenRevenue;

            return (
              <div className={`mt-4 p-4 rounded-lg border ${
                isAboveBreakEven
                  ? 'bg-success/5 border-success/20'
                  : 'bg-warning/5 border-warning/20'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className={`w-4 h-4 ${isAboveBreakEven ? 'text-success' : 'text-warning'}`} />
                  <span className="font-medium text-sm text-foreground">Ponto de Equilíbrio</span>
                </div>
                <p className="font-display text-lg font-bold text-foreground">
                  R$ {formatCurrency(breakEvenRevenue)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Faturamento mínimo para cobrir todas as despesas do negócio
                </p>
                {isAboveBreakEven ? (
                  <p className="text-xs text-success mt-1">
                    ✓ Seu faturamento está acima do ponto de equilíbrio
                  </p>
                ) : (
                  <p className="text-xs text-warning mt-1">
                    ⚠ Seu faturamento está abaixo do ponto de equilíbrio
                  </p>
                )}
              </div>
            );
          })()}

          <p className="text-xs text-muted-foreground mt-4 text-center p-3 bg-muted/30 rounded-lg">
            Despesas do negócio são pagas com o faturamento total do mês, não por produto individual.
          </p>
        </>
      )}

      {!hasRevenue && (
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Informe o faturamento mensal para calcular o resultado
        </p>
      )}
    </div>
  );
}
