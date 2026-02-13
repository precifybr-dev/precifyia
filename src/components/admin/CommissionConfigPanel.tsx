import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Settings,
  Calculator,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Save,
  RefreshCcw,
  DollarSign,
  Percent,
  Layers,
} from "lucide-react";

interface TierRange {
  min: number;
  max: number | null;
  percent: number;
}

interface CommissionConfig {
  id: string;
  model_type: string;
  default_percentage: number;
  fixed_fee: number;
  minimum_commission: number;
  minimum_margin_percent: number;
  margin_action: string;
  tier_ranges: TierRange[];
  category_overrides: Record<string, number>;
}

const MODEL_LABELS: Record<string, string> = {
  percentage: "Modelo 1 – Comissão Percentual",
  percentage_plus_fixed: "Modelo 2 – Percentual + Taxa Fixa",
  tiered: "Modelo 3 – Comissão Escalonada",
};

const MODEL_DESCRIPTIONS: Record<string, string> = {
  percentage: "Ex: 20% sobre cada venda",
  percentage_plus_fixed: "Ex: 15% + R$ 4,90 por transação",
  tiered: "Faixas de comissão por volume de vendas",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function CommissionConfigPanel() {
  const [config, setConfig] = useState<CommissionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Simulator state
  const [simSalePrice, setSimSalePrice] = useState(100);
  const [simCost, setSimCost] = useState(30);
  const [simVolume, setSimVolume] = useState(50);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("commission_config")
      .select("*")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (data) {
      setConfig({
        ...data,
        tier_ranges: (data.tier_ranges as any) || [],
        category_overrides: (data.category_overrides as any) || {},
      });
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    const { error } = await supabase
      .from("commission_config")
      .update({
        model_type: config.model_type,
        default_percentage: config.default_percentage,
        fixed_fee: config.fixed_fee,
        minimum_commission: config.minimum_commission,
        minimum_margin_percent: config.minimum_margin_percent,
        margin_action: config.margin_action,
        tier_ranges: config.tier_ranges as any,
        category_overrides: config.category_overrides as any,
        updated_at: new Date().toISOString(),
      })
      .eq("id", config.id);

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Configuração salva com sucesso!");
    }
  };

  // Calculate commission based on current config
  const calculateCommission = (salePrice: number, cost: number) => {
    if (!config) return { commission: 0, margin: 0, blocked: false, adjusted: false };

    let commission = 0;

    if (config.model_type === "percentage") {
      commission = salePrice * (config.default_percentage / 100);
    } else if (config.model_type === "percentage_plus_fixed") {
      commission = salePrice * (config.default_percentage / 100) + config.fixed_fee;
    } else if (config.model_type === "tiered") {
      const tier = config.tier_ranges.find(
        (t) => salePrice >= t.min && (t.max === null || salePrice <= t.max)
      );
      commission = tier ? salePrice * (tier.percent / 100) : salePrice * (config.default_percentage / 100);
    }

    // Apply minimum commission
    if (commission < config.minimum_commission) {
      commission = config.minimum_commission;
    }

    const profit = salePrice - cost - commission;
    const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;

    let blocked = false;
    let adjusted = false;

    if (margin < config.minimum_margin_percent) {
      if (config.margin_action === "block") {
        blocked = true;
      } else {
        // Adjust commission to meet minimum margin
        const maxCommission = salePrice - cost - (salePrice * config.minimum_margin_percent / 100);
        if (maxCommission > 0) {
          commission = Math.max(config.minimum_commission, maxCommission);
          adjusted = true;
        } else {
          blocked = true;
        }
      }
    }

    const finalProfit = salePrice - cost - commission;
    const finalMargin = salePrice > 0 ? (finalProfit / salePrice) * 100 : 0;

    return { commission, margin: finalMargin, profit: finalProfit, blocked, adjusted };
  };

  const sim = calculateCommission(simSalePrice, simCost);
  const simMonthly = {
    revenue: simSalePrice * simVolume,
    totalCommission: sim.commission * simVolume,
    totalProfit: (sim.profit || 0) * simVolume,
    margin: sim.margin,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nenhuma configuração de comissão encontrada.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="config" className="space-y-4">
        <TabsList>
          <TabsTrigger value="config" className="gap-2"><Settings className="h-4 w-4" />Configuração</TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2"><Calculator className="h-4 w-4" />Simulador</TabsTrigger>
        </TabsList>

        {/* CONFIG TAB */}
        <TabsContent value="config" className="space-y-4">
          {/* Model Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Modelo de Comissão
              </CardTitle>
              <CardDescription>Selecione o modelo de cálculo de comissão</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(["percentage", "percentage_plus_fixed", "tiered"] as const).map((model) => (
                  <button
                    key={model}
                    onClick={() => setConfig({ ...config, model_type: model })}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      config.model_type === model
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-muted-foreground/30"
                    }`}
                  >
                    <p className="font-medium text-sm">{MODEL_LABELS[model]}</p>
                    <p className="text-xs text-muted-foreground mt-1">{MODEL_DESCRIPTIONS[model]}</p>
                  </button>
                ))}
              </div>

              <Separator />

              {/* Model-specific fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Percentual Padrão (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={config.default_percentage}
                    onChange={(e) => setConfig({ ...config, default_percentage: Number(e.target.value) })}
                  />
                </div>
                {config.model_type === "percentage_plus_fixed" && (
                  <div>
                    <Label>Taxa Fixa por Transação (R$)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={config.fixed_fee}
                      onChange={(e) => setConfig({ ...config, fixed_fee: Number(e.target.value) })}
                    />
                  </div>
                )}
                <div>
                  <Label>Comissão Mínima Fixa (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={config.minimum_commission}
                    onChange={(e) => setConfig({ ...config, minimum_commission: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Tiered ranges */}
              {config.model_type === "tiered" && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Faixas Escalonadas</Label>
                  {config.tier_ranges.map((tier, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 items-end">
                      <div>
                        <Label className="text-xs">Mín (R$)</Label>
                        <Input
                          type="number"
                          value={tier.min}
                          onChange={(e) => {
                            const ranges = [...config.tier_ranges];
                            ranges[i] = { ...ranges[i], min: Number(e.target.value) };
                            setConfig({ ...config, tier_ranges: ranges });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Máx (R$)</Label>
                        <Input
                          type="number"
                          value={tier.max ?? ""}
                          placeholder="∞"
                          onChange={(e) => {
                            const ranges = [...config.tier_ranges];
                            ranges[i] = { ...ranges[i], max: e.target.value ? Number(e.target.value) : null };
                            setConfig({ ...config, tier_ranges: ranges });
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Comissão (%)</Label>
                        <Input
                          type="number"
                          value={tier.percent}
                          onChange={(e) => {
                            const ranges = [...config.tier_ranges];
                            ranges[i] = { ...ranges[i], percent: Number(e.target.value) };
                            setConfig({ ...config, tier_ranges: ranges });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const lastMax = config.tier_ranges[config.tier_ranges.length - 1]?.max || 0;
                      setConfig({
                        ...config,
                        tier_ranges: [
                          ...config.tier_ranges,
                          { min: (lastMax || 0) + 1, max: null, percent: 10 },
                        ],
                      });
                    }}
                  >
                    + Adicionar Faixa
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Margin Protection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Proteção de Margem
              </CardTitle>
              <CardDescription>Defina a margem mínima aceitável para proteger contra prejuízo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Margem Mínima Aceitável (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={config.minimum_margin_percent}
                    onChange={(e) => setConfig({ ...config, minimum_margin_percent: Number(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Se a margem líquida ficar abaixo deste valor, a ação definida será aplicada.
                  </p>
                </div>
                <div>
                  <Label>Ação quando margem está abaixo do mínimo</Label>
                  <Select
                    value={config.margin_action}
                    onValueChange={(v) => setConfig({ ...config, margin_action: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adjust">Ajustar comissão automaticamente</SelectItem>
                      <SelectItem value="block">Bloquear operação</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {config.margin_action === "adjust"
                      ? "A comissão será reduzida para manter a margem mínima."
                      : "A operação será bloqueada e não poderá ser concluída."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={fetchConfig} className="gap-2">
              <RefreshCcw className="h-4 w-4" /> Restaurar
            </Button>
            <Button onClick={saveConfig} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Configuração"}
            </Button>
          </div>
        </TabsContent>

        {/* SIMULATOR TAB */}
        <TabsContent value="simulator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Simulador de Lucro por Venda
              </CardTitle>
              <CardDescription>
                Modelo ativo: <Badge variant="secondary">{MODEL_LABELS[config.model_type]}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Preço de Venda (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={simSalePrice}
                    onChange={(e) => setSimSalePrice(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Custo do Produto (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={simCost}
                    onChange={(e) => setSimCost(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Volume Mensal (vendas)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={simVolume}
                    onChange={(e) => setSimVolume(Number(e.target.value))}
                  />
                </div>
              </div>

              <Separator />

              {/* Per-sale results */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Resultado por Venda</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ResultCard label="Comissão" value={formatCurrency(sim.commission)} icon={<Percent className="h-4 w-4" />} />
                  <ResultCard
                    label="Lucro Líquido"
                    value={formatCurrency(sim.profit || 0)}
                    icon={<DollarSign className="h-4 w-4" />}
                    variant={(sim.profit || 0) < 0 ? "destructive" : "success"}
                  />
                  <ResultCard
                    label="Margem Líquida"
                    value={`${sim.margin.toFixed(1)}%`}
                    icon={<TrendingUp className="h-4 w-4" />}
                    variant={sim.margin < config.minimum_margin_percent ? "destructive" : "success"}
                  />
                  <ResultCard
                    label="Status"
                    value={sim.blocked ? "BLOQUEADO" : sim.adjusted ? "AJUSTADO" : "OK"}
                    icon={sim.blocked ? <AlertTriangle className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    variant={sim.blocked ? "destructive" : sim.adjusted ? "warning" : "success"}
                  />
                </div>
              </div>

              <Separator />

              {/* Monthly projection */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Projeção Mensal ({simVolume} vendas)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ResultCard label="Receita Total" value={formatCurrency(simMonthly.revenue)} icon={<DollarSign className="h-4 w-4" />} />
                  <ResultCard label="Total Comissões" value={formatCurrency(simMonthly.totalCommission)} icon={<Percent className="h-4 w-4" />} />
                  <ResultCard
                    label="Lucro Mensal"
                    value={formatCurrency(simMonthly.totalProfit)}
                    icon={<TrendingUp className="h-4 w-4" />}
                    variant={simMonthly.totalProfit < 0 ? "destructive" : "success"}
                  />
                  <ResultCard
                    label="Margem"
                    value={`${simMonthly.margin.toFixed(1)}%`}
                    icon={<ShieldCheck className="h-4 w-4" />}
                    variant={simMonthly.margin < config.minimum_margin_percent ? "destructive" : "success"}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ResultCard({
  label,
  value,
  icon,
  variant = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "destructive" | "warning";
}) {
  const colorMap = {
    default: "text-foreground",
    success: "text-green-600 dark:text-green-400",
    destructive: "text-destructive",
    warning: "text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="p-3 rounded-lg bg-muted/50 border">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-lg font-bold ${colorMap[variant]}`}>{value}</p>
    </div>
  );
}
