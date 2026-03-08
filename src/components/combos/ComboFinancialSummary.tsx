import {
  ShoppingBag, DollarSign, Tag, Shield, AlertTriangle, Zap,
  TrendingUp, Percent, Info, Star, HelpCircle, Lightbulb,
  AlertCircle, CheckCircle2, Smartphone, Store,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ComboResult {
  totalAvulso: number;
  totalCost: number;
  grossProfitAvulso: number;
  marginAvulso: number;
  minPriceNoLoss: number;
  minPriceWithSafetyMargin: number;
  safePriceSuggestion: number;
  aggressivePriceSuggestion: number;
  estimatedProfit: number;
  estimatedMargin: number;
  clientSavings: number;
  clientSavingsPercent: number;
  ifoodPrice: number;
  ifoodRate: number;
}

interface ComboFinancialSummaryProps {
  result: ComboResult;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

function HelpTip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="w-3 h-3 text-muted-foreground/60 cursor-help inline ml-1" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-xs">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h4 className="text-sm font-bold text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function generateStrategySummary(result: ComboResult): string {
  const cost = fmt(result.totalCost);
  const price = fmt(result.safePriceSuggestion);
  const profit = fmt(result.estimatedProfit);
  const discount = result.clientSavingsPercent.toFixed(0);

  return `Seu combo custa ${cost} para produzir. O preço recomendado de ${price} entrega ${discount}% de economia percebida para o cliente, com lucro de ${profit} por venda.`;
}

function generateAlerts(result: ComboResult): { type: "success" | "warning" | "danger"; message: string }[] {
  const alerts: { type: "success" | "warning" | "danger"; message: string }[] = [];

  if (result.estimatedMargin >= 30) {
    alerts.push({ type: "success", message: "Esse combo tem boa percepção de vantagem e margem saudável." });
  }

  if (result.estimatedMargin < 15 && result.estimatedMargin > 0) {
    alerts.push({ type: "warning", message: "Atenção: este combo está com margem muito apertada para promoção." });
  }

  if (result.clientSavingsPercent > 40) {
    alerts.push({ type: "warning", message: "O desconto está alto e pode comprometer seu lucro." });
  }

  const promoGap = result.aggressivePriceSuggestion - result.minPriceNoLoss;
  if (promoGap < result.totalCost * 0.05) {
    alerts.push({ type: "danger", message: "O preço promocional está muito próximo do limite sem prejuízo." });
  }

  return alerts;
}

export function ComboFinancialSummary({ result }: ComboFinancialSummaryProps) {
  const alerts = generateAlerts(result);
  const summary = generateStrategySummary(result);

  return (
    <div className="space-y-5">
      {/* BLOCO 1 — Quanto esse combo vale */}
      <div>
        <SectionHeader
          title="Quanto esse combo vale"
          description="Entenda o valor total dos itens e quanto o cliente percebe de vantagem ao comprar o combo."
        />
        <div className="grid grid-cols-3 gap-3">
          {/* Preço Avulso */}
          <div className="p-3 rounded-xl border border-border bg-card text-center space-y-1">
            <ShoppingBag className="w-4 h-4 mx-auto text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground leading-tight">Preço avulso</p>
            <p className="text-base font-bold text-foreground">{fmt(result.totalAvulso)}</p>
            <p className="text-[9px] text-muted-foreground">Se vendesse tudo separado</p>
          </div>

          {/* Custo Total */}
          <div className="p-3 rounded-xl border border-border bg-card text-center space-y-1">
            <DollarSign className="w-4 h-4 mx-auto text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground leading-tight">Custo total</p>
            <p className="text-base font-bold text-foreground">{fmt(result.totalCost)}</p>
            <p className="text-[9px] text-muted-foreground">Quanto custa produzir</p>
          </div>

          {/* Economia do Cliente */}
          <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-1">
            <Tag className="w-4 h-4 mx-auto text-emerald-600 dark:text-emerald-400" />
            <p className="text-[10px] text-muted-foreground leading-tight">Economia do cliente</p>
            <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{fmt(result.clientSavings)}</p>
            <p className="text-[9px] text-muted-foreground">Vantagem percebida</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* BLOCO 2 — Qual preço você pode cobrar */}
      <div>
        <SectionHeader
          title="Qual preço você pode cobrar"
          description="Veja o limite mínimo e os preços sugeridos para vender com segurança e estratégia."
        />

        {/* Preço Recomendado — Balcão + iFood side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Preço Balcão / Cardápio Digital */}
          <div className="relative p-4 rounded-2xl border-2 border-primary bg-primary/5 text-center space-y-1">
            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-3 py-0.5 gap-1">
              <Star className="w-3 h-3" /> Recomendado
            </Badge>
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <Store className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">Balcão / Cardápio Digital</p>
            </div>
            <p className="text-3xl font-black text-primary">{fmt(result.safePriceSuggestion)}</p>
            <p className="text-[10px] text-muted-foreground">Preço para venda direta</p>
          </div>

          {/* Preço iFood */}
          <div className="relative p-4 rounded-2xl border-2 border-destructive/40 bg-destructive/5 text-center space-y-1">
            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-destructive text-destructive-foreground text-[10px] px-3 py-0.5 gap-1">
              <Smartphone className="w-3 h-3" /> iFood
            </Badge>
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <Smartphone className="w-4 h-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Preço no iFood</p>
            </div>
            {result.ifoodRate > 0 ? (
              <>
                <p className="text-3xl font-black text-destructive">{fmt(result.ifoodPrice)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Taxa {result.ifoodRate.toFixed(1)}% já embutida
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-muted-foreground pt-1">—</p>
                <p className="text-[10px] text-muted-foreground">
                  Configure a taxa iFood na Área do Negócio
                </p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Preço mínimo para não perder */}
          <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 text-center space-y-1">
            <AlertTriangle className="w-4 h-4 mx-auto text-destructive" />
            <p className="text-[10px] text-muted-foreground leading-tight">Preço mínimo para não perder</p>
            <p className="text-base font-bold text-destructive">{fmt(result.minPriceNoLoss)}</p>
            <p className="text-[9px] text-destructive/70">Abaixo disso = prejuízo</p>
          </div>

          {/* Preço mínimo com lucro saudável */}
          <div className="p-3 rounded-xl border border-amber-300/40 dark:border-amber-700/40 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-1">
            <Shield className="w-4 h-4 mx-auto text-amber-600 dark:text-amber-400" />
            <p className="text-[10px] text-muted-foreground leading-tight">
              Mínimo com lucro saudável
              <HelpTip text="É o menor valor sugerido para vender sem apertar demais sua margem." />
            </p>
            <p className="text-base font-bold text-amber-600 dark:text-amber-400">{fmt(result.minPriceWithSafetyMargin)}</p>
            <p className="text-[9px] text-muted-foreground">Margem mais segura</p>
          </div>

          {/* Preço promocional */}
          <div className="p-3 rounded-xl border border-border bg-card text-center space-y-1">
            <Zap className="w-4 h-4 mx-auto text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground leading-tight">
              Preço promocional
              <HelpTip text="Use quando quiser vender mais em dias fracos ou campanhas específicas." />
            </p>
            <p className="text-base font-bold text-foreground">{fmt(result.aggressivePriceSuggestion)}</p>
            <p className="text-[9px] text-muted-foreground">Dias fracos / promoções</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* BLOCO 3 — Quanto sobra no seu bolso */}
      <div>
        <SectionHeader
          title="Quanto sobra no seu bolso"
          description="Veja o retorno financeiro estimado ao vender esse combo."
        />
        <div className="grid grid-cols-3 gap-3">
          {/* Lucro estimado */}
          <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-1">
            <TrendingUp className="w-4 h-4 mx-auto text-emerald-600 dark:text-emerald-400" />
            <p className="text-[10px] text-muted-foreground leading-tight">Lucro estimado</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{fmt(result.estimatedProfit)}</p>
            <p className="text-[9px] text-muted-foreground">Por combo vendido</p>
          </div>

          {/* Margem final */}
          <div className="p-3 rounded-xl border border-border bg-card text-center space-y-1">
            <Percent className="w-4 h-4 mx-auto text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground leading-tight">
              Margem final do combo
              <HelpTip text="Mostra o percentual de lucro bruto sobre o preço final de venda." />
            </p>
            <p className="text-lg font-black text-foreground">{result.estimatedMargin.toFixed(1)}%</p>
            <p className="text-[9px] text-muted-foreground">
              {result.estimatedMargin >= 30 ? "Saudável" : result.estimatedMargin >= 15 ? "Moderada" : "Apertada"}
            </p>
          </div>

          {/* Desconto percebido */}
          <div className="p-3 rounded-xl border border-border bg-card text-center space-y-1">
            <Tag className="w-4 h-4 mx-auto text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground leading-tight">
              Desconto percebido
              <HelpTip text="Nem sempre o maior desconto é o melhor. O ideal é equilibrar percepção de vantagem e lucro." />
            </p>
            <p className="text-lg font-black text-foreground">{result.clientSavingsPercent.toFixed(0)}%</p>
            <p className="text-[9px] text-muted-foreground">Economia para o cliente</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Resumo rápido da estratégia */}
      <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-primary shrink-0" />
          <p className="text-xs font-bold text-foreground">Resumo rápido da estratégia</p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
      </div>

      {/* Alertas automáticos */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 p-3 rounded-lg text-sm",
                alert.type === "success" && "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400",
                alert.type === "warning" && "bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-400",
                alert.type === "danger" && "bg-destructive/5 border border-destructive/20 text-destructive",
              )}
            >
              {alert.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
              {alert.type === "warning" && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              {alert.type === "danger" && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
              <span className="text-xs">{alert.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
