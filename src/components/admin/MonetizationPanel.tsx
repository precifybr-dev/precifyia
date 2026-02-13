import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Settings,
  Save,
  RefreshCcw,
  DollarSign,
  TrendingUp,
  Percent,
  Users,
  Calculator,
  ShieldCheck,
  BarChart3,
} from "lucide-react";
import {
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

interface MonetizationSetting {
  id: string;
  setting_key: string;
  setting_value: number;
  description: string | null;
  is_active: boolean;
}

interface LTVMetrics {
  average_ltv: number;
  average_subscription_months: number;
  total_active_subscribers: number;
}

const SETTING_LABELS: Record<string, string> = {
  withdrawal_fee_percent: "Taxa de Saque (%)",
  withdrawal_fee_fixed: "Taxa de Saque Fixa (R$)",
  late_cancellation_fee: "Taxa de Cancelamento Tardio (R$)",
  transaction_fee_percent: "Taxa de Transação (%)",
  transaction_fee_fixed: "Taxa de Transação Fixa (R$)",
  premium_partner_monthly: "Mensalidade Premium Parceiros (R$)",
  minimum_net_margin_percent: "Margem Líquida Mínima (%)",
};

const SETTING_ICONS: Record<string, string> = {
  withdrawal_fee_percent: "💸",
  withdrawal_fee_fixed: "💸",
  late_cancellation_fee: "🚫",
  transaction_fee_percent: "💳",
  transaction_fee_fixed: "💳",
  premium_partner_monthly: "⭐",
  minimum_net_margin_percent: "🛡️",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const PLAN_COLORS = ["hsl(var(--muted-foreground))", "hsl(var(--primary))", "hsl(var(--chart-1))"];
const PLAN_LABELS: Record<string, string> = { free: "Gratuito", basic: "Básico", pro: "Pro" };

export function MonetizationPanel() {
  const [settings, setSettings] = useState<MonetizationSetting[]>([]);
  const [ltvMetrics, setLtvMetrics] = useState<LTVMetrics | null>(null);
  const [revenueByPlan, setRevenueByPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchSettings(), fetchLTV(), fetchRevenue()]);
    setLoading(false);
  };

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("monetization_settings")
      .select("*")
      .order("setting_key");
    if (data) setSettings(data);
  };

  const fetchLTV = async () => {
    try {
      const { data, error } = await supabase.rpc("get_ltv_metrics");
      if (!error && data && data.length > 0) {
        setLtvMetrics(data[0]);
      }
    } catch {}
  };

  const fetchRevenue = async () => {
    try {
      const { data, error } = await supabase.rpc("get_revenue_by_plan");
      if (!error && data) setRevenueByPlan(data);
    } catch {}
  };

  const updateSetting = (id: string, field: "setting_value" | "is_active", value: number | boolean) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const s of settings) {
        const { error } = await supabase
          .from("monetization_settings")
          .update({
            setting_value: s.setting_value,
            is_active: s.is_active,
          })
          .eq("id", s.id);
        if (error) throw error;
      }
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
    setSaving(false);
  };

  // Calculate estimated monthly revenue from fees
  const estimateMonthlyFeeRevenue = () => {
    const txPercent = settings.find((s) => s.setting_key === "transaction_fee_percent");
    const txFixed = settings.find((s) => s.setting_key === "transaction_fee_fixed");
    const premiumMonthly = settings.find((s) => s.setting_key === "premium_partner_monthly");

    const totalMRR = revenueByPlan.reduce((sum, p) => sum + (p.monthly_revenue || 0), 0);
    const activeUsers = revenueByPlan.reduce((sum, p) => sum + (p.user_count || 0), 0);

    const txFeeRevenue = txPercent?.is_active
      ? totalMRR * ((txPercent?.setting_value || 0) / 100)
      : 0;
    const txFixedRevenue = txFixed?.is_active
      ? activeUsers * (txFixed?.setting_value || 0)
      : 0;

    return {
      subscriptions: totalMRR,
      transactionFees: txFeeRevenue + txFixedRevenue,
      premiumPartners: premiumMonthly?.is_active ? premiumMonthly.setting_value * 0 : 0, // placeholder
      total: totalMRR + txFeeRevenue + txFixedRevenue,
      activeUsers,
    };
  };

  const est = estimateMonthlyFeeRevenue();

  const revenueBreakdown = [
    { name: "Assinaturas", value: est.subscriptions },
    { name: "Taxas", value: est.transactionFees },
  ].filter((r) => r.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Taxas & Configurações
          </TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard" className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="Receita Bruta (MRR)"
              value={formatCurrency(est.subscriptions)}
              icon={<DollarSign className="h-4 w-4" />}
              description="Assinaturas ativas"
            />
            <KPICard
              title="Receita Líquida Estimada"
              value={formatCurrency(est.total)}
              icon={<TrendingUp className="h-4 w-4" />}
              description="Assinaturas + taxas"
            />
            <KPICard
              title="LTV Médio"
              value={formatCurrency(ltvMetrics?.average_ltv || 0)}
              icon={<Users className="h-4 w-4" />}
              description={`${(ltvMetrics?.average_subscription_months || 0).toFixed(1)} meses médio`}
            />
            <KPICard
              title="Ticket Médio"
              value={formatCurrency(
                est.activeUsers > 0 ? est.subscriptions / est.activeUsers : 0
              )}
              icon={<Calculator className="h-4 w-4" />}
              description={`${est.activeUsers} assinantes ativos`}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue by Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receita por Plano</CardTitle>
                <CardDescription>Distribuição de receita mensal</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueByPlan.length > 0 ? (
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueByPlan}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="plan_type"
                          tickFormatter={(v) => PLAN_LABELS[v] || v}
                          className="text-xs"
                        />
                        <YAxis tickFormatter={(v) => `R$${v}`} className="text-xs" />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Bar dataKey="monthly_revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Sem dados de receita</p>
                )}
              </CardContent>
            </Card>

            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fontes de Receita</CardTitle>
                <CardDescription>Composição da receita total</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueBreakdown.length > 0 ? (
                  <div className="flex items-center gap-6">
                    <div className="h-[180px] w-[180px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={revenueBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            dataKey="value"
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {revenueBreakdown.map((_, i) => (
                              <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-3">
                      {revenueBreakdown.map((item, i) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }}
                            />
                            <span className="text-sm">{item.name}</span>
                          </div>
                          <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">Sem dados</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* LTV Details */}
          {ltvMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Métricas de LTV (Lifetime Value)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 border text-center">
                    <p className="text-sm text-muted-foreground mb-1">LTV Médio</p>
                    <p className="text-2xl font-bold">{formatCurrency(ltvMetrics.average_ltv)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border text-center">
                    <p className="text-sm text-muted-foreground mb-1">Tempo Médio de Assinatura</p>
                    <p className="text-2xl font-bold">
                      {ltvMetrics.average_subscription_months.toFixed(1)} meses
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border text-center">
                    <p className="text-sm text-muted-foreground mb-1">Assinantes Ativos</p>
                    <p className="text-2xl font-bold">{ltvMetrics.total_active_subscribers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-5 w-5 text-primary" />
                Taxas e Fontes de Receita
              </CardTitle>
              <CardDescription>
                Configure as taxas cobradas pela plataforma. Desative para não aplicar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settings.map((s) => (
                <div
                  key={s.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    s.is_active ? "bg-background" : "bg-muted/30 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{SETTING_ICONS[s.setting_key] || "⚙️"}</span>
                      <div>
                        <p className="font-medium text-sm">
                          {SETTING_LABELS[s.setting_key] || s.setting_key}
                        </p>
                        {s.description && (
                          <p className="text-xs text-muted-foreground">{s.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={s.setting_value}
                        onChange={(e) =>
                          updateSetting(s.id, "setting_value", Number(e.target.value))
                        }
                        className="w-28 text-right"
                        disabled={!s.is_active}
                      />
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={(v) => updateSetting(s.id, "is_active", v)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Margin Protection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Proteção de Margem
              </CardTitle>
              <CardDescription>
                Operações abaixo da margem mínima serão sinalizadas ou bloqueadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const marginSetting = settings.find(
                  (s) => s.setting_key === "minimum_net_margin_percent"
                );
                if (!marginSetting) return null;
                return (
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label>Margem Líquida Mínima Aceitável (%)</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Se qualquer operação gerar margem abaixo deste valor, a comissão será ajustada automaticamente
                        (conforme configuração de Comissões).
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={marginSetting.setting_value}
                      onChange={(e) =>
                        updateSetting(
                          marginSetting.id,
                          "setting_value",
                          Number(e.target.value)
                        )
                      }
                      className="w-24 text-right"
                    />
                    <span className="text-sm font-medium">%</span>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={loadAll} className="gap-2">
              <RefreshCcw className="h-4 w-4" /> Restaurar
            </Button>
            <Button onClick={saveAll} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Tudo"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({
  title,
  value,
  icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
