import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRBAC } from "@/hooks/useRBAC";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";
import { RequirePermission } from "@/components/rbac";
import { AdminSecurityGate } from "@/components/admin/AdminSecurityGate";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { KPICard } from "@/components/admin/KPICard";
import { UserManagement } from "@/components/admin/UserManagement";
import { FinancialDashboard } from "@/components/admin/FinancialDashboard";
import { SupportDashboard } from "@/components/admin/SupportDashboard";
import { UsageMetricsDashboard } from "@/components/admin/UsageMetricsDashboard";
import { ConversionMetricsBlock } from "@/components/admin/ConversionMetricsBlock";
import { CombosDashboard } from "@/components/admin/CombosDashboard";
import { AffiliatesDashboard } from "@/components/admin/AffiliatesDashboard";
import { CommissionConfigPanel } from "@/components/admin/CommissionConfigPanel";
import { MonetizationPanel } from "@/components/admin/MonetizationPanel";
import { PlanLimitsTable } from "@/components/admin/PlanLimitsTable";
import { UniversityDashboard } from "@/components/admin/UniversityDashboard";
import { FunnelDashboard } from "@/components/admin/FunnelDashboard";
import { ControllershipDashboard } from "@/components/admin/ControllershipDashboard";
import { StrategicPricingDashboard } from "@/components/admin/StrategicPricingDashboard";
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
  Sparkles,
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
  Headphones,
  BarChart3,
  LayoutDashboard,
  Ticket,
  GraduationCap,
  MousePointerClick,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const PLAN_COLORS = {
  free: "hsl(var(--muted-foreground))",
  basic: "hsl(var(--primary))",
  pro: "hsl(142 71% 45%)",
};

const ALERT_ICONS = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  success: CheckCircle2,
};

const ALERT_COLORS = {
  info: "text-primary",
  warning: "text-warning",
  error: "text-destructive",
  success: "text-success",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id);
    };
    getUser();
  }, []);

  // Read section from navigation state
  useEffect(() => {
    const section = (location.state as any)?.section;
    if (section) {
      setActiveTab(section);
      // Clear state to prevent re-activation on future navigations
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AdminSecurityGate>
      <RequirePermission
        permission="view_metrics"
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-background">
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
                <Button onClick={() => navigate("/")} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao Início
                </Button>
              </CardContent>
            </Card>
          </div>
        }
      >
        <AdminLayout unreadAlerts={unreadAlerts.length} activeSection={activeTab} onSectionChange={setActiveTab}>
          <AdminHeader
            title="Dashboard Administrativo"
            subtitle="Visão geral da plataforma"
            icon={<LayoutDashboard className="h-6 w-6" />}
            unreadAlerts={unreadAlerts.length}
            isLoading={isLoading}
            onRefresh={refetch}
          />

          <div className="p-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Usuários Ativos"
                value={activeUsers}
                subtitle={`+${metrics?.users_today || 0} hoje`}
                icon={<Users className="h-5 w-5" />}
                variant="primary"
              />
              <KPICard
                title="MRR"
                value={formatCurrency(totalMRR)}
                subtitle="Receita mensal recorrente"
                icon={<DollarSign className="h-5 w-5" />}
                variant="success"
              />
              <KPICard
                title="ARPU"
                value={formatCurrency(arpu)}
                subtitle="Receita média por usuário"
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <KPICard
                title="LTV Médio"
                value={formatCurrency(averageLTV)}
                subtitle="Lifetime value estimado"
                icon={<Activity className="h-5 w-5" />}
              />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-primary" />
                    Novos Cadastros
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{metrics?.users_today || 0}</p>
                      <p className="text-xs text-muted-foreground">Hoje</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{metrics?.users_week || 0}</p>
                      <p className="text-xs text-muted-foreground">Semana</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{metrics?.users_month || 0}</p>
                      <p className="text-xs text-muted-foreground">Mês</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
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
                    <div className="flex-1 space-y-2">
                      {planDistribution.map((plan) => (
                        <div key={plan.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: plan.color }}
                            />
                            <span className="text-muted-foreground">{plan.name}</span>
                          </div>
                          <span className="font-semibold">{plan.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-3xl font-bold">{churnRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Taxa de cancelamento</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-1">Meta: &lt; 5%</p>
                      {churnRate <= 5 ? (
                        <Badge className="bg-success/10 text-success hover:bg-success/20 border-0">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Saudável
                        </Badge>
                      ) : (
                        <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-0">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Atenção
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="bg-muted/50 p-1 h-auto flex-wrap gap-1">
                <TabsTrigger value="overview" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <LayoutDashboard className="h-4 w-4" />
                  Visão Geral
                </TabsTrigger>
                <TabsTrigger value="management" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <UserCog className="h-4 w-4" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="financial" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Wallet className="h-4 w-4" />
                  Financeiro
                </TabsTrigger>
                <TabsTrigger value="support" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Headphones className="h-4 w-4" />
                  Suporte
                  {unreadAlerts.length > 0 && (
                    <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                      {unreadAlerts.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="usage" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <BarChart3 className="h-4 w-4" />
                  Métricas
                </TabsTrigger>
                <TabsTrigger value="combos" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Sparkles className="h-4 w-4" />
                  Combos IA
                </TabsTrigger>
                <TabsTrigger value="affiliates" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Ticket className="h-4 w-4" />
                  Cupons & Afiliados
                </TabsTrigger>
                <TabsTrigger value="commissions" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <DollarSign className="h-4 w-4" />
                  Comissões
                </TabsTrigger>
                <TabsTrigger value="monetization" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <TrendingUp className="h-4 w-4" />
                  Monetização
                </TabsTrigger>
                <TabsTrigger value="university" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <GraduationCap className="h-4 w-4" />
                  Universidade
                </TabsTrigger>
                <TabsTrigger value="funnel" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <MousePointerClick className="h-4 w-4" />
                  Funil
                </TabsTrigger>
                <TabsTrigger value="controllership" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <TrendingUp className="h-4 w-4" />
                  Controladoria
                </TabsTrigger>
                <TabsTrigger value="pricing" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <DollarSign className="h-4 w-4" />
                  Precificação
                </TabsTrigger>
                <TabsTrigger value="logs" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <History className="h-4 w-4" />
                  Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">Evolução de Cadastros</CardTitle>
                          <CardDescription>Novos usuários por dia</CardDescription>
                        </div>
                        <Select value={chartPeriod} onValueChange={setChartPeriod}>
                          <SelectTrigger className="w-[140px]">
                            <Calendar className="h-4 w-4 mr-2" />
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
                      <div className="h-[250px]">
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
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="user_count"
                              stroke="hsl(var(--primary))"
                              fill="hsl(var(--primary) / 0.2)"
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Receita por Plano</CardTitle>
                      <CardDescription>MRR dividido por tipo de assinatura</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={mrrStats}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="plan_type"
                              tickFormatter={(value) =>
                                value === "free" ? "Gratuito" : value === "basic" ? "Básico" : "Pro"
                              }
                              className="text-xs"
                            />
                            <YAxis
                              tickFormatter={(value) => formatCurrency(value)}
                              className="text-xs"
                            />
                            <Tooltip
                              formatter={(value: number) => [formatCurrency(value), "MRR"]}
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                            />
                            <Bar dataKey="mrr" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Conversion Metrics & Plan Limits */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ConversionMetricsBlock
                    totalUsers={metrics?.total_users || 0}
                    freeUsers={metrics?.free_plan_users || 0}
                    basicUsers={metrics?.basic_plan_users || 0}
                    proUsers={metrics?.pro_plan_users || 0}
                    churnRate={churnRate}
                    mrr={totalMRR}
                    arpu={arpu}
                  />
                  <PlanLimitsTable
                    freeUsers={metrics?.free_plan_users || 0}
                    basicUsers={metrics?.basic_plan_users || 0}
                    proUsers={metrics?.pro_plan_users || 0}
                  />
                </div>

                {/* Recent Users & Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-primary" />
                        Usuários Recentes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>E-mail</TableHead>
                              <TableHead>Plano</TableHead>
                              <TableHead className="text-right">Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {recentUsers.slice(0, 10).map((user) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium text-sm">
                                  <div>
                                    <p className="truncate max-w-[200px]">{user.email}</p>
                                    {user.business_name && (
                                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                        {user.business_name}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={user.user_plan === "pro" ? "default" : "secondary"}
                                    className="capitalize"
                                  >
                                    {user.user_plan || "free"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(user.created_at), {
                                    addSuffix: true,
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

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Bell className="h-4 w-4 text-primary" />
                        Alertas do Sistema
                        {unreadAlerts.length > 0 && (
                          <Badge variant="destructive">{unreadAlerts.length}</Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[300px]">
                        {alerts.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
                            <CheckCircle2 className="h-10 w-10 mb-2 text-success" />
                            <p>Nenhum alerta no momento</p>
                          </div>
                        ) : (
                          <div className="space-y-1 p-4">
                            {alerts.slice(0, 10).map((alert) => {
                              const AlertIcon = ALERT_ICONS[alert.type] || Info;
                              return (
                                <div
                                  key={alert.id}
                                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-muted/50 ${
                                    !alert.is_read ? "bg-muted/30" : ""
                                  }`}
                                  onClick={() => markAlertAsRead(alert.id)}
                                >
                                  <AlertIcon
                                    className={`h-5 w-5 flex-shrink-0 ${ALERT_COLORS[alert.type]}`}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{alert.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {alert.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {formatDistanceToNow(new Date(alert.created_at), {
                                        addSuffix: true,
                                        locale: ptBR,
                                      })}
                                    </p>
                                  </div>
                                  {!alert.is_read && (
                                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="management">
                <UserManagement onImpersonate={() => navigate("/app")} />
              </TabsContent>

              <TabsContent value="financial">
                <FinancialDashboard />
              </TabsContent>

              <TabsContent value="support">
                <SupportDashboard />
              </TabsContent>

              <TabsContent value="usage">
                <UsageMetricsDashboard />
              </TabsContent>

              <TabsContent value="combos">
                <CombosDashboard />
              </TabsContent>

              <TabsContent value="affiliates">
                <AffiliatesDashboard />
              </TabsContent>

              <TabsContent value="commissions">
                <CommissionConfigPanel />
              </TabsContent>

              <TabsContent value="monetization">
                <MonetizationPanel />
              </TabsContent>

              <TabsContent value="university">
                <UniversityDashboard />
              </TabsContent>

               <TabsContent value="funnel">
                <FunnelDashboard />
              </TabsContent>

              <TabsContent value="controllership">
                <ControllershipDashboard />
              </TabsContent>

              <TabsContent value="pricing">
                <StrategicPricingDashboard />
              </TabsContent>

              <TabsContent value="logs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="h-4 w-4 text-primary" />
                      Logs de Acesso
                    </CardTitle>
                    <CardDescription>Últimas 50 ações registradas</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Ação</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>IP</TableHead>
                            <TableHead className="text-right">Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {accessLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell className="font-medium text-sm">
                                {log.action}
                              </TableCell>
                              <TableCell>
                                {log.success ? (
                                  <Badge className="bg-success/10 text-success hover:bg-success/20 border-0">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Sucesso
                                  </Badge>
                                ) : (
                                  <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-0">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Falha
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono">
                                {log.ip_address || "—"}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
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
        </AdminLayout>
      </RequirePermission>
    </AdminSecurityGate>
  );
}
