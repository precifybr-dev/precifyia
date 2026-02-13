import { useState, useMemo } from "react";
import { DollarSign, AlertTriangle, TrendingUp, Calculator, ArrowRight, Lightbulb } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function DemoSection() {
  const [cost, setCost] = useState("12.00");
  const [salePrice, setSalePrice] = useState("40.00");
  const [marketplaceTax, setMarketplaceTax] = useState("27");

  const calculations = useMemo(() => {
    const costNum = parseFloat(cost) || 0;
    const salePriceNum = parseFloat(salePrice) || 0;
    const taxNum = parseFloat(marketplaceTax) || 0;

    const taxAmount = salePriceNum * (taxNum / 100);
    const netProfit = salePriceNum - costNum - taxAmount;
    const margin = salePriceNum > 0 ? (netProfit / salePriceNum) * 100 : 0;
    const isLowMargin = margin < 15;

    // Suggested ideal price (targeting 30% margin)
    const targetMargin = 0.30;
    const suggestedPrice = costNum / (1 - targetMargin - taxNum / 100);

    return {
      netProfit: netProfit.toFixed(2),
      margin: margin.toFixed(1),
      isLowMargin,
      isNegative: netProfit < 0,
      suggestedPrice: suggestedPrice > 0 ? suggestedPrice.toFixed(2) : "0.00",
    };
  }, [cost, salePrice, marketplaceTax]);

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num)
      ? "0,00"
      : num.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  };

  return (
    <section id="calculadora" className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Descubra agora quanto você realmente ganha em cada prato
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Preencha com os dados de um produto e veja o resultado antes mesmo de criar conta.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
            <div className="bg-muted/50 border-b border-border px-6 py-4 flex items-center gap-3">
              <Calculator className="w-5 h-5 text-primary" />
              <span className="font-medium text-foreground">
                Simulador de Lucro
              </span>
            </div>

            <div className="p-6 lg:p-8">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Inputs */}
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Dados do seu produto
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="cost" className="text-sm font-medium">
                      Custo do Prato (R$)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        R$
                      </span>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={cost}
                        onChange={(e) => setCost(e.target.value)}
                        className="pl-10 text-lg font-semibold"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salePrice" className="text-sm font-medium">
                      Preço Atual no iFood (R$)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        R$
                      </span>
                      <Input
                        id="salePrice"
                        type="number"
                        step="0.01"
                        min="0"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        className="pl-10 text-lg font-semibold"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tax" className="text-sm font-medium">
                      Comissão do iFood (%)
                    </Label>
                    <div className="relative">
                      <Input
                        id="tax"
                        type="number"
                        step="0.1"
                        min="0"
                        max="99"
                        value={marketplaceTax}
                        onChange={(e) => setMarketplaceTax(e.target.value)}
                        className="pr-10 text-lg font-semibold"
                        placeholder="27"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Results */}
                <div className="space-y-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Seu resultado
                  </h3>

                  {/* Net Profit */}
                  <div
                    className={`p-5 rounded-xl border-2 ${
                      calculations.isNegative
                        ? "border-destructive/30 bg-destructive/5"
                        : calculations.isLowMargin
                        ? "border-warning/30 bg-warning/5"
                        : "border-success/30 bg-success/5"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign
                        className={`w-4 h-4 ${
                          calculations.isNegative
                            ? "text-destructive"
                            : calculations.isLowMargin
                            ? "text-warning"
                            : "text-success"
                        }`}
                      />
                      <span className="text-xs text-muted-foreground">
                        Lucro Real por Prato
                      </span>
                    </div>
                    <p
                      className={`text-3xl font-bold ${
                        calculations.isNegative
                          ? "text-destructive"
                          : calculations.isLowMargin
                          ? "text-warning"
                          : "text-success"
                      }`}
                    >
                      R$ {formatCurrency(calculations.netProfit)}
                    </p>
                  </div>

                  {/* Margin */}
                  <div
                    className={`p-5 rounded-xl border-2 ${
                      calculations.isNegative
                        ? "border-destructive/30 bg-destructive/5"
                        : calculations.isLowMargin
                        ? "border-warning/30 bg-warning/5"
                        : "border-success/30 bg-success/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <TrendingUp
                          className={`w-4 h-4 ${
                            calculations.isNegative
                              ? "text-destructive"
                              : calculations.isLowMargin
                              ? "text-warning"
                              : "text-success"
                          }`}
                        />
                        <span className="text-xs text-muted-foreground">
                          Margem Líquida
                        </span>
                      </div>
                      {(calculations.isLowMargin || calculations.isNegative) && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                          <AlertTriangle className="w-3 h-3" />
                          {calculations.isNegative ? "Prejuízo" : "Margem baixa"}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-3xl font-bold ${
                        calculations.isNegative
                          ? "text-destructive"
                          : calculations.isLowMargin
                          ? "text-warning"
                          : "text-success"
                      }`}
                    >
                      {calculations.margin}%
                    </p>
                  </div>

                  {/* Suggested Price */}
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Sugestão de Preço Ideal
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      R$ {formatCurrency(calculations.suggestedPrice)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Para atingir 30% de margem líquida
                    </p>
                  </div>

                  {(calculations.isLowMargin || calculations.isNegative) && (
                    <div className="p-4 rounded-xl bg-warning/5 border border-warning/20">
                      <p className="text-sm text-foreground font-medium mb-1">
                        ⚠️ Atenção
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {calculations.isNegative
                          ? "Você está vendendo no prejuízo neste produto. Cada venda é dinheiro perdido."
                          : "Sua margem está abaixo do recomendado. Ajuste seu preço para manter o negócio saudável."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Você vê o resultado antes mesmo de criar conta.
          </p>

          <div className="text-center mt-8">
            <Link to="/register">
              <Button
                size="lg"
                className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group"
              >
                Calcular meu lucro agora
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
