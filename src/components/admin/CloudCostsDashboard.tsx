import { useState } from "react";
import { useCloudCosts } from "@/hooks/useCloudCosts";
import { KPICard } from "./KPICard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Server, Cpu, DollarSign, Activity, RefreshCcw, Users,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ENDPOINT_LABELS: Record<string, string> = {
  "generate-combo": "Gerar Combo IA",
  "generate-menu-strategy": "Estratégia de Menu",
  "parse-ifood-menu": "Importar Cardápio iFood",
  "analyze-menu-performance": "Análise de Performance",
  "analyze-spreadsheet-columns": "Importar Planilha",
  "calculate-recipe-pricing": "Calcular Precificação",
  "calculate-business-metrics": "Métricas do Negócio",
  "calculate-ifood-fees": "Taxas iFood",
};

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(142 71% 45%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(200 80% 50%)",
  "hsl(350 80% 55%)",
];

const formatUSD = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 4 }).format(value);

const formatUSD2 = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);

export function CloudCostsDashboard() {
  const [daysBack, setDaysBack] = useState(30);
  const { data, isLoading, refetch } = useCloudCosts(daysBack);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const { totals, byEndpoint, byUser, daily } = data;

  const pieData = byEndpoint.slice(0, 6).map((e) => ({
    name: ENDPOINT_LABELS[e.endpoint] || e.endpoint,
    value: Number(e.total_cost.toFixed(4)),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Custos Cloud & IA
          </h2>
          <p className="text-sm text-muted-foreground">
            Controle de gastos com infraestrutura e inteligência artificial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(daysBack)} onValueChange={(v) => setDaysBack(Number(v))}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="14">14 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="60">60 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refetch}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Custo Total (período)"
          value={formatUSD2(totals.totalCost)}
          subtitle={`IA: ${formatUSD2(totals.totalAICost)} | Cloud: ${formatUSD2(totals.totalCloudCost)}`}
          icon={<DollarSign className="h-5 w-5" />}
          variant="primary"
        />
        <KPICard
          title="Custo Médio por Usuário"
          value={formatUSD(totals.avgCostPerUser)}
          subtitle={`${totals.totalUsers} usuários ativos`}
          icon={<Users className="h-5 w-5" />}
        />
        <KPICard
          title="CAC Técnico"
          value={formatUSD(totals.avgCostPerUser)}
          subtitle="Custo de infra por novo usuário"
          icon={<Cpu className="h-5 w-5" />}
          variant="warning"
        />
        <KPICard
          title="Chamadas de IA"
          value={totals.totalCalls.toLocaleString("pt-BR")}
          subtitle={`~${formatUSD(totals.avgCostPerCall)} por chamada`}
          icon={<Activity className="h-5 w-5" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily Evolution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Evolução Diária de Custos</CardTitle>
            <CardDescription>IA + Cloud em USD</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="day"
                    tickFormatter={(v) => format(new Date(v), "dd/MM", { locale: ptBR })}
                    className="text-xs"
                  />
                  <YAxis tickFormatter={(v) => `$${v}`} className="text-xs" />
                  <Tooltip
                    formatter={(value: number) => formatUSD(value)}
                    labelFormatter={(v) => format(new Date(v), "dd/MM/yyyy", { locale: ptBR })}
                  />
                  <Area type="monotone" dataKey="ai_cost" name="IA" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="cloud_cost" name="Cloud" stackId="1" stroke="hsl(142 71% 45%)" fill="hsl(142 71% 45%)" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Feature</CardTitle>
            <CardDescription>Custo por endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatUSD(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Endpoint Breakdown Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custo por Endpoint</CardTitle>
          <CardDescription>Qual feature consome mais recursos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byEndpoint} layout="vertical" margin={{ left: 150 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tickFormatter={(v) => `$${v.toFixed(3)}`} />
                <YAxis type="category" dataKey="endpoint" tickFormatter={(v) => ENDPOINT_LABELS[v] || v} width={140} className="text-xs" />
                <Tooltip formatter={(v: number) => formatUSD(v)} />
                <Bar dataKey="ai_cost" name="IA" stackId="a" fill="hsl(var(--primary))" />
                <Bar dataKey="cloud_cost" name="Cloud" stackId="a" fill="hsl(142 71% 45%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Users */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Usuários por Consumo</CardTitle>
            <CardDescription>Quem mais consome recursos</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="text-right">Chamadas</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byUser.map((u, i) => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium truncate max-w-[180px]">
                            {u.business_name || u.email || "—"}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {u.user_plan || "free"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">{u.calls}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{u.total_tokens.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatUSD(u.total_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Endpoint Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhamento por Endpoint</CardTitle>
            <CardDescription>Chamadas, tokens e custo médio</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="text-right">Chamadas</TableHead>
                    <TableHead className="text-right">Méd. Tokens</TableHead>
                    <TableHead className="text-right">Custo Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byEndpoint.map((e) => (
                    <TableRow key={e.endpoint}>
                      <TableCell>
                        <p className="text-sm font-medium">{ENDPOINT_LABELS[e.endpoint] || e.endpoint}</p>
                        <p className="text-[10px] text-muted-foreground">{e.unique_users} usuários</p>
                      </TableCell>
                      <TableCell className="text-right text-sm">{e.calls}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{e.avg_tokens_per_call.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-semibold">{formatUSD(e.total_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Budget Reference */}
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Server className="h-5 w-5 text-primary shrink-0" />
            <div>
              <p className="font-medium text-foreground">Referência de Orçamento Lovable Cloud</p>
              <p>Cloud: $25/mês | IA: $1/mês incluídos. Custo base por 1K tokens: $0.01 (Gemini Flash). Overhead Cloud: $0.001 por chamada.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
