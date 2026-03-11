import { useState, useEffect } from "react";
import { capitalizeWords } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Crown, ArrowRight, FileSpreadsheet, Package, BarChart3, Sparkles, Upload, Info, Store, Trash2, AlertTriangle, TrendingUp, Check, X, Users, MessageCircle, Download, ChefHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { useStore } from "@/contexts/StoreContext";
import { PlanUpgradePrompt } from "@/components/upsell/PlanUpgradePrompt";
import { useToast } from "@/hooks/use-toast";
import { formatDateBR } from "@/lib/date-utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UsageItem {
  label: string;
  icon: typeof FileSpreadsheet;
  used: number;
  limit: number | null;
  featureKey: string;
}

const PLAN_LABELS: Record<string, string> = {
  free: "Plano Teste",
  basic: "Plano Essencial",
  pro: "Plano Pro",
};

function getPlanChecklist(plan: string) {
  const items = [
    { label: "Fichas técnicas" + (plan === "free" ? " (até 10)" : plan === "basic" ? " (até 40)" : " (ilimitadas)"), included: true },
    { label: "Insumos" + (plan === "free" ? " (até 80)" : plan === "basic" ? " (até 200)" : " (ilimitados)"), included: true },
    { label: "Dashboard Avançado + DRE", included: true },
    { label: "Sub-receitas" + (plan === "free" ? " (até 3)" : " ilimitadas"), included: true },
    { label: "Análise de cardápio (IA)" + (plan === "free" ? " — 1 total" : plan === "basic" ? " — 5/mês" : " — 15/mês"), included: true },
    { label: "Combos estratégicos (IA)" + (plan === "free" ? " — 1 total" : plan === "basic" ? " — 3/mês" : " — 10/mês"), included: true },
    { label: "Importação iFood" + (plan === "free" ? " — 1 total" : plan === "basic" ? " — 5/mês" : " ilimitada"), included: true },
    { label: "Importação de planilha" + (plan === "free" ? " — 2 totais" : plan === "basic" ? " — 7/mês" : " ilimitada"), included: true },
    { label: "Receita incremental" + (plan === "free" ? " (até 5)" : " ilimitada"), included: true },
    { label: "Exportação de dados", included: plan !== "free" },
    { label: "Multi-loja (até 3)", included: plan === "pro" },
    
    { label: "Suporte prioritário WhatsApp", included: plan === "pro" },
  ];
  return items;
}

export function PlanOverviewTab() {
  const { features, userPlan, loading: planLoading, getFeatureLimit } = usePlanFeatures();
  const { stores, deleteStore, activeStore, setActiveStore, refreshStores } = useStore();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [usageItems, setUsageItems] = useState<UsageItem[]>([]);
  const [bonusCredits, setBonusCredits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    async function loadUsage() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: prof } = await supabase
          .from("profiles")
          .select("user_plan, subscription_status, subscription_expires_at")
          .eq("user_id", user.id)
          .maybeSingle();
        setProfile(prof);

        const { count: recipesCount } = await supabase
          .from("recipes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const { count: ingredientsCount } = await supabase
          .from("ingredients")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        const plan = prof?.user_plan || "free";
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const countByEndpoint = async (endpoint: string) => {
          let query = supabase
            .from("strategic_usage_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("endpoint", endpoint);

          if (plan !== "free") {
            query = query.gte("created_at", monthStart);
          }

          const { count } = await query;
          return count || 0;
        };

        const [menuCount, comboCount, importCount] = await Promise.all([
          countByEndpoint("analyze-menu-performance"),
          countByEndpoint("generate-combo"),
          countByEndpoint("analyze-spreadsheet-columns"),
        ]);

        // Fetch bonus credits
        const { data: bonusData } = await supabase
          .from("user_bonus_credits")
          .select("feature, credits")
          .eq("user_id", user.id);

        const bonusMap: Record<string, number> = {};
        if (bonusData) {
          bonusData.forEach((b: any) => {
            bonusMap[b.feature] = b.credits;
          });
        }
        setBonusCredits(bonusMap);

        setUsageItems([
          { label: "Fichas técnicas", icon: FileSpreadsheet, used: recipesCount || 0, limit: null, featureKey: "recipes" },
          { label: "Insumos", icon: Package, used: ingredientsCount || 0, limit: null, featureKey: "ingredients" },
          { label: "Análise de cardápio (IA)", icon: BarChart3, used: menuCount, limit: null, featureKey: "menu_analysis" },
          { label: "Combos estratégicos", icon: Sparkles, used: comboCount, limit: null, featureKey: "combos_ai" },
          { label: "Importação de planilha", icon: Upload, used: importCount, limit: null, featureKey: "spreadsheet_import" },
        ]);
      } finally {
        setLoading(false);
      }
    }

    if (!planLoading) loadUsage();
  }, [planLoading]);

  const resolvedItems = usageItems.map((item) => {
    const planLimit = getFeatureLimit(item.featureKey);
    const bonus = bonusCredits[item.featureKey] || 0;
    const effectiveLimit = planLimit !== null && planLimit !== -1 ? planLimit + bonus : planLimit;
    return {
      ...item,
      limit: effectiveLimit,
      hasBonus: bonus > 0,
      bonusAmount: bonus,
    };
  });

  const getStatusText = () => {
    if (!profile || userPlan === "free") return "Sem vencimento (plano gratuito)";
    const expires = profile.subscription_expires_at;
    if (!expires) return "Sem data de vencimento";
    const formatted = formatDateBR(expires);
    if (profile.subscription_status === "canceled") return `Cancelado — Expira em ${formatted}`;
    return `Ativo — Renova em ${formatted}`;
  };

  if (loading || planLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Plan Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{PLAN_LABELS[userPlan] || "Plano Teste"}</CardTitle>
                  <p className="text-sm text-muted-foreground">{getStatusText()}</p>
                </div>
              </div>
              <Badge
                variant={userPlan === "pro" ? "outline" : userPlan === "basic" ? "default" : "secondary"}
                className={userPlan === "pro" ? "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700" : ""}
              >
                {userPlan === "pro" ? "Pro" : userPlan === "basic" ? "Essencial" : "Teste"}
              </Badge>
            </div>
          </CardHeader>
          {userPlan !== "pro" && (
            <CardContent className="pt-0">
              <Button className="w-full gap-2" onClick={() => setShowUpgrade(true)}>
                Fazer Upgrade <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          )}
        </Card>

        {/* Usage Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Uso do plano</h2>
          <div className="grid gap-3">
            {resolvedItems.map((item) => {
              const isUnlimited = item.limit === null || item.limit === -1;
              const percentage = isUnlimited ? 0 : item.limit! > 0 ? Math.min((item.used / item.limit!) * 100, 100) : 0;
              const isNearLimit = !isUnlimited && item.limit! > 0 && percentage >= 80;

              return (
                <Card key={item.featureKey}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground">{item.label}</span>
                            {item.hasBonus && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-primary/30 text-primary">
                                +{item.bonusAmount} bônus
                              </Badge>
                            )}
                          </div>
                          <span className={`text-xs font-medium ${isNearLimit ? "text-destructive" : "text-muted-foreground"}`}>
                            {isUnlimited ? `${item.used} usados` : `${item.used} / ${item.limit}`}
                          </span>
                        </div>
                        {!isUnlimited && (
                          <Progress
                            value={percentage}
                            className={`h-2 ${isNearLimit ? "[&>div]:bg-destructive" : ""}`}
                          />
                        )}
                        {isUnlimited && (
                          <p className="text-xs text-muted-foreground">Ilimitado no seu plano</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* What your plan includes - Checklist */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">O que seu plano inclui</h2>
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {getPlanChecklist(userPlan).map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-sm">
                    {item.included ? (
                      <Check className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={item.included ? "text-foreground" : "text-muted-foreground/60 line-through"}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Strategic Potential Alert for Free/Basic users */}
        {userPlan !== "pro" && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">Você está operando abaixo do seu potencial</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {userPlan === "free"
                      ? "Seu diagnóstico mostra apenas a camada inicial. Existem alavancas de crescimento e estratégias de multiplicação que ainda não foram desbloqueadas."
                      : "Você já domina o básico, mas existem 3 camadas avançadas de otimização e escala que podem transformar seus resultados."}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pl-12">
                {userPlan === "free" ? (
                  <>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">🔒 Estratégias de multiplicação</Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">🔒 Sub-receitas avançadas</Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">🔒 Otimização de escala</Badge>
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">🔒 Multi-loja (até 3)</Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">🔒 Dashboard DRE avançado</Badge>
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">🔒 Suporte WhatsApp</Badge>
                  </>
                )}
              </div>
              <div className="pl-12">
                <Button size="sm" className="gap-2" onClick={() => setShowUpgrade(true)}>
                  Desbloquear potencial completo <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Near-limit warnings */}
        {resolvedItems.some(i => i.limit !== null && i.limit !== -1 && i.limit! > 0 && (i.used / i.limit!) >= 0.8) && userPlan !== "pro" && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Você está perto de atingir seus limites</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Quando os limites são atingidos, você pode estar deixando oportunidades na mesa. 
                    O upgrade libera capacidade ilimitada e ferramentas avançadas de crescimento.
                  </p>
                  <Button variant="outline" size="sm" className="mt-2 gap-1.5 text-xs" onClick={() => setShowUpgrade(true)}>
                    Ver planos superiores <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Todos os limites são calculados por conta, independente do número de lojas cadastradas.
            {userPlan !== "free" && " Limites de uso são renovados mensalmente."}
          </p>
        </div>

        {/* Store Management */}
        {stores.length > 1 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Minhas Lojas</h2>
            <div className="grid gap-3">
              {stores.map((store) => {
                const isPrimary = store.is_default;
                return (
                  <Card key={store.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {store.logo_url ? (
                            <img src={store.logo_url} alt={store.name} className="w-full h-full object-cover" />
                          ) : (
                            <Store className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{capitalizeWords(store.name)}</span>
                            {isPrimary && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">Principal</Badge>
                            )}
                            {activeStore?.id === store.id && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary text-primary">Ativa</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {store.business_type
                              ? store.business_type.charAt(0).toUpperCase() + store.business_type.slice(1).replace(/_/g, " ")
                              : "Negócio"}
                          </p>
                        </div>
                        {!isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                            onClick={() => {
                              setStoreToDelete({ id: store.id, name: capitalizeWords(store.name) });
                              setDeleteConfirmText("");
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Excluir</span>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Delete Store Confirmation Dialog */}
      <AlertDialog open={!!storeToDelete} onOpenChange={(open) => { if (!open) { setStoreToDelete(null); setDeleteConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertDialogTitle>Excluir loja permanentemente</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a excluir a loja <strong>"{storeToDelete?.name}"</strong>. Esta ação é <strong>irreversível</strong>.
              </p>
              <p className="text-destructive font-medium">
                Todos os dados desta loja serão perdidos permanentemente, incluindo:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Fichas técnicas e sub-receitas</li>
                <li>Insumos e bebidas</li>
                <li>Custos fixos e variáveis</li>
                <li>Histórico de CMV</li>
                <li>Combos e análises</li>
              </ul>
              <div className="pt-2">
                <p className="text-sm font-medium text-foreground mb-2">
                  Para confirmar, digite <strong>excluir</strong> abaixo:
                </p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toLowerCase())}
                  placeholder="Digite 'excluir' para confirmar"
                  className="text-sm"
                  autoFocus
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "excluir"}
              onClick={async () => {
                if (!storeToDelete || deleteConfirmText !== "excluir") return;
                const success = await deleteStore(storeToDelete.id);
                if (success) {
                  await refreshStores();
                  toast({ title: "Loja excluída", description: `"${storeToDelete.name}" foi removida permanentemente.` });
                }
                setStoreToDelete(null);
                setDeleteConfirmText("");
              }}
            >
              Excluir permanentemente
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PlanUpgradePrompt
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        currentPlan={userPlan}
        feature="upgrade"
      />
    </>
  );
}
