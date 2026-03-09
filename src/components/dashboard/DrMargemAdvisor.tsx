import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stethoscope,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  FileSpreadsheet,
  FlaskConical,
  EyeOff,
  Eye,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import {
  generateAllRecommendations,
  filterIgnoredRecommendations,
  type DrMargemRecommendation,
  type DrMargemPriority,
  type IgnoredAlertsMap,
} from "@/lib/dr-margem-engine";

// --- Helpers ---

function getIgnoredKey(storeId?: string) {
  return `precify_dr_margem_ignored_${storeId || "default"}`;
}

function loadIgnored(storeId?: string): IgnoredAlertsMap {
  try {
    const raw = localStorage.getItem(getIgnoredKey(storeId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveIgnored(map: IgnoredAlertsMap, storeId?: string) {
  localStorage.setItem(getIgnoredKey(storeId), JSON.stringify(map));
}

// --- Priority config ---

const priorityConfig: Record<
  DrMargemPriority,
  { label: string; color: string; bg: string; border: string; icon: typeof AlertTriangle }
> = {
  alta: {
    label: "Alta",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    icon: AlertTriangle,
  },
  media: {
    label: "Média",
    color: "text-warning-foreground",
    bg: "bg-warning/10",
    border: "border-warning/20",
    icon: TrendingUp,
  },
  baixa: {
    label: "Baixa",
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/20",
    icon: Sparkles,
  },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

// --- Recommendation Card ---

function RecommendationCard({
  rec,
  onIgnore,
}: {
  rec: DrMargemRecommendation;
  onIgnore: (rec: DrMargemRecommendation) => void;
}) {
  const cfg = priorityConfig[rec.priority];
  const navigate = useNavigate();
  const d = rec.details;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 transition-all duration-200`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
          <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-foreground truncate">{rec.title}</h4>
            <Badge variant="outline" className={`text-[10px] ${cfg.color} border-current flex-shrink-0`}>
              {cfg.label}
            </Badge>
          </div>

          {/* Financial details */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
            <span className="text-xs text-muted-foreground">
              Preço: <span className="font-medium text-foreground">{formatCurrency(d.price)}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              CMV: <span className="font-medium text-foreground">{d.cmv.toFixed(1)}%</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Lucro:{" "}
              <span className={`font-medium ${d.estimatedProfit < 0 ? "text-destructive" : "text-success"}`}>
                {formatCurrency(d.estimatedProfit)}
              </span>
            </span>
          </div>

          <p className="text-xs text-foreground/80 leading-relaxed mb-2">{rec.message}</p>

          {rec.priceSuggestion && (
            <p className="text-xs text-primary font-medium mb-2 flex items-start gap-1.5">
              <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {rec.priceSuggestion}
            </p>
          )}

          <div className="space-y-1 mb-3">
            {rec.actions.slice(0, 3).map((action, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <ArrowRight className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                {action}
              </p>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("dr-margem-test", {
                    detail: {
                      productName: rec.productName || rec.title,
                      price: d.price,
                      cost: d.totalCost ?? d.price * (d.cmv / 100),
                    },
                  })
                );
                const el = document.getElementById("margin-consultant");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth", block: "start" });
                } else {
                  navigate("/app/dashboard");
                }
              }}
            >
              <FlaskConical className="w-3 h-3 mr-1" />
              Testar solução
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => navigate("/app/recipes")}
            >
              <FileSpreadsheet className="w-3 h-3 mr-1" />
              Ver ficha
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => onIgnore(rec)}
            >
              <X className="w-3 h-3 mr-1" />
              Ignorar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Component ---

export default function DrMargemAdvisor() {
  const [allRecs, setAllRecs] = useState<DrMargemRecommendation[]>([]);
  const [ignoredMap, setIgnoredMap] = useState<IgnoredAlertsMap>({});
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [loading, setLoading] = useState(true);
  const { activeStore } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    setIgnoredMap(loadIgnored(activeStore?.id));
  }, [activeStore?.id]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      let query = supabase
        .from("recipes")
        .select("name, total_cost, selling_price, cost_per_serving, ifood_selling_price, cmv_target")
        .eq("user_id", session.user.id)
        .order("name");

      if (activeStore?.id) query = query.eq("store_id", activeStore.id);

      const { data } = await query;
      if (data && data.length > 0) {
        setAllRecs(generateAllRecommendations(data));
      } else {
        setAllRecs([]);
      }
      setLoading(false);
    };

    fetchData();
  }, [activeStore?.id]);

  const handleIgnore = useCallback((rec: DrMargemRecommendation) => {
    const updated = {
      ...ignoredMap,
      [rec.id]: {
        ignoredAt: new Date().toISOString(),
        productName: rec.productName || "",
        type: rec.type,
        conditionHash: rec.conditionHash,
      },
    };
    setIgnoredMap(updated);
    saveIgnored(updated, activeStore?.id);
  }, [ignoredMap, activeStore?.id]);

  const handleRestore = useCallback((alertId: string) => {
    const updated = { ...ignoredMap };
    delete updated[alertId];
    setIgnoredMap(updated);
    saveIgnored(updated, activeStore?.id);
  }, [ignoredMap, activeStore?.id]);

  const activeRecs = filterIgnoredRecommendations(allRecs, ignoredMap);
  const ignoredRecs = allRecs.filter((r) => {
    const ignored = ignoredMap[r.id];
    return ignored && ignored.conditionHash === r.conditionHash;
  });
  const ignoredCount = ignoredRecs.length;

  const maxVisible = 3;
  const visibleRecs = showAll ? activeRecs : activeRecs.slice(0, maxVisible);
  const hasMore = activeRecs.length > maxVisible && !showAll;

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-3 w-48 bg-muted rounded animate-pulse mt-1.5" />
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (allRecs.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-base text-foreground">Dr. Margem</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Cadastre seus produtos para receber recomendações inteligentes sobre margem e preço.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full mt-3 h-11"
          onClick={() => navigate("/app/recipes")}
        >
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Cadastrar produto
        </Button>
      </div>
    );
  }

  // All active ignored — show summary
  if (activeRecs.length === 0 && ignoredCount > 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-base text-foreground">Dr. Margem</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nenhuma recomendação ativa. {ignoredCount} alerta(s) ignorado(s).
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 text-xs text-muted-foreground"
          onClick={() => { setExpanded(true); setShowIgnored(true); }}
        >
          <Eye className="w-3 h-3 mr-1" />
          Mostrar ignorados
        </Button>

        {expanded && showIgnored && (
          <div className="mt-3 border-t border-border pt-3 space-y-3">
            {ignoredRecs.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{rec.title}</p>
                  <p className="text-[10px] text-muted-foreground">{rec.message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs flex-shrink-0"
                  onClick={() => handleRestore(rec.id)}
                >
                  Restaurar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const topRec = activeRecs[0];
  const topCfg = priorityConfig[topRec.priority];

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      {/* Header */}
      <button
        className="w-full p-4 sm:p-5 flex items-start gap-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Stethoscope className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-base text-foreground">Dr. Margem</h3>
            <Badge variant="secondary" className="text-[10px]">
              {activeRecs.length} {activeRecs.length === 1 ? "alerta" : "alertas"}
            </Badge>
          </div>
          {!expanded && (
            <div className="mt-1.5">
              <p className={`text-xs ${topCfg.color} font-medium`}>{topRec.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{topRec.message}</p>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 mt-1">
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded recommendations */}
      {expanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border pt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {visibleRecs.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} onIgnore={handleIgnore} />
          ))}

          {hasMore && (
            <Button
              variant="outline"
              size="sm"
              className="w-full h-9 text-xs"
              onClick={() => setShowAll(true)}
            >
              Ver todas recomendações ({activeRecs.length - maxVisible} mais)
            </Button>
          )}

          {/* Ignored toggle */}
          {ignoredCount > 0 && (
            <div className="pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs text-muted-foreground"
                onClick={() => setShowIgnored(!showIgnored)}
              >
                {showIgnored ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {showIgnored ? "Ocultar" : "Mostrar"} {ignoredCount} ignorado(s)
              </Button>

              {showIgnored && (
                <div className="mt-2 space-y-2">
                  {ignoredRecs.map((rec) => (
                    <div key={rec.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{rec.title}</p>
                        <p className="text-[10px] text-muted-foreground">{rec.message}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs flex-shrink-0"
                        onClick={() => handleRestore(rec.id)}
                      >
                        Restaurar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CTA when collapsed */}
      {!expanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <Button
            variant="outline"
            className="w-full sm:w-auto h-10 text-sm"
            onClick={() => setExpanded(true)}
          >
            <Stethoscope className="w-4 h-4 mr-2" />
            Ver recomendações
          </Button>
        </div>
      )}
    </div>
  );
}
