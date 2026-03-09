import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import {
  generateRecommendations,
  type DrMargemRecommendation,
  type DrMargemResult,
  type DrMargemPriority,
} from "@/lib/dr-margem-engine";

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

function RecommendationCard({ rec }: { rec: DrMargemRecommendation }) {
  const cfg = priorityConfig[rec.priority];
  const navigate = useNavigate();

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}>
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
          <p className="text-xs text-foreground/80 leading-relaxed mb-2">{rec.message}</p>

          {rec.priceSuggestion && (
            <p className="text-xs text-primary font-medium mb-2 flex items-start gap-1.5">
              <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {rec.priceSuggestion}
            </p>
          )}

          <div className="space-y-1">
            {rec.actions.slice(0, 3).map((action, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                <ArrowRight className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                {action}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DrMargemAdvisor() {
  const [drResult, setDrResult] = useState<DrMargemResult | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const { activeStore } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
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
        const result = generateRecommendations(data);
        setDrResult(result);
      } else {
        setDrResult(null);
      }
      setLoading(false);
    };

    fetch();
  }, [activeStore?.id]);

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
  if (!drResult || drResult.totalCount === 0) {
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

  const topRec = drResult.recommendations[0];
  const topCfg = priorityConfig[topRec.priority];
  const showAll = expanded;
  const visibleRecs = showAll ? drResult.recommendations : [topRec];

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
            {drResult.totalCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {drResult.totalCount} {drResult.totalCount === 1 ? "dica" : "dicas"}
              </Badge>
            )}
          </div>
          {!expanded && (
            <div className="mt-1.5">
              <p className={`text-xs ${topCfg.color} font-medium`}>
                {topRec.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {topRec.message}
              </p>
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
          {visibleRecs.map((rec, i) => (
            <RecommendationCard key={`${rec.type}-${i}`} rec={rec} />
          ))}

          {drResult.hasMore && (
            <p className="text-xs text-muted-foreground text-center pt-1">
              +{drResult.totalCount - drResult.recommendations.length} recomendações disponíveis
            </p>
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
