import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Users,
  Clock,
  Percent,
} from "lucide-react";

interface ConversionMetricsBlockProps {
  totalUsers: number;
  freeUsers: number;
  basicUsers: number;
  proUsers: number;
  churnRate: number;
  mrr: number;
  arpu: number;
}

export function ConversionMetricsBlock({
  totalUsers,
  freeUsers,
  basicUsers,
  proUsers,
  churnRate,
  mrr,
  arpu,
}: ConversionMetricsBlockProps) {
  // Calculate conversion rates
  const paidUsers = basicUsers + proUsers;
  const freeToBasicRate = freeUsers > 0 ? (basicUsers / (freeUsers + basicUsers + proUsers)) * 100 : 0;
  const freeToProRate = freeUsers > 0 ? (proUsers / (freeUsers + basicUsers + proUsers)) * 100 : 0;
  const totalConversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

  // Estimated average conversion time (simulated - would need actual data tracking)
  const estimatedConversionDays = 7; // Default estimate

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Conversão de Usuários
        </CardTitle>
        <CardDescription>
          Análise de conversão por tipo de plano
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conversion Funnel */}
        <div className="space-y-3">
          {/* Free → Basic */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-muted-foreground">
                  Free
                </Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge className="bg-primary/10 text-primary border-primary/30">
                  Básico
                </Badge>
              </div>
              <span className="font-semibold">{freeToBasicRate.toFixed(1)}%</span>
            </div>
            <Progress value={freeToBasicRate} className="h-1.5" />
          </div>

          {/* Free → Pro */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-muted-foreground">
                  Free
                </Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Pro
                </Badge>
              </div>
              <span className="font-semibold">{freeToProRate.toFixed(1)}%</span>
            </div>
            <Progress value={freeToProRate} className="h-1.5 [&>div]:bg-emerald-500" />
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 mb-1">
              <Percent className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Conversão Total</span>
            </div>
            <p className="text-xl font-bold text-primary">{totalConversionRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">
              {paidUsers} de {totalUsers} usuários
            </p>
          </div>

          <div className="p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Tempo Médio</span>
            </div>
            <p className="text-xl font-bold">{estimatedConversionDays} dias</p>
            <p className="text-xs text-muted-foreground">para conversão</p>
          </div>
        </div>

        {/* Churn and ARPU */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="h-3 w-3 text-destructive" />
              <span className="text-xs text-muted-foreground">Churn Rate</span>
            </div>
            <p className={`text-xl font-bold ${churnRate <= 5 ? 'text-success' : 'text-destructive'}`}>
              {churnRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              {churnRate <= 5 ? 'Saudável' : 'Atenção necessária'}
            </p>
          </div>

          <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-1 mb-1">
              <Users className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">ARPU</span>
            </div>
            <p className="text-xl font-bold text-primary">{formatCurrency(arpu)}</p>
            <p className="text-xs text-muted-foreground">por usuário</p>
          </div>
        </div>

        {/* MRR Highlight */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-success/10 border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Receita Mensal Recorrente (MRR)</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(mrr)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary/30" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
