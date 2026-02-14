import { useState } from "react";
import { useControllershipData } from "@/hooks/useControllershipData";
import { useFunnelData } from "@/hooks/useFunnelData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  DollarSign, TrendingUp, Target, Users, AlertTriangle, CheckCircle2,
  RefreshCcw, Download, Megaphone, Settings, BarChart3, Zap,
  ArrowUpRight, ArrowDownRight, ShieldAlert, Calculator, Eye,
  Plus, Save, Percent, Clock, Activity,
} from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatPercent = (v: number) => `${v.toFixed(1)}%`;

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function AlertBadge({ value, goodMin, warnMin, inverse, labels }: {
  value: number; goodMin: number; warnMin: number; inverse?: boolean;
  labels?: [string, string, string];
}) {
  const l = labels || ["Crítico", "Atenção", "Saudável"];
  let level: 0 | 1 | 2;
  if (inverse) {
    level = value > goodMin ? 0 : value > warnMin ? 1 : 2;
  } else {
    level = value < warnMin ? 0 : value < goodMin ? 1 : 2;
  }
  const colors = [
    "bg-destructive/10 text-destructive border-destructive/30",
    "bg-amber-500/10 text-amber-600 border-amber-500/30",
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  ];
  const icons = [<AlertTriangle key="a" className="h-3 w-3 mr-1" />, <AlertTriangle key="b" className="h-3 w-3 mr-1" />, <CheckCircle2 key="c" className="h-3 w-3 mr-1" />];
  return <Badge variant="outline" className={`${colors[level]} font-medium`}>{icons[level]}{l[level]}</Badge>;
}

export function ControllershipDashboard() {
  const {
    metrics, marketingData, campaigns, config,
    isLoading, selectedMonth, selectedYear,
    setSelectedMonth, setSelectedYear,
    saveMarketingData, saveCampaign, updateConfig, refetch, fetchMetrics,
  } = useControllershipData();

  const { steps: funnelSteps, kpis: funnelKpis } = useFunnelData(30);

  // Marketing input form
  const [mktForm, setMktForm] = useState({
    total_investment: "", impressions: "", clicks: "", leads_captured: "",
    source: "all", notes: "",
  });

  // Campaign form
  const [campForm, setCampForm] = useState({
    name: "", platform: "meta", monthly_budget: "", notes: "",
  });

  // Simulation state
  const [simCpl, setSimCpl] = useState(10);
  const [simConversion, setSimConversion] = useState(5);
  const [simTicket, setSimTicket] = useState(75);
  const [simRetention, setSimRetention] = useState(6);
  const [simReinvest, setSimReinvest] = useState(30);

  const handleSaveMarketing = async () => {
    const ok = await saveMarketingData({
      month: selectedMonth, year: selectedYear,
      total_investment: parseFloat(mktForm.total_investment) || 0,
      impressions: parseInt(mktForm.impressions) || 0,
      clicks: parseInt(mktForm.clicks) || 0,
      leads_captured: parseInt(mktForm.leads_captured) || 0,
      source: mktForm.source, notes: mktForm.notes || undefined,
    });
    if (ok) {
      toast.success("Dados de marketing salvos");
      setMktForm({ total_investment: "", impressions: "", clicks: "", leads_captured: "", source: "all", notes: "" });
    } else {
      toast.error("Erro ao salvar dados");
    }
  };

  const handleSaveCampaign = async () => {
    if (!campForm.name) { toast.error("Nome da campanha é obrigatório"); return; }
    const ok = await saveCampaign({
      name: campForm.name, platform: campForm.platform,
      monthly_budget: parseFloat(campForm.monthly_budget) || 0,
      notes: campForm.notes || undefined,
    });
    if (ok) {
      toast.success("Campanha registrada");
      setCampForm({ name: "", platform: "meta", monthly_budget: "", notes: "" });
    }
  };

  const handleMonthChange = (m: string) => {
    setSelectedMonth(parseInt(m));
    fetchMetrics(parseInt(m), selectedYear);
  };

  const handleYearChange = (y: string) => {
    setSelectedYear(parseInt(y));
    fetchMetrics(selectedMonth, parseInt(y));
  };

  // Simulation calculations
  const simLeads = simCpl > 0 ? Math.round((metrics?.total_marketing_investment || 1000) / simCpl) : 0;
  const simClients = Math.round(simLeads * (simConversion / 100));
  const simLTV = simTicket * simRetention;
  const simCAC = simClients > 0 ? (metrics?.total_marketing_investment || 1000) / simClients : 0;
  const simPayback = simTicket > 0 ? simCAC / simTicket : 0;
  const simROI = simCAC > 0 ? ((simLTV - simCAC) / simCAC) * 100 : 0;

  // Projection data (3, 6, 12 months)
  const generateProjections = () => {
    const baseMRR = metrics?.mrr || 0;
    const growth = (metrics?.monthly_growth_rate || 5) / 100;
    const pessimist = growth * 0.5;
    const optimist = growth * 1.5;
    return [3, 6, 12].map(m => ({
      months: `${m} meses`,
      pessimista: Math.round(baseMRR * Math.pow(1 + pessimist, m)),
      realista: Math.round(baseMRR * Math.pow(1 + growth, m)),
      otimista: Math.round(baseMRR * Math.pow(1 + optimist, m)),
    }));
  };

  const projections = generateProjections();

  const exportCSV = () => {
    if (!metrics) return;
    const rows = [
      { Métrica: "MRR", Valor: metrics.mrr },
      { Métrica: "ARR Projetado", Valor: metrics.arr_projected },
      { Métrica: "CAC", Valor: metrics.cac },
      { Métrica: "CPL", Valor: metrics.cpl },
      { Métrica: "LTV", Valor: metrics.ltv },
      { Métrica: "LTV/CAC", Valor: metrics.ltv_cac_ratio },
      { Métrica: "Payback (meses)", Valor: metrics.payback_months },
      { Métrica: "Margem Líquida/Cliente", Valor: metrics.net_margin_per_client },
      { Métrica: "Churn %", Valor: metrics.churn_rate },
      { Métrica: "Crescimento %", Valor: metrics.monthly_growth_rate },
      { Métrica: "Receita Líquida", Valor: metrics.net_revenue },
    ];
    const csv = "Métrica,Valor\n" + rows.map(r => `${r.Métrica},${r.Valor}`).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `controladoria_${selectedMonth}_${selectedYear}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Controladoria Financeira & Growth
          </h2>
          <p className="text-sm text-muted-foreground">
            Métricas de capital aberto • Previsibilidade • Funil de Crescimento
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(selectedMonth)} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading}>
            <RefreshCcw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* CFO KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">MRR</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-lg font-bold">{formatCurrency(metrics?.mrr || 0)}</p>
            <p className="text-[10px] text-muted-foreground">ARR: {formatCurrency(metrics?.arr_projected || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">CAC</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-lg font-bold">{formatCurrency(metrics?.cac || 0)}</p>
            <AlertBadge value={metrics?.ltv_cac_ratio || 0} goodMin={3} warnMin={2} labels={["CAC Alto", "Atenção", "Saudável"]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">LTV</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-lg font-bold">{formatCurrency(metrics?.ltv || 0)}</p>
            <p className="text-[10px] text-muted-foreground">LTV/CAC: {(metrics?.ltv_cac_ratio || 0).toFixed(1)}x</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Payback</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-lg font-bold">{(metrics?.payback_months || 0).toFixed(1)} meses</p>
            <AlertBadge value={metrics?.payback_months || 0} goodMin={6} warnMin={12} inverse labels={["Lento", "OK", "Rápido"]} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-3">
            <CardTitle className="text-xs font-medium text-muted-foreground">Receita Líquida</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <p className="text-lg font-bold">{formatCurrency(metrics?.net_revenue || 0)}</p>
            <p className="text-[10px] text-muted-foreground">Margem/cliente: {formatCurrency(metrics?.net_margin_per_client || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">CPL</p>
            <p className="text-base font-bold">{formatCurrency(metrics?.cpl || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">CTR</p>
            <p className="text-base font-bold">{formatPercent(metrics?.ctr || 0)}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Churn</p>
            <p className="text-base font-bold">{formatPercent(metrics?.churn_rate || 0)}</p>
            <AlertBadge value={metrics?.churn_rate || 0} goodMin={3} warnMin={5} inverse />
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Crescimento</p>
            <p className="text-base font-bold flex items-center justify-center gap-1">
              {(metrics?.monthly_growth_rate || 0) >= 0 ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-destructive" />}
              {formatPercent(metrics?.monthly_growth_rate || 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Pagantes</p>
            <p className="text-base font-bold">{metrics?.total_paying_clients || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Investimento</p>
            <p className="text-base font-bold">{formatCurrency(metrics?.total_marketing_investment || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alert bar */}
      {metrics && metrics.ltv_cac_ratio > 0 && metrics.ltv_cac_ratio < 3 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">⚠️ Alerta: LTV/CAC = {metrics.ltv_cac_ratio.toFixed(1)}x (abaixo de 3x)</p>
              <p className="text-sm text-muted-foreground">O custo de aquisição está alto em relação ao valor do cliente. Reavalie campanhas ou aumente retenção.</p>
            </div>
          </CardContent>
        </Card>
      )}
      {metrics && metrics.cac > 0 && metrics.ltv > 0 && (metrics.cac / metrics.ltv) > 0.4 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-700">⚠️ CAC representa {((metrics.cac / metrics.ltv) * 100).toFixed(0)}% do LTV</p>
              <p className="text-sm text-muted-foreground">Idealmente o CAC não deve passar de 40% do LTV.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="funnel" className="space-y-4">
        <TabsList className="flex-wrap gap-1">
          <TabsTrigger value="funnel"><BarChart3 className="h-4 w-4 mr-1" />Funil Completo</TabsTrigger>
          <TabsTrigger value="marketing"><Megaphone className="h-4 w-4 mr-1" />Marketing</TabsTrigger>
          <TabsTrigger value="projection"><Target className="h-4 w-4 mr-1" />Previsibilidade</TabsTrigger>
          <TabsTrigger value="simulator"><Zap className="h-4 w-4 mr-1" />Simulador</TabsTrigger>
          <TabsTrigger value="config"><Settings className="h-4 w-4 mr-1" />Configuração</TabsTrigger>
        </TabsList>

        {/* FUNNEL TAB */}
        <TabsContent value="funnel" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Funnel visualization */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Funil de Conversão Completo</CardTitle>
                <CardDescription>Últimos 30 dias • Tracking automático</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    { label: "Impressões", value: metrics?.total_impressions || 0, color: "hsl(var(--primary))" },
                    { label: "Cliques", value: metrics?.total_clicks || 0, color: "hsl(var(--primary))" },
                    { label: "Leads (CTAs)", value: funnelKpis.totalCtaClicks, color: "hsl(var(--chart-1))" },
                    ...(funnelSteps.map(s => ({ label: s.label, value: s.count, color: "hsl(var(--chart-2))" }))),
                  ].map((step, i, arr) => {
                    const prevVal = i > 0 ? arr[i - 1].value : step.value;
                    const dropoff = prevVal > 0 ? ((prevVal - step.value) / prevVal * 100) : 0;
                    const pct = arr[0].value > 0 ? (step.value / arr[0].value * 100) : 0;
                    const width = Math.max(20, pct);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium">{step.label}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{step.value.toLocaleString("pt-BR")}</span>
                            {i > 0 && dropoff > 0 && (
                              <span className="text-xs text-destructive">-{dropoff.toFixed(1)}%</span>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-6 flex items-center">
                          <div
                            className="h-6 rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${width}%`, backgroundColor: step.color, minWidth: "40px" }}
                          >
                            <span className="text-[10px] text-white font-medium">{pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Conversion by stage chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Conversão por Etapa</CardTitle>
                <CardDescription>Taxa de conversão e perda entre etapas</CardDescription>
              </CardHeader>
              <CardContent>
                {funnelSteps.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={funnelSteps} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" />
                        <YAxis dataKey="label" type="category" width={120} className="text-xs" />
                        <Tooltip formatter={(v: number) => [v, "Eventos"]} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                          {funnelSteps.map((_, i) => (
                            <Cell key={i} fill={`hsl(var(--chart-${(i % 5) + 1}))`} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <p>Nenhum evento registrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Funnel KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">CTA → Cadastro</p>
              <p className="text-xl font-bold">{funnelKpis.ctaToSignupRate.toFixed(1)}%</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Trial → Pagamento</p>
              <p className="text-xl font-bold">{funnelKpis.trialToPaymentRate.toFixed(1)}%</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Abandono Carrinho</p>
              <p className="text-xl font-bold">{funnelKpis.cartAbandonRate.toFixed(1)}%</p>
            </CardContent></Card>
            <Card><CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Novos Pagantes/Mês</p>
              <p className="text-xl font-bold">{metrics?.new_clients_month || 0}</p>
            </CardContent></Card>
          </div>
        </TabsContent>

        {/* MARKETING TAB */}
        <TabsContent value="marketing" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Registrar Dados de Marketing
                </CardTitle>
                <CardDescription>Insira os dados de investimento do mês selecionado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Investimento Total (R$)</Label>
                    <Input type="number" placeholder="0.00" value={mktForm.total_investment}
                      onChange={e => setMktForm(p => ({ ...p, total_investment: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Origem</Label>
                    <Select value={mktForm.source} onValueChange={v => setMktForm(p => ({ ...p, source: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Consolidado</SelectItem>
                        <SelectItem value="meta">Meta Ads</SelectItem>
                        <SelectItem value="google">Google Ads</SelectItem>
                        <SelectItem value="organic">Orgânico</SelectItem>
                        <SelectItem value="referral">Indicação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Impressões</Label>
                    <Input type="number" placeholder="0" value={mktForm.impressions}
                      onChange={e => setMktForm(p => ({ ...p, impressions: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Cliques</Label>
                    <Input type="number" placeholder="0" value={mktForm.clicks}
                      onChange={e => setMktForm(p => ({ ...p, clicks: e.target.value }))} />
                  </div>
                  <div>
                    <Label className="text-xs">Leads Capturados</Label>
                    <Input type="number" placeholder="0" value={mktForm.leads_captured}
                      onChange={e => setMktForm(p => ({ ...p, leads_captured: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Observações</Label>
                  <Textarea placeholder="Notas sobre a campanha..." value={mktForm.notes}
                    onChange={e => setMktForm(p => ({ ...p, notes: e.target.value }))} className="h-16" />
                </div>
                <Button onClick={handleSaveMarketing} className="w-full">
                  <Save className="h-4 w-4 mr-2" /> Salvar Dados do Mês
                </Button>
              </CardContent>
            </Card>

            {/* Campaign registration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Registrar Campanha
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Nome da Campanha</Label>
                  <Input placeholder="Ex: Black Friday 2026" value={campForm.name}
                    onChange={e => setCampForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Plataforma</Label>
                    <Select value={campForm.platform} onValueChange={v => setCampForm(p => ({ ...p, platform: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meta">Meta Ads</SelectItem>
                        <SelectItem value="google">Google Ads</SelectItem>
                        <SelectItem value="tiktok">TikTok Ads</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Budget Mensal (R$)</Label>
                    <Input type="number" placeholder="0.00" value={campForm.monthly_budget}
                      onChange={e => setCampForm(p => ({ ...p, monthly_budget: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={handleSaveCampaign} className="w-full" variant="secondary">
                  <Plus className="h-4 w-4 mr-2" /> Cadastrar Campanha
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Marketing history */}
          {marketingData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Histórico de Investimentos</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Investimento</TableHead>
                      <TableHead className="text-right">Impressões</TableHead>
                      <TableHead className="text-right">Cliques</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">CPC</TableHead>
                      <TableHead className="text-right">CPL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketingData.map(d => (
                      <TableRow key={d.id}>
                        <TableCell>{MONTHS[d.month - 1]}/{d.year}</TableCell>
                        <TableCell><Badge variant="outline">{d.source}</Badge></TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(d.total_investment)}</TableCell>
                        <TableCell className="text-right">{d.impressions.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right">{d.clicks.toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right">{d.leads_captured}</TableCell>
                        <TableCell className="text-right">{d.clicks > 0 ? formatCurrency(d.total_investment / d.clicks) : "-"}</TableCell>
                        <TableCell className="text-right">{d.leads_captured > 0 ? formatCurrency(d.total_investment / d.leads_captured) : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Campaigns list */}
          {campaigns.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Campanhas Registradas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead className="text-right">Budget/Mês</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell><Badge variant="outline">{c.platform}</Badge></TableCell>
                        <TableCell className="text-right">{formatCurrency(c.monthly_budget)}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* PROJECTION TAB */}
        <TabsContent value="projection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4" />
                Projeção de Receita (MRR)
              </CardTitle>
              <CardDescription>Cenários pessimista, realista e otimista baseados na taxa de crescimento atual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projections}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="months" />
                    <YAxis tickFormatter={v => `R$${v}`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="pessimista" fill="hsl(var(--destructive))" name="Pessimista" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="realista" fill="hsl(var(--primary))" name="Realista" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="otimista" fill="hsl(142 71% 45%)" name="Otimista" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4">
                {projections.map(p => (
                  <Card key={p.months} className="bg-muted/30">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground font-medium mb-2">{p.months}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs"><span className="text-destructive">Pessimista</span><span className="font-medium">{formatCurrency(p.pessimista)}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-primary">Realista</span><span className="font-bold">{formatCurrency(p.realista)}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-emerald-600">Otimista</span><span className="font-medium">{formatCurrency(p.otimista)}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Growth indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Clientes Pagantes Projetados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[3, 6, 12].map(m => {
                    const growth = (metrics?.monthly_growth_rate || 5) / 100;
                    const projected = Math.round((metrics?.total_paying_clients || 0) * Math.pow(1 + growth, m));
                    return (
                      <div key={m} className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{m} meses</span>
                        <span className="font-bold">{projected}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">ROI Acumulado Projetado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[3, 6, 12].map(m => {
                    const totalInvest = (metrics?.total_marketing_investment || 0) * m;
                    const totalRevenue = projections.find(p => p.months === `${m} meses`)?.realista || 0;
                    const roi = totalInvest > 0 ? ((totalRevenue * m - totalInvest) / totalInvest * 100) : 0;
                    return (
                      <div key={m} className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{m} meses</span>
                        <span className={`font-bold ${roi >= 0 ? "text-emerald-600" : "text-destructive"}`}>{roi.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Receita Líquida Acumulada</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[3, 6, 12].map(m => {
                    const netMonthly = metrics?.net_revenue || 0;
                    const growth = (metrics?.monthly_growth_rate || 5) / 100;
                    let accumulated = 0;
                    for (let i = 0; i < m; i++) accumulated += netMonthly * Math.pow(1 + growth, i);
                    return (
                      <div key={m} className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{m} meses</span>
                        <span className="font-bold">{formatCurrency(accumulated)}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SIMULATOR TAB */}
        <TabsContent value="simulator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Simulador de Cenários
              </CardTitle>
              <CardDescription>Ajuste os parâmetros e veja o impacto nas métricas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Controls */}
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label className="text-sm">CPL (Custo por Lead)</Label>
                      <span className="text-sm font-bold">{formatCurrency(simCpl)}</span>
                    </div>
                    <Slider value={[simCpl]} onValueChange={([v]) => setSimCpl(v)} min={1} max={100} step={1} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label className="text-sm">Taxa de Conversão Lead → Cliente</Label>
                      <span className="text-sm font-bold">{simConversion}%</span>
                    </div>
                    <Slider value={[simConversion]} onValueChange={([v]) => setSimConversion(v)} min={1} max={30} step={0.5} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label className="text-sm">Ticket Médio Mensal</Label>
                      <span className="text-sm font-bold">{formatCurrency(simTicket)}</span>
                    </div>
                    <Slider value={[simTicket]} onValueChange={([v]) => setSimTicket(v)} min={10} max={200} step={5} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label className="text-sm">Retenção Média (meses)</Label>
                      <span className="text-sm font-bold">{simRetention} meses</span>
                    </div>
                    <Slider value={[simRetention]} onValueChange={([v]) => setSimRetention(v)} min={1} max={24} step={1} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <Label className="text-sm">% Reinvestido em Marketing</Label>
                      <span className="text-sm font-bold">{simReinvest}%</span>
                    </div>
                    <Slider value={[simReinvest]} onValueChange={([v]) => setSimReinvest(v)} min={0} max={80} step={5} />
                  </div>
                </div>

                {/* Results */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground">Resultado da Simulação</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-muted/30"><CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Leads Estimados</p>
                      <p className="text-xl font-bold">{simLeads}</p>
                    </CardContent></Card>
                    <Card className="bg-muted/30"><CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Novos Clientes</p>
                      <p className="text-xl font-bold">{simClients}</p>
                    </CardContent></Card>
                    <Card className="bg-muted/30"><CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">CAC Simulado</p>
                      <p className="text-xl font-bold">{formatCurrency(simCAC)}</p>
                    </CardContent></Card>
                    <Card className="bg-muted/30"><CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">LTV Simulado</p>
                      <p className="text-xl font-bold">{formatCurrency(simLTV)}</p>
                    </CardContent></Card>
                    <Card className="bg-muted/30"><CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">LTV/CAC</p>
                      <p className="text-xl font-bold">{simCAC > 0 ? (simLTV / simCAC).toFixed(1) : "∞"}x</p>
                      <AlertBadge value={simCAC > 0 ? simLTV / simCAC : 99} goodMin={3} warnMin={2} />
                    </CardContent></Card>
                    <Card className="bg-muted/30"><CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Payback</p>
                      <p className="text-xl font-bold">{simPayback.toFixed(1)} meses</p>
                    </CardContent></Card>
                    <Card className="bg-muted/30 col-span-2"><CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">ROI da Campanha</p>
                      <p className={`text-2xl font-bold ${simROI >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {simROI.toFixed(0)}%
                      </p>
                      <AlertBadge value={simROI} goodMin={200} warnMin={100} labels={["Negativo", "Baixo", "Excelente"]} />
                    </CardContent></Card>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CONFIG TAB */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Parâmetros de Cálculo
              </CardTitle>
              <CardDescription>Configure os custos operacionais e taxas para cálculos precisos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {config.map(c => (
                  <div key={c.id} className="space-y-1">
                    <Label className="text-sm">{c.description || c.config_key}</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        defaultValue={c.config_value}
                        onBlur={async (e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val !== c.config_value) {
                            const ok = await updateConfig(c.config_key, val);
                            if (ok) toast.success("Configuração atualizada");
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
