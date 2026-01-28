import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRBAC } from "@/hooks/useRBAC";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { RequirePermission } from "@/components/rbac";
import { UserManagement } from "@/components/admin/UserManagement";
import { FinancialDashboard } from "@/components/admin/FinancialDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Users,
  TrendingUp,
  DollarSign,
  Activity,
  Bell,
  History,
  UserPlus,
  ArrowLeft,
  RefreshCcw,
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  Eye,
  Calendar,
  Shield,
  UserCog,
  Wallet,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const PLAN_COLORS = {
  free: "hsl(var(--muted-foreground))",
  basic: "hsl(var(--primary))",
  pro: "hsl(var(--chart-1))",
};

const ALERT_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle2,
};

const ALERT_COLORS = {
  info: "text-blue-500",
  warning: "text-amber-500",
  error: "text-destructive",
  success: "text-emerald-500",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | undefined>();
  const { isLoading: rbacLoading } = useRBAC(userId);
  const {
    metrics,
    mrrStats,
    registrationStats,
    recentUsers,
    alerts,
    accessLogs,
    totalMRR,
    activeUsers,
    churnRate,
    averageLTV,
    arpu,
    isLoading,
    refetch,
    markAlertAsRead,
  } = useAdminDashboard();

  const [chartPeriod, setChartPeriod] = useState("30");

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    };
    getUser();
  }, []);

  const unreadAlerts = alerts.filter((a) => !a.is_read);

  const planDistribution = [
    { name: "Gratuito", value: metrics?.free_plan_users || 0, color: PLAN_COLORS.free },
    { name: "Básico", value: metrics?.basic_plan_users || 0, color: PLAN_COLORS.basic },
    { name: "Pro", value: metrics?.pro_plan_users || 0, color: PLAN_COLORS.pro },
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (rbacLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <RequirePermission
      permission="view_metrics"
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <Shield className="h-5 w-5" />
                Acesso Negado
              </CardTitle>
              <CardDescription>
                Você não tem permissão para acessar o dashboard administrativo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/dashboard")} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Activity className="h-6 w-6" />
                  Dashboard Administrativo
                </h1>
                <p className="text-muted-foreground">
                  Visão geral da plataforma
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadAlerts.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {unreadAlerts.length} alertas
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
                <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeUsers}</div>
                <p className="text-xs text-muted-foreground">
                  +{metrics?.users_today || 0} hoje
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">MRR</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalMRR)}</div>
                <p className="text-xs text-muted-foreground">
                  Receita mensal recorrente
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ARPU</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(arpu)}</div>
                <p className="text-xs text-muted-foreground">
                  Receita média por usuário
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">LTV Médio</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(averageLTV)}</div>
                <p className="text-xs text-muted-foreground">
                  Lifetime value estimado
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Novos Cadastros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{metrics?.users_today || 0}</p>
                    <p className="text-xs text-muted-foreground">Hoje</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.users_week || 0}</p>
                    <p className="text-xs text-muted-foreground">Semana</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{metrics?.users_month || 0}</p>
                    <p className="text-xs text-muted-foreground">Mês</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Distribuição de Planos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={planDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={20}
                          outerRadius={35}
                          dataKey="value"
                        >
                          {planDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1">
                    {planDistribution.map((plan) => (
                      <div key={plan.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: plan.color }}
                          />
                          <span>{plan.name}</span>
                        </div>
                        <span className="font-medium">{plan.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{churnRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Taxa de cancelamento</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Meta: &lt; 5%</p>
                    {churnRate <= 5 ? (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                        Saudável
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        Atenção
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="management" className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="management">
                <UserCog className="h-4 w-4 mr-2" />
                Gestão de Usuários
              </TabsTrigger>
              <TabsTrigger value="financial">
                <Wallet className="h-4 w-4 mr-2" />
                Financeiro
              </TabsTrigger>
              <TabsTrigger value="charts">
                <TrendingUp className="h-4 w-4 mr-2" />
                Gráficos
              </TabsTrigger>
              <TabsTrigger value="alerts">
                <Bell className="h-4 w-4 mr-2" />
                Alertas
                {unreadAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadAlerts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="logs">
                <History className="h-4 w-4 mr-2" />
                Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="management">
              <UserManagement />
            </TabsContent>

            <TabsContent value="financial">
              <FinancialDashboard />
            </TabsContent>

            <TabsContent value="charts" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Evolução de Cadastros</CardTitle>
                      <CardDescription>Novos usuários por dia</CardDescription>
                    </div>
                    <Select value={chartPeriod} onValueChange={setChartPeriod}>
                      <SelectTrigger className="w-[150px]">
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Últimos 7 dias</SelectItem>
                        <SelectItem value="30">Últimos 30 dias</SelectItem>
                        <SelectItem value="90">Últimos 90 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={registrationStats}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="registration_date"
                          tickFormatter={(value) =>
                            format(new Date(value), "dd/MM", { locale: ptBR })
                          }
                          className="text-xs"
                        />
                        <YAxis className="text-xs" />
                        <Tooltip
                          labelFormatter={(value) =>
                            format(new Date(value), "dd 'de' MMMM", { locale: ptBR })
                          }
                          formatter={(value: number) => [value, "Novos usuários"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="user_count"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary) / 0.2)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Receita por Plano</CardTitle>
                  <CardDescription>MRR dividido por tipo de assinatura</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mrrStats}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="plan_type"
                          tickFormatter={(value) => {
                            const labels: Record<string, string> = {
                              free: "Gratuito",
                              basic: "Básico",
                              pro: "Pro",
                            };
                            return labels[value] || value;
                          }}
                        />
                        <YAxis
                          tickFormatter={(value) => formatCurrency(value)}
                          className="text-xs"
                        />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Bar
                          dataKey="mrr"
                          name="MRR"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Usuários Recentes</CardTitle>
                  <CardDescription>Últimos 20 cadastros na plataforma</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Negócio</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Cadastro</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>{user.business_name || "-"}</TableCell>
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
                                {user.user_plan === "pro"
                                  ? "Pro"
                                  : user.user_plan === "basic"
                                  ? "Básico"
                                  : "Gratuito"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.onboarding_step === "completed" ? (
                                <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                                  Ativo
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-500 text-amber-600">
                                  Onboarding
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(user.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alerts">
              <Card>
                <CardHeader>
                  <CardTitle>Alertas do Sistema</CardTitle>
                  <CardDescription>Notificações e avisos importantes</CardDescription>
                </CardHeader>
                <CardContent>
                  {alerts.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum alerta no momento</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {alerts.map((alert) => {
                          const Icon = ALERT_ICONS[alert.type];
                          return (
                            <div
                              key={alert.id}
                              className={`p-4 rounded-lg border ${
                                alert.is_read ? "bg-muted/30" : "bg-card"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <Icon className={`h-5 w-5 mt-0.5 ${ALERT_COLORS[alert.type]}`} />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium">{alert.title}</h4>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistanceToNow(new Date(alert.created_at), {
                                        addSuffix: true,
                                        locale: ptBR,
                                      })}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {alert.message}
                                  </p>
                                </div>
                                {!alert.is_read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAlertAsRead(alert.id)}
                                  >
                                    Marcar como lido
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="logs">
              <Card>
                <CardHeader>
                  <CardTitle>Logs de Acesso</CardTitle>
                  <CardDescription>Últimas 50 ações registradas no sistema</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ação</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead>Data/Hora</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {accessLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-medium">{log.action}</TableCell>
                            <TableCell>
                              {log.success ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-destructive" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {log.ip_address || "-"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", {
                                locale: ptBR,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </RequirePermission>
  );
}
