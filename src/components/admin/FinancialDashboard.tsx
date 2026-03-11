import { useState } from "react";
import { useFinancialDashboard } from "@/hooks/useFinancialDashboard";
import { RequirePermission } from "@/components/rbac";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
} from "recharts";
import {
  DollarSign, TrendingUp, CreditCard, Clock, AlertTriangle, CheckCircle2,
  XCircle, Calendar, Users, Percent, RefreshCcw, Link2, Wallet,
  UserX, Activity, Download, FileSpreadsheet, Target, ShieldAlert,
  ArrowUpRight, ArrowDownRight, Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateSP } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";

const PLAN_COLORS = {
  free: "hsl(var(--muted-foreground))",
  basic: "hsl(var(--primary))",
  pro: "hsl(var(--chart-1))",
};

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuito",
  basic: "Básico",
  pro: "Pro",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// Health indicator component
function HealthBadge({ value, thresholds, labels, inverse }: {
  value: number;
  thresholds: [number, number];
  labels?: [string, string, string];
  inverse?: boolean;
}) {
  const [low, high] = thresholds;
  const defaultLabels = labels || ["Crítico", "Atenção", "Saudável"];
  let level: 0 | 1 | 2;
  if (inverse) {
    level = value > high ? 0 : value > low ? 1 : 2;
  } else {
    level = value < low ? 0 : value < high ? 1 : 2;
  }
  const colors = [
    "bg-destructive/10 text-destructive border-destructive/30",
    "bg-amber-500/10 text-amber-600 border-amber-500/30",
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  ];
  return (
    <Badge variant="outline" className={`${colors[level]} font-medium`}>
      {defaultLabels[level]}
    </Badge>
  );
}

export function FinancialDashboard() {
  const {
    summary, revenueByPlan, revenueByPeriod, renewalStats,
    expiringByPlan, expiringUsers, ltvMetrics, churnRiskUsers, inactiveUsers,
    isLoading, refetch, fetchRevenueByPeriod, fetchInactiveUsers,
  } = useFinancialDashboard();

  const [periodDays, setPeriodDays] = useState("30");
  const [inactiveDays, setInactiveDays] = useState("7");

  // Projection simulation state
  const [simGrowthRate, setSimGrowthRate] = useState(5);
  const [simCommissionChange, setSimCommissionChange] = useState(0);
  const [simMonths, setSimMonths] = useState(6);

  const handlePeriodChange = (days: string) => {
    setPeriodDays(days);
    fetchRevenueByPeriod(parseInt(days));
  };

  const handleInactiveDaysChange = (days: string) => {
    setInactiveDays(days);
    fetchInactiveUsers(parseInt(days));
  };

  const getExpiryBadge = (days: number) => {
    if (days <= 0) return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Vencido</Badge>;
    if (days <= 7) return <Badge variant="destructive" className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{days} dias</Badge>;
    if (days <= 15) return <Badge variant="outline" className="border-amber-500 text-amber-600 flex items-center gap-1"><Clock className="h-3 w-3" />{days} dias</Badge>;
    return <Badge variant="outline" className="flex items-center gap-1"><Calendar className="h-3 w-3" />{days} dias</Badge>;
  };

  // Generate projection data
  const generateProjection = () => {
    const currentMRR = summary?.mrr || 0;
    const data = [];
    for (let i = 0; i <= simMonths; i++) {
      const growthFactor = Math.pow(1 + simGrowthRate / 100, i);
      const commissionImpact = 1 + (simCommissionChange / 100) * (i > 0 ? 1 : 0);
      const projectedMRR = currentMRR * growthFactor * commissionImpact;
      data.push({
        month: i === 0 ? "Atual" : `Mês ${i}`,
        mrr: Math.round(projectedMRR * 100) / 100,
        accumulated: Math.round(projectedMRR * i * 100) / 100,
      });
    }
    return data;
  };

  // Export helpers
  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      }).join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getExportData = () => {
    const financialData = [{
      "Receita Total": summary?.total_revenue || 0,
      "MRR": summary?.mrr || 0,
      "Projeção Próx. Mês": summary?.projected_next_month || 0,
      "Ticket Médio": summary?.average_ticket || 0,
      "Taxa Conversão (%)": summary?.conversion_rate || 0,
      "Links Pagos": summary?.paid_links || 0,
      "Links Pendentes": summary?.pending_links || 0,
      "LTV Médio": ltvMetrics?.average_ltv || 0,
      "Meses Médio Assinatura": ltvMetrics?.average_subscription_months || 0,
      "Assinantes Ativos": ltvMetrics?.total_active_subscribers || 0,
    }];
    return financialData;
  };

  const projectionData = generateProjection();
  const arpu = (summary?.mrr || 0) / Math.max(ltvMetrics?.total_active_subscribers || 1, 1);

  return (
    <RequirePermission
      permission="view_financials"
      fallback={
        <Card><CardContent className="py-12 text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Você não tem permissão para visualizar dados financeiros.</p>
        </CardContent></Card>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Dashboard Financeiro Estratégico
            </h2>
            <p className="text-sm text-muted-foreground">
              Visão executiva de receitas, clientes, risco e projeções
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToCSV(getExportData(), "financeiro_resumo")}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
            <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Main KPIs with health indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.mrr || 0)}</div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">Receita mensal recorrente</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.total_revenue || 0)}</div>
              <p className="text-xs text-muted-foreground">Soma de todos pagamentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.average_ticket || 0)}</div>
              <p className="text-xs text-muted-foreground">ARPU: {formatCurrency(arpu)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">LTV Médio</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(ltvMetrics?.average_ltv || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {(ltvMetrics?.average_subscription_months || 0).toFixed(1)} meses médio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversão</CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary?.conversion_rate || 0).toFixed(1)}%</div>
              <HealthBadge value={summary?.conversion_rate || 0} thresholds={[30, 60]} />
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList className="flex-wrap">
            <TabsTrigger value="revenue"><TrendingUp className="h-4 w-4 mr-2" />Receita</TabsTrigger>
            <TabsTrigger value="clients"><Users className="h-4 w-4 mr-2" />Clientes & LTV</TabsTrigger>
            <TabsTrigger value="risk"><ShieldAlert className="h-4 w-4 mr-2" />Risco & Churn</TabsTrigger>
            <TabsTrigger value="projection"><Target className="h-4 w-4 mr-2" />Projeção</TabsTrigger>
            <TabsTrigger value="renewals"><Clock className="h-4 w-4 mr-2" />Renovações</TabsTrigger>
            <TabsTrigger value="payments"><CreditCard className="h-4 w-4 mr-2" />Pagamentos</TabsTrigger>
          </TabsList>

          {/* === REVENUE TAB === */}
          <TabsContent value="revenue" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Revenue by Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Receita por Plano</CardTitle>
                  <CardDescription>Distribuição de receita por tipo de assinatura</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className="h-40 w-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={revenueByPlan.filter(p => p.monthly_revenue > 0)}
                            cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                            dataKey="monthly_revenue"
                            label={({ percentage }) => `${percentage?.toFixed(0)}%`}
                            labelLine={false}
                          >
                            {revenueByPlan.map((entry, i) => (
                              <Cell key={i} fill={PLAN_COLORS[entry.plan_type as keyof typeof PLAN_COLORS] || PLAN_COLORS.free} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {revenueByPlan.map(plan => (
                        <div key={plan.plan_type} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PLAN_COLORS[plan.plan_type as keyof typeof PLAN_COLORS] || PLAN_COLORS.free }} />
                              <span>{PLAN_LABELS[plan.plan_type] || plan.plan_type}</span>
                            </div>
                            <span className="font-medium">{formatCurrency(plan.monthly_revenue)}</span>
                          </div>
                          <Progress value={plan.percentage} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">{plan.user_count} usuários • {plan.percentage.toFixed(1)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue by Period */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Receita por Período</CardTitle>
                      <CardDescription>Evolução dos pagamentos recebidos</CardDescription>
                    </div>
                    <Select value={periodDays} onValueChange={handlePeriodChange}>
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                        <SelectItem value="90">90 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {revenueByPeriod.length > 0 ? (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={revenueByPeriod}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="period_date" tickFormatter={v => format(new Date(v), "dd/MM", { locale: ptBR })} className="text-xs" />
                          <YAxis tickFormatter={v => `R$${v}`} className="text-xs" />
                          <Tooltip labelFormatter={v => format(new Date(v), "dd 'de' MMMM", { locale: ptBR })} formatter={(v: number) => [formatCurrency(v), "Receita"]} />
                          <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      <p>Nenhum pagamento registrado no período</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Export revenue data */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => exportToCSV(
                revenueByPlan.map(p => ({ Plano: PLAN_LABELS[p.plan_type] || p.plan_type, Usuários: p.user_count, "Receita Mensal": p.monthly_revenue, "Percentual (%)": p.percentage.toFixed(1) })),
                "receita_por_plano"
              )}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />Exportar Receita por Plano
              </Button>
            </div>
          </TabsContent>

          {/* === CLIENTS & LTV TAB === */}
          <TabsContent value="clients" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">LTV Médio</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(ltvMetrics?.average_ltv || 0)}</div>
                  <HealthBadge value={ltvMetrics?.average_ltv || 0} thresholds={[100, 300]} labels={["Baixo", "Regular", "Bom"]} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tempo Médio Assinatura</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(ltvMetrics?.average_subscription_months || 0).toFixed(1)} <span className="text-sm font-normal text-muted-foreground">meses</span></div>
                  <HealthBadge value={ltvMetrics?.average_subscription_months || 0} thresholds={[3, 6]} labels={["Curto", "Médio", "Longo"]} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Assinantes Ativos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ltvMetrics?.total_active_subscribers || 0}</div>
                  <p className="text-xs text-muted-foreground">Com plano ativo</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">ARPU</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(arpu)}</div>
                  <p className="text-xs text-muted-foreground">Receita média por usuário</p>
                </CardContent>
              </Card>
            </div>

            {/* LTV Ratio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Razão LTV / Ticket Médio
                </CardTitle>
                <CardDescription>Quanto cada cliente gera ao longo da vida vs. valor mensal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Razão LTV:Ticket</span>
                      <span className="font-bold">
                        {(summary?.average_ticket && summary.average_ticket > 0)
                          ? `${((ltvMetrics?.average_ltv || 0) / summary.average_ticket).toFixed(1)}x`
                          : "N/A"
                        }
                      </span>
                    </div>
                    <Progress value={Math.min(((ltvMetrics?.average_ltv || 0) / Math.max(summary?.average_ticket || 1, 1)) * 10, 100)} className="h-3" />
                    <p className="text-xs text-muted-foreground">Ideal: acima de 3x. Indica boa retenção de clientes.</p>
                  </div>
                  <HealthBadge
                    value={(ltvMetrics?.average_ltv || 0) / Math.max(summary?.average_ticket || 1, 1)}
                    thresholds={[2, 5]}
                    labels={["Baixo", "Moderado", "Excelente"]}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === RISK & CHURN TAB === */}
          <TabsContent value="risk" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-destructive/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Risco de Churn</CardTitle>
                  <UserX className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{churnRiskUsers.length}</div>
                  <p className="text-xs text-muted-foreground">Usuários com queda de atividade</p>
                </CardContent>
              </Card>
              <Card className="border-amber-500/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Inativos ({inactiveDays}+ dias)</CardTitle>
                  <Activity className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{inactiveUsers.length}</div>
                  <Select value={inactiveDays} onValueChange={handleInactiveDaysChange}>
                    <SelectTrigger className="w-[100px] mt-1 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 dias</SelectItem>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="14">14 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vencem em 7 dias</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{renewalStats?.expiring_7_days || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(renewalStats?.potential_revenue_7_days || 0)} em risco
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Churn Risk List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserX className="h-5 w-5 text-destructive" />
                    Usuários com Risco de Churn
                  </CardTitle>
                  <CardDescription>Queda de atividade significativa</CardDescription>
                </CardHeader>
                <CardContent>
                  {churnRiskUsers.length > 0 ? (
                    <ScrollArea className="h-[260px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Nível Anterior</TableHead>
                            <TableHead className="text-right">Dias Inativo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {churnRiskUsers.map(u => (
                            <TableRow key={u.user_id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{u.business_name || "Sem nome"}</p>
                                  <p className="text-xs text-muted-foreground">{u.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{PLAN_LABELS[u.user_plan] || u.user_plan}</Badge>
                              </TableCell>
                              <TableCell>
                                <HealthBadge value={u.previous_activity_level === "high" ? 100 : u.previous_activity_level === "medium" ? 50 : 10} thresholds={[30, 70]} labels={["Baixo", "Médio", "Alto"]} />
                              </TableCell>
                              <TableCell className="text-right font-medium text-destructive">{u.days_since_active}d</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      <CheckCircle2 className="h-6 w-6 mr-2 opacity-50" />
                      <p>Nenhum usuário em risco de churn</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Inactive Users */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-5 w-5 text-amber-500" />
                    Usuários Inativos
                  </CardTitle>
                  <CardDescription>Sem atividade há {inactiveDays}+ dias</CardDescription>
                </CardHeader>
                <CardContent>
                  {inactiveUsers.length > 0 ? (
                    <ScrollArea className="h-[260px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead className="text-right">Dias Inativo</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {inactiveUsers.slice(0, 15).map(u => (
                            <TableRow key={u.user_id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{u.business_name || "Sem nome"}</p>
                                  <p className="text-xs text-muted-foreground">{u.email}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant={u.days_inactive > 14 ? "destructive" : "outline"} className={u.days_inactive <= 14 ? "border-amber-500 text-amber-600" : ""}>
                                  {u.days_inactive}d
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      <CheckCircle2 className="h-6 w-6 mr-2 opacity-50" />
                      <p>Todos os usuários estão ativos</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Export */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => exportToCSV(
                churnRiskUsers.map(u => ({ Email: u.email, Negócio: u.business_name || "", Plano: u.user_plan, "Dias Inativo": u.days_since_active, "Nível Anterior": u.previous_activity_level })),
                "risco_churn"
              )}>
                <Download className="h-4 w-4 mr-2" />Exportar Risco Churn
              </Button>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(
                inactiveUsers.map(u => ({ Email: u.email, Negócio: u.business_name || "", "Dias Inativo": u.days_inactive })),
                "usuarios_inativos"
              )}>
                <Download className="h-4 w-4 mr-2" />Exportar Inativos
              </Button>
            </div>
          </TabsContent>

          {/* === PROJECTION TAB === */}
          <TabsContent value="projection" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Simulation Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Simulador de Crescimento
                  </CardTitle>
                  <CardDescription>Ajuste os parâmetros para simular cenários</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Taxa de Crescimento Mensal</Label>
                      <span className="text-sm font-bold text-primary">{simGrowthRate}%</span>
                    </div>
                    <Slider value={[simGrowthRate]} onValueChange={v => setSimGrowthRate(v[0])} min={-10} max={30} step={1} />
                    <p className="text-xs text-muted-foreground">Crescimento esperado do MRR por mês</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Impacto de Comissão</Label>
                      <span className={`text-sm font-bold ${simCommissionChange >= 0 ? "text-emerald-600" : "text-destructive"}`}>{simCommissionChange > 0 ? "+" : ""}{simCommissionChange}%</span>
                    </div>
                    <Slider value={[simCommissionChange]} onValueChange={v => setSimCommissionChange(v[0])} min={-20} max={20} step={1} />
                    <p className="text-xs text-muted-foreground">Variação na comissão e seu impacto na receita</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Horizonte de Projeção</Label>
                      <span className="text-sm font-bold">{simMonths} meses</span>
                    </div>
                    <Slider value={[simMonths]} onValueChange={v => setSimMonths(v[0])} min={3} max={12} step={1} />
                  </div>

                  {/* Summary */}
                  <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>MRR Atual</span>
                      <span className="font-medium">{formatCurrency(summary?.mrr || 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>MRR Projetado ({simMonths}m)</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(projectionData[projectionData.length - 1]?.mrr || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Variação</span>
                      <span className={`font-medium flex items-center gap-1 ${
                        (projectionData[projectionData.length - 1]?.mrr || 0) >= (summary?.mrr || 0) ? "text-emerald-600" : "text-destructive"
                      }`}>
                        {(projectionData[projectionData.length - 1]?.mrr || 0) >= (summary?.mrr || 0)
                          ? <ArrowUpRight className="h-3 w-3" />
                          : <ArrowDownRight className="h-3 w-3" />
                        }
                        {summary?.mrr && summary.mrr > 0
                          ? `${(((projectionData[projectionData.length - 1]?.mrr || 0) / summary.mrr - 1) * 100).toFixed(1)}%`
                          : "N/A"
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Projection Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Projeção de MRR</CardTitle>
                  <CardDescription>
                    Cenário: {simGrowthRate}% crescimento/mês
                    {simCommissionChange !== 0 && `, ${simCommissionChange > 0 ? "+" : ""}${simCommissionChange}% comissão`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={projectionData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis tickFormatter={v => `R$${v}`} className="text-xs" />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Line type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }} name="MRR Projetado" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* === RENEWALS TAB === */}
          <TabsContent value="renewals" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-destructive/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vencem Hoje</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{renewalStats?.expiring_today || 0}</div>
                  <p className="text-xs text-muted-foreground">{formatCurrency(renewalStats?.potential_revenue_today || 0)} potencial</p>
                </CardContent>
              </Card>
              <Card className="border-amber-500/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Próximos 7 dias</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{renewalStats?.expiring_7_days || 0}</div>
                  <p className="text-xs text-muted-foreground">{formatCurrency(renewalStats?.potential_revenue_7_days || 0)} potencial</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Próximos 15 dias</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{renewalStats?.expiring_15_days || 0}</div>
                  <p className="text-xs text-muted-foreground">{formatCurrency(renewalStats?.potential_revenue_15_days || 0)} potencial</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Próximos 30 dias</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{renewalStats?.expiring_30_days || 0}</div>
                  <p className="text-xs text-muted-foreground">{formatCurrency(renewalStats?.potential_revenue_30_days || 0)} potencial</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Plano</CardTitle>
                  <CardDescription>Renovações nos próximos 30 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  {expiringByPlan.length > 0 ? (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={expiringByPlan} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" tickFormatter={v => formatCurrency(v)} />
                          <YAxis dataKey="plan_type" type="category" tickFormatter={v => PLAN_LABELS[v] || v} width={80} />
                          <Tooltip formatter={(v: number, name: string) => [name === "potential_revenue" ? formatCurrency(v) : v, name === "potential_revenue" ? "Receita Potencial" : "Usuários"]} />
                          <Bar dataKey="potential_revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground"><p>Nenhuma renovação pendente</p></div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Usuários com Vencimento</CardTitle>
                  <CardDescription>Próximas renovações</CardDescription>
                </CardHeader>
                <CardContent>
                  {expiringUsers.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      <Table>
                        <TableHeader><TableRow>
                          <TableHead>Negócio</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead className="text-right">Vencimento</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {expiringUsers.map(user => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.business_name || "Sem nome"}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className={user.user_plan === "pro" ? "border-emerald-500 text-emerald-600" : user.user_plan === "basic" ? "border-primary text-primary" : ""}>
                                  {PLAN_LABELS[user.user_plan] || user.user_plan}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">{getExpiryBadge(user.days_until_expiry)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mr-2 opacity-50" /><p>Todos em dia</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* === PAYMENTS TAB === */}
          <TabsContent value="payments" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Links Gerados</CardTitle>
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary?.total_payment_links || 0}</div>
                  <p className="text-xs text-muted-foreground">Total de links criados</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Links Pagos</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{summary?.paid_links || 0}</div>
                  <p className="text-xs text-muted-foreground">Confirmados</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">{summary?.pending_links || 0}</div>
                  <p className="text-xs text-muted-foreground">Aguardando</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Falhas</CardTitle>
                  <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{summary?.failed_links || 0}</div>
                  <p className="text-xs text-muted-foreground">Pagamentos falhos</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4" />Taxa de Conversão</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Conversão</span>
                      <span className="text-2xl font-bold">{(summary?.conversion_rate || 0).toFixed(1)}%</span>
                    </div>
                    <Progress value={summary?.conversion_rate || 0} className="h-3" />
                  </div>
                  <HealthBadge value={summary?.conversion_rate || 0} thresholds={[30, 60]} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RequirePermission>
  );
}
