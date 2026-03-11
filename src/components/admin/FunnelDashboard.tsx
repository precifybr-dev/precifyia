import { useState } from "react";
import { useFunnelData } from "@/hooks/useFunnelData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { MousePointerClick, UserPlus, CreditCard, ShoppingCart, TrendingDown, ArrowDown, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateSP } from "@/lib/date-utils";

const EVENT_LABELS: Record<string, string> = {
  cta_click: "Clique CTA",
  signup_started: "Cadastro iniciado",
  signup_completed: "Conta criada",
  trial_started: "Trial iniciado",
  checkout_opened: "Carrinho aberto",
  payment_completed: "Pagamento OK",
  payment_abandoned: "Pagamento abandonado",
  trial_expired: "Trial expirado",
};

const CTA_LABELS: Record<string, string> = {
  header_cta: "Header",
  hero_cta: "Hero",
  pain_cta: "Dor",
  comparison_cta: "Comparação",
  demo_cta: "Calculadora",
  differentials_cta: "Diferenciais",
  pricing_free_cta: "Pricing (Teste)",
  pricing_basic_cta: "Pricing (Básico)",
  pricing_pro_cta: "Pricing (Pro)",
  final_cta: "CTA Final",
};

const FUNNEL_COLORS = [
  "hsl(var(--primary))",
  "hsl(221 83% 53%)",
  "hsl(262 83% 58%)",
  "hsl(280 65% 60%)",
  "hsl(var(--warning))",
  "hsl(var(--success))",
];

export function FunnelDashboard() {
  const [period, setPeriod] = useState("30");
  const { steps, ctaPerformance, recentEvents, referralSources, kpis, isLoading, refetch } = useFunnelData(parseInt(period));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Funil de Conversão</h2>
          <p className="text-sm text-muted-foreground">Rastreamento completo da jornada do visitante</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <MousePointerClick className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.totalCtaClicks}</p>
                <p className="text-xs text-muted-foreground">Cliques em CTA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.ctaToSignupRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">CTA → Cadastro</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <CreditCard className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.trialToPaymentRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Trial → Pagamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <ShoppingCart className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kpis.cartAbandonRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Abandono de carrinho</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visualização do Funil</CardTitle>
          <CardDescription>Volume por etapa da jornada</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={steps} layout="vertical" margin={{ left: 20, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="label" width={140} className="text-xs" />
                <Tooltip
                  formatter={(value: number, _name: string, props: any) => [
                    `${value} (${props.payload.percentage.toFixed(1)}%)`,
                    "Eventos",
                  ]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {steps.map((_, index) => (
                    <Cell key={index} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Dropoff indicators */}
          <div className="mt-4 space-y-2">
            {steps.map((step, i) => (
              i > 0 && step.dropoff > 0 ? (
                <div key={step.eventType} className="flex items-center gap-2 text-sm">
                  <ArrowDown className="h-3 w-3 text-destructive" />
                  <span className="text-muted-foreground">
                    {steps[i - 1].label} → {step.label}:
                  </span>
                  <Badge variant="outline" className="text-destructive border-destructive/30">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    -{step.dropoff.toFixed(1)}%
                  </Badge>
                </div>
              ) : null
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* CTA Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Performance por CTA</CardTitle>
            <CardDescription>Qual botão converte mais</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Botão</TableHead>
                    <TableHead className="text-center">Cliques</TableHead>
                    <TableHead className="text-center">Signups</TableHead>
                    <TableHead className="text-right">Conversão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ctaPerformance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum dado ainda
                      </TableCell>
                    </TableRow>
                  ) : (
                    ctaPerformance.map((cta) => (
                      <TableRow key={cta.cta_id}>
                        <TableCell className="font-medium text-sm">
                          {CTA_LABELS[cta.cta_id] || cta.cta_id}
                        </TableCell>
                        <TableCell className="text-center">{cta.clicks}</TableCell>
                        <TableCell className="text-center">{cta.signups}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={cta.conversionRate > 20 ? "default" : "secondary"}>
                            {cta.conversionRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eventos Recentes</CardTitle>
            <CardDescription>Últimos 50 eventos registrados</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>CTA</TableHead>
                    <TableHead className="text-right">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        Nenhum evento registrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {EVENT_LABELS[event.event_type] || event.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {event.cta_id ? (CTA_LABELS[event.cta_id] || event.cta_id) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {formatDateSP(event.created_at, "dd/MM HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Referral Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como conheceram o Precify</CardTitle>
          <CardDescription>Origem dos usuários cadastrados</CardDescription>
        </CardHeader>
        <CardContent>
          {referralSources.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum dado ainda</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={referralSources}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ label, percentage }) => `${label} ${percentage.toFixed(0)}%`}
                    >
                      {referralSources.map((_, index) => (
                        <Cell key={index} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [value, "Usuários"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {referralSources.map((src, i) => (
                  <div key={src.source} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length] }}
                      />
                      <span>{src.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{src.count}</span>
                      <Badge variant="outline" className="text-xs">{src.percentage.toFixed(1)}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
