import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart3, BookOpen, CheckCircle, TrendingDown, AlertTriangle } from "lucide-react";

interface CMVOnboardingProps {
  onComplete: () => void;
}

export function CMVOnboarding({ onComplete }: CMVOnboardingProps) {
  const [step, setStep] = useState(0);
  const [checklist, setChecklist] = useState({
    estoque_fisico: false,
    custo_medio: false,
    notas_compra: false,
    sem_estimativas: false,
  });

  const allChecked = Object.values(checklist).every(Boolean);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 flex items-center gap-2">
            <div className={`h-2 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">O que é CMV?</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Entenda o indicador mais importante do seu negócio</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm text-foreground/80 leading-relaxed">
              <p>
                <strong>CMV (Custo da Mercadoria Vendida)</strong> é o valor real que você gastou com ingredientes e insumos para produzir tudo que vendeu no mês.
              </p>
              <div className="p-4 rounded-lg bg-accent/50 border border-accent">
                <p className="font-semibold text-accent-foreground mb-2">⚠️ CMV da ficha técnica ≠ CMV real</p>
                <p className="text-accent-foreground/80">
                  A ficha técnica mostra o custo <strong>teórico</strong>. O CMV real inclui desperdícios, erros de porcionamento, furtos e perdas que a ficha não captura.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="font-semibold text-foreground mb-2">💰 Impacto no lucro</p>
                <p>Se seu CMV real está 5% acima do planejado em um faturamento de R$ 30.000/mês, você está perdendo <strong>R$ 1.500/mês</strong> — ou <strong>R$ 18.000/ano</strong>.</p>
              </div>
            </div>
            <Button onClick={() => setStep(1)} className="w-full">
              Entendi, próximo passo
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <CardTitle className="text-xl">Como fazer inventário</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Siga essas regras para dados confiáveis</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm leading-relaxed">
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-lg">📦</span>
                  <div>
                    <p className="font-medium">Conte o estoque físico real</p>
                    <p className="text-muted-foreground">Nada de "acho que tem mais ou menos".</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-lg">💲</span>
                  <div>
                    <p className="font-medium">Use o custo médio atual</p>
                    <p className="text-muted-foreground">Preço que você pagou, não preço de venda.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-lg">🚫</span>
                  <div>
                    <p className="font-medium">Não misture estoques</p>
                    <p className="text-muted-foreground">Estoque pessoal ≠ estoque do negócio.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <span className="text-lg">📅</span>
                  <div>
                    <p className="font-medium">Sempre no mesmo dia</p>
                    <p className="text-muted-foreground">Faça o inventário sempre no 1º ou último dia do mês.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold">✅ Checklist antes de continuar:</p>
              {[
                { key: "estoque_fisico" as const, label: "Conferi estoque físico" },
                { key: "custo_medio" as const, label: "Usei custo médio atualizado" },
                { key: "notas_compra" as const, label: "Conferi notas de compra" },
                { key: "sem_estimativas" as const, label: "Não estimei valores" },
              ].map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={checklist[item.key]}
                    onCheckedChange={(checked) =>
                      setChecklist((prev) => ({ ...prev, [item.key]: !!checked }))
                    }
                  />
                  <span className="text-sm">{item.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                Voltar
              </Button>
              <Button onClick={() => setStep(2)} disabled={!allChecked} className="flex-1">
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-warning" />
              </div>
              <div>
                <CardTitle className="text-xl">Simulação de impacto</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Veja como o CMV impacta seu lucro</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-success/5 border border-success/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">CMV Ideal (30%)</p>
                <p className="text-2xl font-bold text-success">R$ 9.000</p>
                <p className="text-xs text-muted-foreground">sobre R$ 30.000</p>
              </div>
              <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-center">
                <p className="text-xs text-muted-foreground mb-1">CMV Alto (35%)</p>
                <p className="text-2xl font-bold text-destructive">R$ 10.500</p>
                <p className="text-xs text-muted-foreground">sobre R$ 30.000</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <p className="font-semibold text-sm">Diferença de 5%</p>
              </div>
              <p className="text-sm text-foreground/80">
                Se seu CMV subir apenas <strong>5%</strong>, você perde <strong>R$ 1.500/mês</strong> — totalizando <strong>R$ 18.000 por ano</strong>.
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Voltar
              </Button>
              <Button onClick={onComplete} className="flex-1">
                <BarChart3 className="w-4 h-4 mr-2" />
                Começar a usar o CMV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
