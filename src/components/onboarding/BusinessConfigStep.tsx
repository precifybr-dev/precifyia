import { useState, useCallback } from "react";
import {
  Building2, Store, Truck, Pizza, Coffee, Beer, UtensilsCrossed,
  Cake, ChefHat, ArrowRight, ArrowLeft, Smartphone, DollarSign,
  TrendingDown, Users, FileSpreadsheet, Upload, SkipForward,
  Sparkles, Target
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SpreadsheetImportModal } from "@/components/spreadsheet-import/SpreadsheetImportModal";
import { IfoodImportModal } from "@/components/ifood-import/IfoodImportModal";
import type { Profile } from "@/hooks/useOnboarding";
import { cn } from "@/lib/utils";

interface BusinessConfigStepProps {
  profile: Profile;
  onUpdate: (updates: Partial<Profile>) => Promise<Profile | null>;
  onAdvance: () => Promise<void>;
}

type SubStep =
  | "welcome"
  | "business_name"
  | "business_type"
  | "ifood_check"
  | "ifood_details"
  | "revenue"
  | "cmv"
  | "referral"
  | "import_spreadsheet"
  | "import_ifood";

const SUB_STEPS: SubStep[] = [
  "welcome", "business_name", "business_type", "ifood_check",
  "ifood_details", "revenue", "cmv", "referral", "import_spreadsheet", "import_ifood",
];

const businessTypes = [
  { value: "restaurant", label: "Restaurante", icon: UtensilsCrossed, emoji: "🍽️" },
  { value: "bakery", label: "Padaria / Confeitaria", icon: Cake, emoji: "🧁" },
  { value: "snack_bar", label: "Lanchonete", icon: Store, emoji: "🍔" },
  { value: "food_truck", label: "Food Truck", icon: Truck, emoji: "🚚" },
  { value: "pizzeria", label: "Pizzaria", icon: Pizza, emoji: "🍕" },
  { value: "cafe", label: "Cafeteria", icon: Coffee, emoji: "☕" },
  { value: "bar", label: "Bar", icon: Beer, emoji: "🍺" },
  { value: "other", label: "Outro", icon: ChefHat, emoji: "👨‍🍳" },
];

const referralSources = [
  { value: "google", label: "Google / Pesquisa", emoji: "🔍" },
  { value: "instagram", label: "Instagram", emoji: "📸" },
  { value: "facebook", label: "Facebook", emoji: "👥" },
  { value: "tiktok", label: "TikTok", emoji: "🎵" },
  { value: "youtube", label: "YouTube", emoji: "▶️" },
  { value: "indicacao", label: "Indicação", emoji: "🤝" },
  { value: "ifood", label: "Pesquisando iFood", emoji: "🛵" },
  { value: "outro", label: "Outro", emoji: "💡" },
];

export function BusinessConfigStep({ profile, onUpdate, onAdvance }: BusinessConfigStepProps) {
  const [subStep, setSubStep] = useState<SubStep>("welcome");
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  // Collected data
  const [businessName, setBusinessName] = useState(profile.business_name || "");
  const [businessType, setBusinessType] = useState(profile.business_type || "");
  const [sellsOnIfood, setSellsOnIfood] = useState<boolean | null>(null);
  const [ifoodPlan, setIfoodPlan] = useState(profile.ifood_plan_type || "");
  const [ifoodOrders, setIfoodOrders] = useState(profile.ifood_monthly_orders?.toString() || "");
  const [ifoodTicket, setIfoodTicket] = useState(profile.ifood_average_ticket?.toString() || "");
  const [monthlyRevenue, setMonthlyRevenue] = useState(profile.monthly_revenue?.toString() || "");
  const [revenueUnknown, setRevenueUnknown] = useState(false);
  const [cmvTarget, setCmvTarget] = useState(profile.default_cmv || 30);
  const [referralSource, setReferralSource] = useState(profile.referral_source || "");

  const [isLoading, setIsLoading] = useState(false);
  const [showSpreadsheetImport, setShowSpreadsheetImport] = useState(false);
  const [showIfoodImport, setShowIfoodImport] = useState(false);

  const { toast } = useToast();

  const currentIndex = SUB_STEPS.indexOf(subStep);
  // Skip ifood_details if not selling on ifood
  const effectiveSteps = SUB_STEPS.filter(
    (s) => {
      if (s === "ifood_details" && sellsOnIfood !== true) return false;
      if (s === "import_ifood" && sellsOnIfood !== true) return false;
      return true;
    }
  );
  const effectiveIndex = effectiveSteps.indexOf(subStep);
  const progress = ((effectiveIndex + 1) / effectiveSteps.length) * 100;

  const goTo = useCallback((step: SubStep, dir: "forward" | "backward" = "forward") => {
    setDirection(dir);
    setSubStep(step);
  }, []);

  const goNext = useCallback(() => {
    const idx = effectiveSteps.indexOf(subStep);
    if (idx < effectiveSteps.length - 1) {
      goTo(effectiveSteps[idx + 1], "forward");
    }
  }, [subStep, effectiveSteps, goTo]);

  const goBack = useCallback(() => {
    const idx = effectiveSteps.indexOf(subStep);
    if (idx > 0) {
      goTo(effectiveSteps[idx - 1], "backward");
    }
  }, [subStep, effectiveSteps, goTo]);

  const handleFinish = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Create store if needed
      const { data: existingStores } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!existingStores || existingStores.length === 0) {
        const { error: storeError } = await supabase.from("stores").insert({
          user_id: user.id,
          name: businessName.trim() || "Meu Negócio",
          business_type: businessType || null,
          is_default: true,
        });
        if (storeError) throw storeError;
      }

      // Update profile with all collected data
      await onUpdate({
        business_name: businessName.trim() || null,
        business_type: businessType || null,
        default_cmv: cmvTarget,
        monthly_revenue: revenueUnknown ? null : (parseFloat(monthlyRevenue) || null),
        referral_source: referralSource || null,
        ifood_plan_type: sellsOnIfood ? (ifoodPlan || null) : null,
        ifood_monthly_orders: sellsOnIfood ? (parseInt(ifoodOrders) || null) : null,
        ifood_average_ticket: sellsOnIfood ? (parseFloat(ifoodTicket) || null) : null,
      } as any);

      toast({ title: "Tudo pronto! 🎉", description: "Seus dados foram salvos." });
      await onAdvance();
    } catch (error) {
      console.error("Error saving onboarding:", error);
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const animationClass = direction === "forward"
    ? "animate-in fade-in slide-in-from-right-8 duration-400"
    : "animate-in fade-in slide-in-from-left-8 duration-400";

  const canGoBack = effectiveIndex > 0;

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress bar */}
      {subStep !== "welcome" && (
        <div className="mb-8">
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {effectiveIndex + 1} de {effectiveSteps.length}
          </p>
        </div>
      )}

      {/* Steps */}
      <div key={subStep} className={animationClass}>
        {subStep === "welcome" && (
          <StepCard
            emoji="👋"
            title="Vamos configurar seu negócio!"
            subtitle="Em poucos passos, o Precify vai estar calibrado para você. Leva menos de 2 minutos."
          >
            <Button variant="hero" size="lg" className="w-full" onClick={() => goTo("business_name", "forward")}>
              Começar <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </StepCard>
        )}

        {subStep === "business_name" && (
          <StepCard
            emoji="🏪"
            title="Como se chama o seu negócio?"
            subtitle="Pode ser o nome fantasia ou como seus clientes te conhecem."
          >
            <Input
              autoFocus
              placeholder="Ex: Restaurante Sabor Caseiro"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="text-center text-lg h-12"
              onKeyDown={(e) => e.key === "Enter" && businessName.trim() && goNext()}
            />
            <div className="flex gap-3 mt-6">
              {canGoBack && <BackButton onClick={goBack} />}
              <Button
                variant="hero"
                size="lg"
                className="flex-1"
                onClick={goNext}
                disabled={!businessName.trim()}
              >
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </StepCard>
        )}

        {subStep === "business_type" && (
          <StepCard
            emoji="🍴"
            title="Que tipo de negócio você tem?"
            subtitle="Selecione a opção que melhor descreve seu negócio."
          >
            <div className="grid grid-cols-2 gap-3">
              {businessTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => {
                    setBusinessType(type.value);
                    setTimeout(goNext, 300);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02]",
                    businessType === type.value
                      ? "border-primary bg-accent text-accent-foreground shadow-sm"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <span className="text-2xl">{type.emoji}</span>
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              {canGoBack && <BackButton onClick={goBack} />}
            </div>
          </StepCard>
        )}

        {subStep === "ifood_check" && (
          <StepCard
            emoji="🛵"
            title="Você vende no iFood?"
            subtitle="Se sim, vamos calibrar as taxas e comissões automaticamente."
          >
            <div className="flex gap-4">
              <button
                onClick={() => { setSellsOnIfood(true); goTo("ifood_details", "forward"); }}
                className={cn(
                  "flex-1 flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:scale-[1.02]",
                  sellsOnIfood === true
                    ? "border-primary bg-accent shadow-sm"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <Smartphone className="w-8 h-8 text-primary" />
                <span className="font-semibold">Sim, vendo!</span>
              </button>
              <button
                onClick={() => { setSellsOnIfood(false); goTo("revenue", "forward"); }}
                className={cn(
                  "flex-1 flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:scale-[1.02]",
                  sellsOnIfood === false
                    ? "border-primary bg-accent shadow-sm"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <Store className="w-8 h-8 text-muted-foreground" />
                <span className="font-semibold">Não</span>
              </button>
            </div>
            <div className="flex gap-3 mt-6">
              {canGoBack && <BackButton onClick={goBack} />}
            </div>
          </StepCard>
        )}

        {subStep === "ifood_details" && (
          <StepCard
            emoji="📊"
            title="Detalhes do iFood"
            subtitle="Essas informações ajudam a calcular suas margens reais."
          >
            <div className="space-y-5">
              {/* Plan type */}
              <div>
                <p className="text-sm font-medium text-foreground mb-3">Qual o plano?</p>
                <div className="flex gap-3">
                  {[
                    { value: "entrega_propria", label: "Entrega Própria", desc: "Comissão menor" },
                    { value: "entrega_ifood", label: "Entrega iFood", desc: "Comissão maior" },
                  ].map((plan) => (
                    <button
                      key={plan.value}
                      onClick={() => setIfoodPlan(plan.value)}
                      className={cn(
                        "flex-1 p-4 rounded-xl border-2 transition-all text-center",
                        ifoodPlan === plan.value
                          ? "border-primary bg-accent"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <span className="font-medium text-sm">{plan.label}</span>
                      <span className="block text-xs text-muted-foreground mt-1">{plan.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders and ticket */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Pedidos/mês</p>
                  <Input
                    type="number"
                    placeholder="Ex: 200"
                    value={ifoodOrders}
                    onChange={(e) => setIfoodOrders(e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Ticket médio (R$)</p>
                  <Input
                    type="number"
                    placeholder="Ex: 35"
                    value={ifoodTicket}
                    onChange={(e) => setIfoodTicket(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              {canGoBack && <BackButton onClick={goBack} />}
              <Button variant="hero" size="lg" className="flex-1" onClick={goNext}>
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <SkipButton onClick={goNext} />
          </StepCard>
        )}

        {subStep === "revenue" && (
          <StepCard
            emoji="💰"
            title="Qual seu faturamento médio mensal?"
            subtitle="Esse valor ajuda o Precify a calcular seus indicadores financeiros."
          >
            {!revenueUnknown && (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                <Input
                  autoFocus
                  type="number"
                  placeholder="Ex: 15000"
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(e.target.value)}
                  className="pl-12 text-lg h-12"
                  onKeyDown={(e) => e.key === "Enter" && goNext()}
                />
              </div>
            )}

            <button
              onClick={() => { setRevenueUnknown(!revenueUnknown); setMonthlyRevenue(""); }}
              className={cn(
                "w-full mt-3 p-3 rounded-lg border text-sm transition-all text-center",
                revenueUnknown
                  ? "border-primary bg-accent text-accent-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              {revenueUnknown ? "✓ " : ""}Ainda não sei meu faturamento
            </button>

            <div className="flex gap-3 mt-6">
              {canGoBack && <BackButton onClick={goBack} />}
              <Button variant="hero" size="lg" className="flex-1" onClick={goNext}>
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </StepCard>
        )}

        {subStep === "cmv" && (
          <StepCard
            emoji="🎯"
            title="Qual CMV você deseja alcançar?"
            subtitle="CMV é o custo dos ingredientes em relação ao preço de venda. O ideal para food service é entre 25% e 35%."
          >
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-5xl font-bold text-primary">{cmvTarget}%</span>
              </div>
              <Slider
                value={[cmvTarget]}
                onValueChange={([v]) => setCmvTarget(v)}
                min={15}
                max={50}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>15% (agressivo)</span>
                <span>30% (recomendado)</span>
                <span>50% (conservador)</span>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              {canGoBack && <BackButton onClick={goBack} />}
              <Button variant="hero" size="lg" className="flex-1" onClick={goNext}>
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </StepCard>
        )}

        {subStep === "referral" && (
          <StepCard
            emoji="💬"
            title="Como conheceu o Precify?"
            subtitle="Nos ajuda a entender como você chegou até aqui."
          >
            <div className="grid grid-cols-2 gap-2">
              {referralSources.map((source) => (
                <button
                  key={source.value}
                  onClick={() => {
                    setReferralSource(source.value);
                    setTimeout(goNext, 300);
                  }}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-lg border transition-all text-left text-sm",
                    referralSource === source.value
                      ? "border-primary bg-accent"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span>{source.emoji}</span>
                  <span className="font-medium">{source.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              {canGoBack && <BackButton onClick={goBack} />}
            </div>
            <SkipButton onClick={goNext} />
          </StepCard>
        )}

        {subStep === "import_spreadsheet" && (
          <StepCard
            emoji="📊"
            title="Importar planilha de insumos"
            subtitle="Traga seus ingredientes de uma planilha Excel ou CSV. Ou pule e cadastre depois."
          >
            <div className="space-y-3">
              <button
                onClick={() => setShowSpreadsheetImport(true)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Importar planilha de insumos</p>
                  <p className="text-xs text-muted-foreground">Excel ou CSV com seus ingredientes</p>
                </div>
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              {canGoBack && <BackButton onClick={goBack} />}
              {sellsOnIfood ? (
                <Button
                  variant="hero"
                  size="lg"
                  className="flex-1"
                  onClick={goNext}
                >
                  Próximo <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  variant="hero"
                  size="lg"
                  className="flex-1"
                  onClick={handleFinish}
                  disabled={isLoading}
                >
                  {isLoading ? "Salvando..." : "Finalizar configuração"} <Sparkles className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
            <SkipButton
              label={sellsOnIfood ? "Pular →" : "Pular importação e finalizar"}
              onClick={sellsOnIfood ? goNext : handleFinish}
            />
          </StepCard>
        )}

        {subStep === "import_ifood" && (
          <StepCard
            emoji="🛵"
            title="Importar cardápio do iFood"
            subtitle="Traga seus produtos do iFood com os nomes e valores de venda já preenchidos."
          >
            <div className="space-y-3">
              <button
                onClick={() => setShowIfoodImport(true)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <Upload className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Importar cardápio do iFood</p>
                  <p className="text-xs text-muted-foreground">Cria fichas técnicas com preços de venda do iFood</p>
                </div>
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              {canGoBack && <BackButton onClick={goBack} />}
              <Button
                variant="hero"
                size="lg"
                className="flex-1"
                onClick={handleFinish}
                disabled={isLoading}
              >
                {isLoading ? "Salvando..." : "Finalizar configuração"} <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <SkipButton label="Pular importação e finalizar" onClick={handleFinish} />
          </StepCard>
        )}
      </div>

      {/* Import Modals */}
      {showSpreadsheetImport && (
        <SpreadsheetImportModal
          open={showSpreadsheetImport}
          onOpenChange={(open) => {
            setShowSpreadsheetImport(open);
            if (!open) handleFinish();
          }}
          userId={profile.user_id}
          storeId={null}
          existingIngredients={[]}
          onImportComplete={async () => { setShowSpreadsheetImport(false); await handleFinish(); }}
        />
      )}
      {showIfoodImport && (
        <IfoodImportModal
          open={showIfoodImport}
          onOpenChange={(open) => {
            setShowIfoodImport(open);
            if (!open) handleFinish();
          }}
          importType="recipes"
          userId={profile.user_id}
          userPlan="free"
          onImportComplete={async () => { setShowIfoodImport(false); await handleFinish(); }}
          onRefreshData={async () => {}}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function StepCard({ emoji, title, subtitle, children }: {
  emoji: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-center space-y-6">
      <div>
        <span className="text-5xl block mb-4">{emoji}</span>
        <h2 className="font-display text-xl md:text-2xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{subtitle}</p>
      </div>
      <div className="text-left">{children}</div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="lg" onClick={onClick} className="px-4">
      <ArrowLeft className="w-4 h-4" />
    </Button>
  );
}

function SkipButton({ onClick, label = "Pular" }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-center mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {label} →
    </button>
  );
}
