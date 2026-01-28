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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  Users,
  Percent,
  RefreshCcw,
  Link2,
  Wallet,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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

export function FinancialDashboard() {
  const {
    summary,
    revenueByPlan,
    revenueByPeriod,
    renewalStats,
    expiringByPlan,
    expiringUsers,
    isLoading,
    refetch,
    fetchRevenueByPeriod,
  } = useFinancialDashboard();

  const [periodDays, setPeriodDays] = useState("30");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handlePeriodChange = (days: string) => {
    setPeriodDays(days);
    fetchRevenueByPeriod(parseInt(days));
  };

  const getExpiryBadge = (days: number) => {
    if (days <= 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Vencido
        </Badge>
      );
    }
    if (days <= 7) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {days} dias
        </Badge>
      );
    }
    if (days <= 15) {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {days} dias
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {days} dias
      </Badge>
    );
  };

  return (
    <RequirePermission
      permission="view_financials"
      fallback={
        <Card>
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              Você não tem permissão para visualizar dados financeiros.
            </p>
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Dashboard Financeiro
            </h2>
            <p className="text-sm text-muted-foreground">
              Visão completa de receitas, pagamentos e renovações
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Main KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary?.total_revenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Soma de todos os pagamentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary?.mrr || 0)}</div>
              <p className="text-xs text-muted-foreground">Receita mensal recorrente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Previsão Próximo Mês</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary?.projected_next_month || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Baseado no crescimento atual</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary?.average_ticket || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Por assinatura ativa</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different sections */}
        <Tabs defaultValue="revenue" className="space-y-4">
          <TabsList>
            <TabsTrigger value="revenue">
              <TrendingUp className="h-4 w-4 mr-2" />
              Receitas
            </TabsTrigger>
            <TabsTrigger value="payments">
              <CreditCard className="h-4 w-4 mr-2" />
              Pagamentos
            </TabsTrigger>
            <TabsTrigger value="renewals">
              <Clock className="h-4 w-4 mr-2" />
              Renovações
            </TabsTrigger>
          </TabsList>

          {/* Revenue Tab */}
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
                            data={revenueByPlan.filter((p) => p.monthly_revenue > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            dataKey="monthly_revenue"
                            label={({ percentage }) => `${percentage?.toFixed(0)}%`}
                            labelLine={false}
                          >
                            {revenueByPlan.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PLAN_COLORS[entry.plan_type as keyof typeof PLAN_COLORS] || PLAN_COLORS.free}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {revenueByPlan.map((plan) => (
                        <div key={plan.plan_type} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor:
                                    PLAN_COLORS[plan.plan_type as keyof typeof PLAN_COLORS] ||
                                    PLAN_COLORS.free,
                                }}
                              />
                              <span>{PLAN_LABELS[plan.plan_type] || plan.plan_type}</span>
                            </div>
                            <span className="font-medium">{formatCurrency(plan.monthly_revenue)}</span>
                          </div>
                          <Progress value={plan.percentage} className="h-1.5" />
                          <p className="text-xs text-muted-foreground">
                            {plan.user_count} usuários • {plan.percentage.toFixed(1)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue by Period Chart */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Receita por Período</CardTitle>
                      <CardDescription>Evolução dos pagamentos recebidos</CardDescription>
                    </div>
                    <Select value={periodDays} onValueChange={handlePeriodChange}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
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
                          <XAxis
                            dataKey="period_date"
                            tickFormatter={(value) =>
                              format(new Date(value), "dd/MM", { locale: ptBR })
                            }
                            className="text-xs"
                          />
                          <YAxis
                            tickFormatter={(value) => formatCurrency(value)}
                            className="text-xs"
                          />
                          <Tooltip
                            labelFormatter={(value) =>
                              format(new Date(value), "dd 'de' MMMM", { locale: ptBR })
                            }
                            formatter={(value: number) => [formatCurrency(value), "Receita"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary) / 0.2)"
                          />
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
          </TabsContent>

          {/* Payments Tab */}
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
                  <div className="text-2xl font-bold text-emerald-600">
                    {summary?.paid_links || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Pagamentos confirmados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {summary?.pending_links || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Falhas</CardTitle>
                  <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {summary?.failed_links || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Pagamentos falhos</p>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Taxa de Conversão
                </CardTitle>
                <CardDescription>
                  Proporção de links de pagamento que foram pagos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Conversão</span>
                      <span className="text-2xl font-bold">
                        {(summary?.conversion_rate || 0).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={summary?.conversion_rate || 0} className="h-3" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {summary?.paid_links || 0} de {summary?.total_payment_links || 0} links
                    </p>
                    {(summary?.conversion_rate || 0) >= 50 ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-600 mt-1">
                        Saudável
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-600 mt-1">
                        Atenção
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Renewals Tab */}
          <TabsContent value="renewals" className="space-y-4">
            {/* Renewal Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-destructive/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vencem Hoje</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {renewalStats?.expiring_today || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(renewalStats?.potential_revenue_today || 0)} potencial
                  </p>
                </CardContent>
              </Card>

              <Card className="border-amber-500/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Próximos 7 dias</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600">
                    {renewalStats?.expiring_7_days || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(renewalStats?.potential_revenue_7_days || 0)} potencial
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Próximos 15 dias</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {renewalStats?.expiring_15_days || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(renewalStats?.potential_revenue_15_days || 0)} potencial
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Próximos 30 dias</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {renewalStats?.expiring_30_days || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(renewalStats?.potential_revenue_30_days || 0)} potencial
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Distribution by Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição por Plano</CardTitle>
                  <CardDescription>Usuários com renovação nos próximos 30 dias</CardDescription>
                </CardHeader>
                <CardContent>
                  {expiringByPlan.length > 0 ? (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={expiringByPlan} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                          <YAxis
                            dataKey="plan_type"
                            type="category"
                            tickFormatter={(value) => PLAN_LABELS[value] || value}
                            width={80}
                          />
                          <Tooltip
                            formatter={(value: number, name: string) => [
                              name === "potential_revenue"
                                ? formatCurrency(value)
                                : value,
                              name === "potential_revenue" ? "Receita Potencial" : "Usuários",
                            ]}
                          />
                          <Bar
                            dataKey="potential_revenue"
                            fill="hsl(var(--primary))"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      <p>Nenhuma renovação pendente</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expiring Users List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Usuários com Vencimento</CardTitle>
                  <CardDescription>Próximas renovações a vencer</CardDescription>
                </CardHeader>
                <CardContent>
                  {expiringUsers.length > 0 ? (
                    <ScrollArea className="h-[200px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Negócio</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead className="text-right">Vencimento</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {expiringUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">
                                {user.business_name || "Sem nome"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    user.user_plan === "pro"
                                      ? "border-emerald-500 text-emerald-600"
                                      : user.user_plan === "basic"
                                      ? "border-primary text-primary"
                                      : ""
                                  }
                                >
                                  {PLAN_LABELS[user.user_plan] || user.user_plan}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {getExpiryBadge(user.days_until_expiry)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mr-2 opacity-50" />
                      <p>Todos os usuários com vencimento em dia</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </RequirePermission>
  );
}
