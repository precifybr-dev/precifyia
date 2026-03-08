import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Smartphone,
  Wallet,
  AlertTriangle,
  TrendingUp,
  ArrowRightLeft,
  DollarSign,
  Target,
  Zap,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BeveragePricingPanelProps {
  unitCost: number;
  sellingPrice: number;
  ifoodRate: number;
  ifoodSellingPrice: string;
  setIfoodSellingPrice: (value: string) => void;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function BeveragePricingPanel({
  unitCost,
  sellingPrice,
  ifoodRate,
  ifoodSellingPrice,
  setIfoodSellingPrice,
}: BeveragePricingPanelProps) {
  const [minProfit, setMinProfit] = useState("");
  const [manualIfoodPrice, setManualIfoodPrice] = useState("");

  const metrics = useMemo(() => {
    // === LOJA ===
    const lucroLoja = sellingPrice - unitCost;
    const margemLoja = sellingPrice > 0 ? (lucroLoja / sellingPrice) * 100 : 0;
    const cmvLoja = sellingPrice > 0 ? (unitCost / sellingPrice) * 100 : 0;

    // === IFOOD — Cenário 1: mesmo lucro ===
    const rate = ifoodRate / 100;
    const precoIfoodMesmoLucro =
      rate < 1 && lucroLoja >= 0 ? (unitCost + lucroLoja) / (1 - rate) : 0;
    const taxaIfoodMesmoLucro = precoIfoodMesmoLucro * rate;
    const liquidoMesmoLucro = precoIfoodMesmoLucro - taxaIfoodMesmoLucro;

    // === Cenário 2: lucro mínimo ===
    const minProfitVal = parseFloat(minProfit) || 0;
    const precoIfoodMinLucro =
      rate < 1 && minProfitVal > 0 ? (unitCost + minProfitVal) / (1 - rate) : 0;
    const taxaIfoodMinLucro = precoIfoodMinLucro * rate;
    const liquidoMinLucro = precoIfoodMinLucro - taxaIfoodMinLucro;
    const lucroMinLucro = liquidoMinLucro - unitCost;

    // === Cenário 3: preço manual ===
    const manualPrice = parseFloat(manualIfoodPrice) || 0;
    const taxaIfoodManual = manualPrice * rate;
    const liquidoManual = manualPrice - taxaIfoodManual;
    const lucroManual = liquidoManual - unitCost;
    const margemManual = manualPrice > 0 ? (lucroManual / manualPrice) * 100 : 0;

    // === Preço final iFood (para salvar) ===
    const customIfoodPrice = parseFloat(ifoodSellingPrice) || 0;
    const finalIfoodPrice = customIfoodPrice > 0 ? customIfoodPrice : precoIfoodMesmoLucro;
    const taxaIfoodFinal = finalIfoodPrice * rate;
    const liquidoFinal = finalIfoodPrice - taxaIfoodFinal;
    const lucroIfood = liquidoFinal - unitCost;
    const margemIfood = finalIfoodPrice > 0 ? (lucroIfood / finalIfoodPrice) * 100 : 0;
    const cmvIfood = liquidoFinal > 0 ? (unitCost / liquidoFinal) * 100 : 0;

    // Diferença percentual preço iFood vs loja
    const diffPercent =
      sellingPrice > 0 && finalIfoodPrice > 0
        ? ((finalIfoodPrice - sellingPrice) / sellingPrice) * 100
        : 0;

    return {
      lucroLoja,
      margemLoja,
      cmvLoja,
      precoIfoodMesmoLucro,
      taxaIfoodMesmoLucro,
      liquidoMesmoLucro,
      precoIfoodMinLucro,
      taxaIfoodMinLucro,
      liquidoMinLucro,
      lucroMinLucro,
      minProfitVal,
      manualPrice,
      taxaIfoodManual,
      liquidoManual,
      lucroManual,
      margemManual,
      finalIfoodPrice,
      taxaIfoodFinal,
      liquidoFinal,
      lucroIfood,
      margemIfood,
      cmvIfood,
      diffPercent,
    };
  }, [unitCost, sellingPrice, ifoodRate, ifoodSellingPrice, minProfit, manualIfoodPrice]);

  if (unitCost <= 0 || sellingPrice <= 0) return null;

  const hasDiff = metrics.diffPercent > 30;

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground">
          Comparativo de Lucro por Canal
        </h3>
      </div>

      {/* ===== CARDS COMPARATIVOS ===== */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* LOJA */}
        <Card className="border-success/40 bg-success/5">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Store className="w-5 h-5 text-success" />
              <span className="text-sm font-semibold uppercase tracking-wide">
                Cardápio Digital / Loja
              </span>
            </div>

            <Row label="Preço de venda" value={fmt(sellingPrice)} bold />
            <Row label="Custo do produto" value={`- ${fmt(unitCost)}`} muted />
            <Divider />
            <Row
              label="Lucro bruto por unidade"
              value={fmt(metrics.lucroLoja)}
              color={metrics.lucroLoja >= 0 ? "success" : "destructive"}
              big
              icon={<Wallet className="w-4 h-4" />}
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Pill label="Margem" value={`${metrics.margemLoja.toFixed(1)}%`} />
              <Pill label="CMV" value={`${metrics.cmvLoja.toFixed(1)}%`} />
            </div>
          </CardContent>
        </Card>

        {/* IFOOD */}
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Smartphone className="w-5 h-5 text-destructive" />
              <span className="text-sm font-semibold uppercase tracking-wide">
                iFood
              </span>
              {ifoodRate > 0 && (
                <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">
                  taxa {ifoodRate.toFixed(1)}%
                </Badge>
              )}
            </div>

            <Row label="Preço de venda no iFood" value={fmt(metrics.finalIfoodPrice)} bold />
            <Row
              label="Taxa do iFood"
              value={`- ${fmt(metrics.taxaIfoodFinal)}`}
              color="destructive"
            />
            <Row
              label="Você recebe líquido"
              value={fmt(metrics.liquidoFinal)}
              bold
              highlight
            />
            <Row label="Custo do produto" value={`- ${fmt(unitCost)}`} muted />
            <Divider />
            <Row
              label="Lucro por venda no iFood"
              value={fmt(metrics.lucroIfood)}
              color={metrics.lucroIfood >= 0 ? "success" : "destructive"}
              big
              icon={<Wallet className="w-4 h-4" />}
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Pill label="Margem real" value={`${metrics.margemIfood.toFixed(1)}%`} />
              <Pill label="CMV" value={`${metrics.cmvIfood.toFixed(1)}%`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== ALERTAS ===== */}
      {hasDiff && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
          <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
          <p className="text-sm text-warning">
            <strong>Atenção:</strong> o preço no iFood está{" "}
            <strong>{metrics.diffPercent.toFixed(0)}% acima</strong> do cardápio digital.
          </p>
        </div>
      )}

      {/* Diferença de lucro */}
      {metrics.lucroLoja > 0 && metrics.lucroIfood !== metrics.lucroLoja && metrics.finalIfoodPrice > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
          <ArrowRightLeft className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Diferença de lucro entre canais:{" "}
            <span className={`font-semibold ${metrics.lucroIfood >= metrics.lucroLoja ? "text-success" : "text-destructive"}`}>
              {fmt(metrics.lucroIfood - metrics.lucroLoja)}
            </span>{" "}
            por unidade.
          </p>
        </div>
      )}

      {/* ===== CENÁRIOS IFOOD ===== */}
      {ifoodRate > 0 && (
        <div className="mt-2">
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Simulador de Cenários iFood
          </h4>
          <Tabs defaultValue="mesmo-lucro" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="mesmo-lucro" className="text-xs">Mesmo Lucro</TabsTrigger>
              <TabsTrigger value="lucro-minimo" className="text-xs">Lucro Mínimo</TabsTrigger>
              <TabsTrigger value="preco-manual" className="text-xs">Preço Manual</TabsTrigger>
            </TabsList>

            {/* Cenário 1 */}
            <TabsContent value="mesmo-lucro">
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Preço necessário no iFood para sobrar o mesmo lucro da loja ({fmt(metrics.lucroLoja)}).
                  </p>
                  <Row label="Preço no iFood" value={fmt(metrics.precoIfoodMesmoLucro)} bold />
                  <Row label="Taxa iFood" value={`- ${fmt(metrics.taxaIfoodMesmoLucro)}`} color="destructive" />
                  <Row label="Valor líquido recebido" value={fmt(metrics.liquidoMesmoLucro)} bold highlight />
                  <Row label="Custo do produto" value={`- ${fmt(unitCost)}`} muted />
                  <Divider />
                  <Row label="Lucro por unidade" value={fmt(metrics.lucroLoja)} color="success" big />
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIfoodSellingPrice(metrics.precoIfoodMesmoLucro.toFixed(2))}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      ✓ Usar este preço no iFood
                    </button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cenário 2 */}
            <TabsContent value="lucro-minimo">
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Defina o lucro mínimo aceitável por unidade e veja o preço necessário.
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Label className="text-xs whitespace-nowrap">Lucro mínimo (R$):</Label>
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        type="number"
                        step="0.50"
                        min="0"
                        value={minProfit}
                        onChange={(e) => setMinProfit(e.target.value)}
                        className="pl-8 h-8 text-sm"
                        placeholder="5,00"
                      />
                    </div>
                  </div>
                  {metrics.minProfitVal > 0 && (
                    <>
                      <Row label="Preço no iFood" value={fmt(metrics.precoIfoodMinLucro)} bold />
                      <Row label="Taxa iFood" value={`- ${fmt(metrics.taxaIfoodMinLucro)}`} color="destructive" />
                      <Row label="Valor líquido recebido" value={fmt(metrics.liquidoMinLucro)} bold highlight />
                      <Divider />
                      <Row
                        label="Lucro por unidade"
                        value={fmt(metrics.lucroMinLucro)}
                        color={metrics.lucroMinLucro >= metrics.minProfitVal ? "success" : "destructive"}
                        big
                      />
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setIfoodSellingPrice(metrics.precoIfoodMinLucro.toFixed(2))}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          ✓ Usar este preço no iFood
                        </button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Cenário 3 */}
            <TabsContent value="preco-manual">
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    Informe um preço competitivo no iFood e veja quanto sobra de lucro.
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <Label className="text-xs whitespace-nowrap">Preço no iFood:</Label>
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                      <Input
                        type="number"
                        step="0.50"
                        min="0"
                        value={manualIfoodPrice}
                        onChange={(e) => setManualIfoodPrice(e.target.value)}
                        className="pl-8 h-8 text-sm"
                        placeholder="25,00"
                      />
                    </div>
                  </div>
                  {metrics.manualPrice > 0 && (
                    <>
                      <Row label="Preço no iFood" value={fmt(metrics.manualPrice)} bold />
                      <Row label="Taxa iFood" value={`- ${fmt(metrics.taxaIfoodManual)}`} color="destructive" />
                      <Row label="Valor líquido recebido" value={fmt(metrics.liquidoManual)} bold highlight />
                      <Row label="Custo do produto" value={`- ${fmt(unitCost)}`} muted />
                      <Divider />
                      <Row
                        label="Lucro por unidade"
                        value={fmt(metrics.lucroManual)}
                        color={metrics.lucroManual >= 0 ? "success" : "destructive"}
                        big
                      />
                      <Pill label="Margem real" value={`${metrics.margemManual.toFixed(1)}%`} />
                      {metrics.lucroManual < 0 && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Você está vendendo no prejuízo neste preço.
                        </p>
                      )}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => setIfoodSellingPrice(metrics.manualPrice.toFixed(2))}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          ✓ Usar este preço no iFood
                        </button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

// === Sub-components ===

function Row({
  label,
  value,
  bold,
  muted,
  color,
  big,
  highlight,
  icon,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  color?: "success" | "destructive";
  big?: boolean;
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  const textColor = color
    ? color === "success"
      ? "text-success"
      : "text-destructive"
    : muted
    ? "text-muted-foreground"
    : "text-foreground";

  return (
    <div
      className={`flex justify-between items-center py-1 ${
        highlight ? "bg-primary/5 -mx-2 px-2 rounded" : ""
      }`}
    >
      <span className={`text-sm ${muted ? "text-muted-foreground" : "text-foreground"} flex items-center gap-1.5`}>
        {icon}
        {label}
      </span>
      <span
        className={`font-mono ${big ? "text-lg font-bold" : bold ? "font-semibold" : ""} ${textColor}`}
      >
        {value}
      </span>
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded px-2 py-1 text-center">
      <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
      <p className="font-mono text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-border my-1" />;
}
