import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles, AlertTriangle, Crown, Loader2,
  Plus, History, LayoutList, Settings, Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCombos } from "@/hooks/useCombos";
import { ComboCreationWizard } from "@/components/combos/ComboCreationWizard";
import { ComboHistoryList } from "@/components/combos/ComboHistoryList";
import { MenuStrategySection } from "@/components/combos/MenuStrategySection";
import { ManualComboBuilder } from "@/components/combos/ManualComboBuilder";
import { AppLayout } from "@/components/layout/AppLayout";

export default function Combos() {
  const navigate = useNavigate();
  const {
    combos, isLoading, isGenerating, monthlyUsage, usageLimit,
    canGenerate, isFree, availableRecipes, availableBeverages,
    generateCombo, generateMenuStrategy, deleteCombo, objectiveLabels,
    refresh,
  } = useCombos();

  const [activeTab, setActiveTab] = useState("manual");
  const [showWizard, setShowWizard] = useState(false);

  const headerActions = (
    <Badge variant="secondary" className="text-xs sm:text-sm py-1 px-3">
      {monthlyUsage} / {usageLimit ?? "∞"} este mês
    </Badge>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <AppLayout title="Combos Inteligentes" subtitle="Combos + Estratégia de Topo · Delivery & iFood" headerActions={headerActions}>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Beta Warning */}
        <Alert className="border-warning/30 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="text-xs sm:text-sm text-muted-foreground">
            ⚠️ Funcionalidade em <strong>BETA</strong> com uso de Inteligência Artificial.
            Os resultados são sugestões estratégicas e devem ser revisados.
          </AlertDescription>
        </Alert>

        {isFree && (
          <Alert className="border-primary/30 bg-primary/5">
            <Crown className="h-4 w-4 text-primary" />
            <AlertDescription className="text-xs sm:text-sm">
              Plano Free: <strong>1 simulação</strong> disponível. Faça upgrade para usos reais.
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="manual" className="gap-1.5 text-xs sm:text-sm py-2.5">
              <Wrench className="w-4 h-4" /><span className="hidden sm:inline">Montar Combo</span><span className="sm:hidden">Montar</span>
            </TabsTrigger>
            <TabsTrigger value="create" className="gap-1.5 text-xs sm:text-sm py-2.5">
              <Sparkles className="w-4 h-4" /><span className="hidden sm:inline">IA Automática</span><span className="sm:hidden">IA</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm py-2.5">
              <History className="w-4 h-4" /><span>Histórico</span>
            </TabsTrigger>
            <TabsTrigger value="strategy" className="gap-1.5 text-xs sm:text-sm py-2.5">
              <LayoutList className="w-4 h-4" /><span className="hidden sm:inline">Topo Cardápio</span><span className="sm:hidden">Topo</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5 text-xs sm:text-sm py-2.5">
              <Settings className="w-4 h-4" /><span className="hidden sm:inline">Configurações</span><span className="sm:hidden">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="mt-4">
            <ManualComboBuilder
              recipes={availableRecipes}
              beverages={availableBeverages}
              onSaved={() => { refresh(); setActiveTab("history"); }}
            />
          </TabsContent>

          <TabsContent value="create" className="mt-4 space-y-4">
            {!showWizard ? (
              <div className="flex flex-col items-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <h2 className="font-display font-bold text-lg text-foreground">Criar Combo Estratégico</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    A IA analisará seu cardápio e criará combos lucrativos otimizados para delivery.
                  </p>
                </div>
                <Button size="lg" onClick={() => setShowWizard(true)} disabled={!canGenerate} className="gap-2 text-base px-8">
                  <Sparkles className="w-5 h-5" /> Criar Combo com IA
                </Button>
                {!canGenerate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-warning" /> Limite atingido · Upgrade para mais usos
                  </p>
                )}
              </div>
            ) : (
              <ComboCreationWizard
                recipes={availableRecipes} beverages={availableBeverages}
                isGenerating={isGenerating} canGenerate={canGenerate} isFree={isFree}
                onGenerate={(objective, selectedItems) => { generateCombo(objective, selectedItems); setShowWizard(false); setActiveTab("history"); }}
                onCancel={() => setShowWizard(false)}
              />
            )}
            {isGenerating && (
              <div className="flex flex-col items-center py-10 gap-4 animate-fade-in">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <div className="text-center">
                  <p className="font-medium text-foreground">Analisando seu cardápio...</p>
                  <p className="text-sm text-muted-foreground mt-1">A IA está criando o combo ideal para delivery</p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ComboHistoryList combos={combos} objectiveLabels={objectiveLabels} onDelete={deleteCombo} />
          </TabsContent>

          <TabsContent value="strategy" className="mt-4">
            <MenuStrategySection canGenerate={canGenerate} isFree={isFree} isGenerating={isGenerating} onGenerate={generateMenuStrategy} />
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <div className="space-y-4">
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold text-foreground mb-4">Uso e Limites</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-2xl font-bold text-foreground">{monthlyUsage}</p>
                    <p className="text-xs text-muted-foreground">Usos este mês</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-2xl font-bold text-foreground">{usageLimit ?? "∞"}</p>
                    <p className="text-xs text-muted-foreground">Limite mensal</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <p className="text-2xl font-bold text-foreground capitalize">{isFree ? "Free" : "Pago"}</p>
                    <p className="text-xs text-muted-foreground">Plano atual</p>
                  </div>
                </div>
              </div>
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold text-foreground mb-2">Sobre os Limites</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• <strong className="text-foreground">Montar Combo:</strong> sem limite (usa IA apenas para nome/descrição)</p>
                  <p>• Cada geração de combo IA = <strong className="text-foreground">1 uso</strong></p>
                  <p>• Cada geração de estratégia de topo = <strong className="text-foreground">1 uso</strong></p>
                  <p>• <strong className="text-foreground">Free:</strong> 1 simulação</p>
                  <p>• <strong className="text-foreground">Básico:</strong> 3 usos/mês</p>
                  <p>• <strong className="text-foreground">Pro:</strong> 5 usos/mês</p>
                  <p>• <strong className="text-foreground">Extra:</strong> R$ 9,99 = 3 usos adicionais (em breve)</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
