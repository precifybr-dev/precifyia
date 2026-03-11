import { RequirePermission } from "@/components/rbac";
import { useUsageMetrics } from "@/hooks/useUsageMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Activity,
  Users,
  Clock,
  TrendingDown,
  AlertTriangle,
  RefreshCcw,
  Shield,
  Loader2,
  BarChart3,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateSP } from "@/lib/date-utils";

const CATEGORY_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const FEATURE_LABELS: Record<string, string> = {
  login: "Login",
  page_view: "Visualização de página",
  dashboard_access: "Acesso ao Dashboard",
  report_created: "Criação de relatório",
  export: "Exportação",
  ingredient_create: "Criar ingrediente",
  ingredient_update: "Atualizar ingrediente",
  recipe_create: "Criar receita",
  recipe_update: "Atualizar receita",
};

const CATEGORY_LABELS: Record<string, string> = {
  auth: "Autenticação",
  navigation: "Navegação",
  feature: "Funcionalidades",
  export: "Exportações",
  data: "Dados",
  general: "Geral",
};

export function UsageMetricsDashboard() {
  const {
    isLoading,
    period,
    setPeriod,
    inactiveDaysThreshold,
    setInactiveDaysThreshold,
    refetch,
    dailyActiveUsers,
    sessionStats,
    topFeatures,
    inactiveUsers,
    churnRiskUsers,
    eventCategories,
    hourlyUsage,
    todayDAU,
    avgDAU,
    totalEvents,
  } = useUsageMetrics();

  return (
    <RequirePermission
      permission="view_metrics"
      fallback={
        <Card>
          <CardContent className="py-8">
            <div className="flex flex-col items-center justify-center text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Acesso Restrito</h3>
              <p className="text-muted-foreground">
                Você não tem permissão para visualizar métricas de uso.
              </p>
            </div>
          </CardContent>
        </Card>
      }
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Métricas de Uso
            </h2>
            <p className="text-sm text-muted-foreground">
              Análise de engajamento e comportamento dos usuários
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period.toString()} onValueChange={(v) => setPeriod(parseInt(v))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="14">Últimos 14 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="60">Últimos 60 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">DAU (Hoje)</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayDAU}</div>
              <p className="text-xs text-muted-foreground">Usuários ativos hoje</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">DAU Médio</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgDAU}</div>
              <p className="text-xs text-muted-foreground">Média no período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessionStats?.avg_duration_minutes.toFixed(1) || 0} min
              </div>
              <p className="text-xs text-muted-foreground">Por sessão</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Risco de Churn</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{churnRiskUsers.length}</div>
              <p className="text-xs text-muted-foreground">Usuários em risco</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="features">
              <Zap className="h-4 w-4 mr-2" />
              Funcionalidades
            </TabsTrigger>
            <TabsTrigger value="churn">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Risco de Churn
            </TabsTrigger>
            <TabsTrigger value="inactive">
              <Users className="h-4 w-4 mr-2" />
              Usuários Inativos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* DAU Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Usuários Ativos Diários</CardTitle>
                  <CardDescription>Evolução do DAU nos últimos {period} dias</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-[250px]">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : dailyActiveUsers.length === 0 ? (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  ) : (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyActiveUsers}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="activity_date"
                            tickFormatter={(v) => formatDateSP(v, "dd/MM")}
                            className="text-xs"
                          />
                          <YAxis className="text-xs" />
                          <Tooltip
                            labelFormatter={(v) =>
                              formatDateSP(v, "dd 'de' MMMM")
                            }
                            formatter={(v: number) => [v, "Usuários ativos"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="active_users"
                            stroke="hsl(var(--primary))"
                            fill="hsl(var(--primary) / 0.2)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Event Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Eventos por Categoria</CardTitle>
                  <CardDescription>Distribuição de eventos rastreados</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-[250px]">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : eventCategories.length === 0 ? (
                    <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 h-[250px]">
                      <div className="w-1/2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={eventCategories}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              dataKey="event_count"
                              nameKey="event_category"
                            >
                              {eventCategories.map((_, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v: number, name: string) => [
                                v,
                                CATEGORY_LABELS[name] || name,
                              ]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-1/2 space-y-2">
                        {eventCategories.map((cat, index) => (
                          <div key={cat.event_category} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{
                                  backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                                }}
                              />
                              <span className="text-sm">
                                {CATEGORY_LABELS[cat.event_category] || cat.event_category}
                              </span>
                            </div>
                            <span className="text-sm font-medium">{cat.event_count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Hourly Usage */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Uso por Hora do Dia</CardTitle>
                  <CardDescription>
                    Distribuição horária dos eventos nos últimos 7 dias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-[200px]">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : hourlyUsage.length === 0 ? (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  ) : (
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyUsage}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="hour_of_day"
                            tickFormatter={(v) => `${v}h`}
                            className="text-xs"
                          />
                          <YAxis className="text-xs" />
                          <Tooltip
                            labelFormatter={(v) => `${v}:00 - ${v}:59`}
                            formatter={(v: number) => [v, "Eventos"]}
                          />
                          <Bar
                            dataKey="event_count"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Funcionalidades Mais Utilizadas</CardTitle>
                <CardDescription>
                  Top 10 funcionalidades nos últimos {period} dias
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : topFeatures.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Funcionalidade</TableHead>
                        <TableHead className="text-right">Usos</TableHead>
                        <TableHead className="text-right">Usuários Únicos</TableHead>
                        <TableHead className="text-right">Média por Usuário</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topFeatures.map((feature, index) => (
                        <TableRow key={feature.feature_name}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="w-6 justify-center">
                                {index + 1}
                              </Badge>
                              {FEATURE_LABELS[feature.feature_name] || feature.feature_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {feature.usage_count}
                          </TableCell>
                          <TableCell className="text-right">{feature.unique_users}</TableCell>
                          <TableCell className="text-right">
                            {(feature.usage_count / feature.unique_users).toFixed(1)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="churn">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Usuários em Risco de Churn
                </CardTitle>
                <CardDescription>
                  Usuários que tinham alta atividade e agora estão inativos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : churnRiskUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mb-4 text-emerald-500" />
                    <p className="font-medium text-emerald-600">Nenhum usuário em risco identificado</p>
                    <p className="text-sm">Todos os usuários ativos estão engajados</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Atividade Anterior</TableHead>
                          <TableHead>Dias Inativo</TableHead>
                          <TableHead>Último Acesso</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {churnRiskUsers.map((user) => (
                          <TableRow key={user.user_id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.email}</p>
                                <p className="text-sm text-muted-foreground">
                                  {user.business_name || "-"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={user.user_plan === "pro" ? "default" : "secondary"}
                              >
                                {user.user_plan}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  user.previous_activity_level === "high"
                                    ? "border-destructive text-destructive"
                                    : user.previous_activity_level === "medium"
                                    ? "border-amber-500 text-amber-500"
                                    : ""
                                }
                              >
                                {user.previous_activity_level === "high"
                                  ? "Alta"
                                  : user.previous_activity_level === "medium"
                                  ? "Média"
                                  : "Baixa"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-destructive font-medium">
                                {user.days_since_active} dias
                              </span>
                            </TableCell>
                            <TableCell>
                              {formatDistanceToNow(new Date(user.last_activity), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inactive">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Usuários Inativos</CardTitle>
                    <CardDescription>
                      Usuários sem atividade nos últimos {inactiveDaysThreshold} dias
                    </CardDescription>
                  </div>
                  <Select
                    value={inactiveDaysThreshold.toString()}
                    onValueChange={(v) => setInactiveDaysThreshold(parseInt(v))}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="14">14 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : inactiveUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mb-4 text-emerald-500" />
                    <p className="font-medium text-emerald-600">Todos os usuários estão ativos!</p>
                    <p className="text-sm">Nenhum usuário inativo no período selecionado</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Empresa</TableHead>
                          <TableHead>Dias Inativo</TableHead>
                          <TableHead>Último Acesso</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inactiveUsers.map((user) => (
                          <TableRow key={user.user_id}>
                            <TableCell>
                              <p className="font-medium">{user.email}</p>
                            </TableCell>
                            <TableCell>{user.business_name || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.days_inactive > 30
                                    ? "destructive"
                                    : user.days_inactive > 14
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {user.days_inactive} dias
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {formatDistanceToNow(new Date(user.last_activity), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RequirePermission>
  );
}
