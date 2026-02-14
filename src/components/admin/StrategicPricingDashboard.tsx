import { useState } from "react";
import { useStrategicPricing, type PricingPlan } from "@/hooks/useStrategicPricing";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, CheckCircle2, DollarSign, TrendingUp, Target,
  Sparkles, Plus, Trash2, Save, Calculator, Shield, Pencil,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function StrategicPricingDashboard() {
  const {
    plans, config, phrases, isLoading,
    calculateAnchoring, calculateMetrics,
    updatePlan, updateConfig, updatePhrase, addPhrase, deletePhrase,
  } = useStrategicPricing();

  const [editingPlan, setEditingPlan] = useState<PricingPlan | null>(null);
  const [editReason, setEditReason] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [newPhrase, setNewPhrase] = useState("");

  // Config editing
  const [editConfig, setEditConfig] = useState(false);
  const [configForm, setConfigForm] = useState<Record<string, number>>({});

  const handleSavePlan = () => {
    if (!editingPlan) return;
    setPendingAction(async () => {
      await updatePlan(editingPlan.id, {
        real_price_monthly: editingPlan.real_price_monthly,
        anchored_price_monthly: editingPlan.anchored_price_monthly,
        real_price_yearly: editingPlan.real_price_yearly,
        anchored_price_yearly: editingPlan.anchored_price_yearly,
        yearly_discount_percent: editingPlan.yearly_discount_percent,
        is_popular: editingPlan.is_popular,
        description: editingPlan.description,
      }, editReason);
      setEditingPlan(null);
      setEditReason("");
    });
    setConfirmDialog(true);
  };

  const handleConfirm = async () => {
    if (pendingAction) await pendingAction();
    setConfirmDialog(false);
    setPendingAction(null);
  };

  const handleAutoAnchor = (plan: PricingPlan) => {
    const result = calculateAnchoring(plan.real_price_monthly, config?.psychological_discount_min || 40);
    setEditingPlan({
      ...plan,
      anchored_price_monthly: result.anchoredPrice,
      real_price_yearly: result.yearlyPrice,
      anchored_price_yearly: result.yearlyAnchored,
    });
  };

  const handleSaveConfig = () => {
    setPendingAction(async () => {
      await updateConfig(configForm);
      setEditConfig(false);
    });
    setConfirmDialog(true);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans" className="gap-2"><DollarSign className="h-4 w-4" />Planos</TabsTrigger>
          <TabsTrigger value="anchoring" className="gap-2"><Target className="h-4 w-4" />Ancoragem</TabsTrigger>
          <TabsTrigger value="phrases" className="gap-2"><Sparkles className="h-4 w-4" />Frases</TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2"><TrendingUp className="h-4 w-4" />Métricas</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid gap-4">
            {plans.map(plan => {
              const metrics = calculateMetrics(plan.real_price_monthly, config);
              const discountPct = plan.anchored_price_monthly > 0
                ? Math.round(((plan.anchored_price_monthly - plan.real_price_monthly) / plan.anchored_price_monthly) * 100)
                : 0;

              return (
                <Card key={plan.id} className={plan.is_popular ? "border-primary" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {plan.is_popular && <Badge className="bg-primary text-primary-foreground">Popular</Badge>}
                        {plan.id === "teste" && <Badge variant="outline">Gratuito</Badge>}
                      </div>
                      <Button variant="outline" size="sm" onClick={() => { setEditingPlan({ ...plan }); setEditReason(""); }}>
                        <Pencil className="h-4 w-4 mr-1" /> Editar
                      </Button>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Preço Real</p>
                        <p className="text-xl font-bold">{formatCurrency(plan.real_price_monthly)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Preço Ancorado</p>
                        <p className="text-xl font-bold line-through text-muted-foreground">{formatCurrency(plan.anchored_price_monthly)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Desconto Exibido</p>
                        <p className="text-xl font-bold text-success">{discountPct}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">LTV Projetado</p>
                        <p className="text-lg font-semibold">{formatCurrency(metrics.ltv)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">LTV/CAC</p>
                        <p className={`text-lg font-semibold ${metrics.ltvCacRatio < 3 ? "text-destructive" : "text-success"}`}>
                          {metrics.ltvCacRatio.toFixed(1)}x
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Payback</p>
                        <p className="text-lg font-semibold">{metrics.payback.toFixed(1)} meses</p>
                      </div>
                    </div>
                    {metrics.ltvCacRatio > 0 && metrics.ltvCacRatio < 3 && (
                      <div className="mt-3 p-2 rounded bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" /> LTV/CAC abaixo de 3:1 — margem insustentável!
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Anchoring Config Tab */}
        <TabsContent value="anchoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Configuração de Ancoragem</CardTitle>
              <CardDescription>Parâmetros globais para cálculo automático de preços ancorados e métricas financeiras.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config && !editConfig ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Margem Mínima", value: `${config.min_margin_percent}%` },
                      { label: "LTV/CAC Alvo", value: `${config.target_ltv_cac_ratio}:1` },
                      { label: "LTV Mínimo", value: formatCurrency(config.min_ltv) },
                      { label: "Desconto Psicológico Mín.", value: `${config.psychological_discount_min}%` },
                      { label: "Taxa Gateway", value: `${config.gateway_fee_percent}%` },
                      { label: "Retenção Média", value: `${config.avg_retention_months} meses` },
                      { label: "Reinvestimento", value: `${config.reinvestment_percent}%` },
                      { label: "CAC Médio", value: formatCurrency(config.avg_cac) },
                    ].map(item => (
                      <div key={item.label} className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-lg font-semibold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => { setEditConfig(true); setConfigForm({ ...config } as any); }}>
                    <Pencil className="h-4 w-4 mr-2" /> Editar Configuração
                  </Button>
                </>
              ) : config && editConfig ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: "min_margin_percent", label: "Margem Mínima (%)" },
                      { key: "target_ltv_cac_ratio", label: "LTV/CAC Alvo" },
                      { key: "min_ltv", label: "LTV Mínimo (R$)" },
                      { key: "psychological_discount_min", label: "Desc. Psicológico Mín. (%)" },
                      { key: "gateway_fee_percent", label: "Taxa Gateway (%)" },
                      { key: "avg_retention_months", label: "Retenção Média (meses)" },
                      { key: "reinvestment_percent", label: "Reinvestimento (%)" },
                      { key: "avg_cac", label: "CAC Médio (R$)" },
                    ].map(field => (
                      <div key={field.key}>
                        <label className="text-xs text-muted-foreground">{field.label}</label>
                        <Input
                          type="number"
                          value={configForm[field.key] || 0}
                          onChange={e => setConfigForm(prev => ({ ...prev, [field.key]: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveConfig}><Save className="h-4 w-4 mr-2" /> Salvar</Button>
                    <Button variant="outline" onClick={() => setEditConfig(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Anchoring Calculator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> Calculadora de Ancoragem</CardTitle>
              <CardDescription>Simule preços ancorados rapidamente.</CardDescription>
            </CardHeader>
            <CardContent>
              <AnchoringCalculator psychMin={config?.psychological_discount_min || 40} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phrases Tab */}
        <TabsContent value="phrases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Frases Estratégicas</CardTitle>
              <CardDescription>Frases de comparação exibidas na página de preços. Ative/desative individualmente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {phrases.map(phrase => (
                <div key={phrase.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Switch
                    checked={phrase.is_active}
                    onCheckedChange={checked => updatePhrase(phrase.id, { is_active: checked })}
                  />
                  <span className={`flex-1 text-sm ${!phrase.is_active ? "text-muted-foreground line-through" : ""}`}>
                    "{phrase.phrase_template}"
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => deletePhrase(phrase.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Separator />
              <div className="flex gap-2">
                <Input
                  placeholder="Nova frase estratégica..."
                  value={newPhrase}
                  onChange={e => setNewPhrase(e.target.value)}
                />
                <Button onClick={() => { if (newPhrase.trim()) { addPhrase(newPhrase.trim()); setNewPhrase(""); } }}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {plans.filter(p => p.real_price_monthly > 0).map(plan => {
              const m = calculateMetrics(plan.real_price_monthly, config);
              return (
                <Card key={plan.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{plan.name} — Projeção Financeira</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <Metric label="Receita Líquida/mês" value={formatCurrency(m.netRevenue)} />
                      <Metric label="Lucro Mensal/cliente" value={formatCurrency(m.monthlyProfit)} />
                      <Metric label="LTV" value={formatCurrency(m.ltv)} />
                      <Metric label="ROI" value={`${m.roi.toFixed(0)}%`} />
                      <Metric label="Payback" value={`${m.payback.toFixed(1)} meses`} />
                      <Metric label="LTV/CAC" value={`${m.ltvCacRatio.toFixed(1)}x`} alert={m.ltvCacRatio < 3} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Plan Dialog */}
      {editingPlan && (
        <Dialog open onOpenChange={() => setEditingPlan(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Plano: {editingPlan.name}</DialogTitle>
              <DialogDescription>Alterações requerem confirmação de segurança.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Preço Real Mensal (R$)</label>
                  <Input type="number" value={editingPlan.real_price_monthly}
                    onChange={e => setEditingPlan(prev => prev ? { ...prev, real_price_monthly: parseFloat(e.target.value) || 0 } : null)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Preço Ancorado Mensal (R$)</label>
                  <Input type="number" value={editingPlan.anchored_price_monthly}
                    onChange={e => setEditingPlan(prev => prev ? { ...prev, anchored_price_monthly: parseFloat(e.target.value) || 0 } : null)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Preço Real Anual (R$)</label>
                  <Input type="number" value={editingPlan.real_price_yearly}
                    onChange={e => setEditingPlan(prev => prev ? { ...prev, real_price_yearly: parseFloat(e.target.value) || 0 } : null)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Preço Ancorado Anual (R$)</label>
                  <Input type="number" value={editingPlan.anchored_price_yearly}
                    onChange={e => setEditingPlan(prev => prev ? { ...prev, anchored_price_yearly: parseFloat(e.target.value) || 0 } : null)} />
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleAutoAnchor(editingPlan)}>
                <Calculator className="h-4 w-4 mr-2" /> Calcular Ancoragem Automática
              </Button>
              <div>
                <label className="text-sm font-medium">Motivo da Alteração</label>
                <Textarea value={editReason} onChange={e => setEditReason(e.target.value)} placeholder="Descreva o motivo..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingPlan(null)}>Cancelar</Button>
              <Button onClick={handleSavePlan} disabled={!editReason.trim()}>
                <Shield className="h-4 w-4 mr-2" /> Salvar com Auditoria
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Security Confirmation Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <Shield className="h-5 w-5" /> Confirmação de Segurança
            </DialogTitle>
            <DialogDescription>
              Alterações de precificação são sensíveis e serão registradas no log de auditoria.
              Deseja prosseguir?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirm}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnchoringCalculator({ psychMin }: { psychMin: number }) {
  const [value, setValue] = useState(97);
  const raw = value / (1 - psychMin / 100);
  const anchored = Math.ceil(raw / 10) * 10 - 3;
  const discount = Math.round(((anchored - value) / anchored) * 100);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <label className="text-xs text-muted-foreground">Valor Real (R$)</label>
        <Input type="number" value={value} onChange={e => setValue(parseFloat(e.target.value) || 0)} />
      </div>
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">Ancorado Ideal</p>
        <p className="text-xl font-bold">{formatCurrency(anchored)}</p>
      </div>
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">Desconto Exibido</p>
        <p className="text-xl font-bold text-success">{discount}%</p>
      </div>
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground">Anual (20% off)</p>
        <p className="text-xl font-bold">{formatCurrency(Math.round(value * 12 * 0.8))}</p>
      </div>
    </div>
  );
}

function Metric({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="p-2 rounded bg-muted/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-sm font-semibold ${alert ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}
