import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stethoscope,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Menu,
  RefreshCw,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useToast } from "@/hooks/use-toast";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProductDetail {
  name: string;
  price: number;
  cost: number;
  margin: number;
  cmv: number;
  estimatedProfit: number;
  message: string;
  suggestion?: string;
}

interface ReportSummary {
  loss_products: number;
  low_margin_products: number;
  balanced_products: number;
  healthy_products: number;
}

interface FullReport {
  id: string;
  generated_at: string;
  summary: ReportSummary;
  critical_products: ProductDetail[];
  improvement_opportunities: ProductDetail[];
  strong_products: ProductDetail[];
  advisor_message: string;
  total_products_analyzed: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const ONE_HOUR = 60 * 60 * 1000;

function mapReports(data: any[]): FullReport[] {
  return data.map((r: any) => ({
    ...r,
    summary: r.summary as ReportSummary,
    critical_products: r.critical_products as ProductDetail[],
    improvement_opportunities: r.improvement_opportunities as ProductDetail[],
    strong_products: r.strong_products as ProductDetail[],
  }));
}

function ProductCard({
  product,
  variant,
}: {
  product: ProductDetail;
  variant: "critical" | "improvement" | "strong";
}) {
  const config = {
    critical: { bg: "bg-destructive/5", border: "border-destructive/20", icon: AlertTriangle, color: "text-destructive" },
    improvement: { bg: "bg-warning/5", border: "border-warning/20", icon: TrendingUp, color: "text-warning-foreground" },
    strong: { bg: "bg-success/5", border: "border-success/20", icon: Sparkles, color: "text-success" },
  }[variant];
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">{product.name}</h4>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 mb-2">
            <span className="text-xs text-muted-foreground">
              Preço: <span className="font-medium text-foreground">{formatCurrency(product.price)}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              Margem: <span className={`font-medium ${product.margin < 0 ? "text-destructive" : "text-foreground"}`}>
                {product.margin.toFixed(1)}%
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              Lucro: <span className={`font-medium ${product.estimatedProfit < 0 ? "text-destructive" : "text-success"}`}>
                {formatCurrency(product.estimatedProfit)}
              </span>
            </span>
          </div>
          <p className="text-xs text-foreground/80 italic mb-1">
            <Stethoscope className="w-3 h-3 inline mr-1" />
            Dr. Margem diz: "{product.message}"
          </p>
          {product.suggestion && (
            <p className="text-xs text-primary font-medium flex items-start gap-1.5 mt-1">
              <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {product.suggestion}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DrMargemReports() {
  const [reports, setReports] = useState<FullReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const { activeStore } = useStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, [activeStore?.id]);

  const fetchReports = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); navigate("/login"); return; }
    setUser(session.user);

    const { data: profileData } = await supabase
      .from("profiles").select("*").eq("user_id", session.user.id).maybeSingle();
    setProfile(profileData);

    let query = supabase
      .from("dr_margem_reports")
      .select("*")
      .eq("user_id", session.user.id)
      .order("generated_at", { ascending: false })
      .limit(12);

    if (activeStore?.id) query = query.eq("store_id", activeStore.id);

    const { data } = await query;
    if (data && data.length > 0) {
      const mapped = data.map((r: any) => ({
        ...r,
        summary: r.summary as ReportSummary,
        critical_products: r.critical_products as ProductDetail[],
        improvement_opportunities: r.improvement_opportunities as ProductDetail[],
        strong_products: r.strong_products as ProductDetail[],
      }));
      setReports(mapped);
      setSelectedReport(mapped[0]);
    } else {
      setReports([]);
      setSelectedReport(null);
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("generate-weekly-report", {
        body: { store_id: activeStore?.id || null },
      });
      if (error) throw error;
      toast({ title: "Relatório gerado!", description: "Dr. Margem analisou seu cardápio." });
      await fetchReports();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const r = selectedReport;

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} profile={profile} />

      <main className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 hover:bg-muted rounded-lg" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/app")} className="gap-1">
              <ChevronLeft className="w-4 h-4" /> Dashboard
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-bold text-foreground">
                Relatórios do Dr. Margem
              </h1>
            </div>
            <Button onClick={handleGenerate} disabled={generating} size="sm">
              {generating ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Stethoscope className="w-4 h-4 mr-1" />}
              {generating ? "Gerando..." : "Novo relatório"}
            </Button>
          </div>
        </header>

        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !r ? (
            <div className="text-center py-16">
              <Stethoscope className="w-12 h-12 text-primary/30 mx-auto mb-4" />
              <h2 className="font-display font-semibold text-lg text-foreground mb-2">
                Nenhum relatório ainda
              </h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Gere seu primeiro relatório para receber um diagnóstico completo do cardápio pelo Dr. Margem.
              </p>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Stethoscope className="w-4 h-4 mr-2" />}
                Gerar primeiro relatório
              </Button>
            </div>
          ) : (
            <>
              {/* Report selector */}
              {reports.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-minimal">
                  {reports.map((rep) => (
                    <button
                      key={rep.id}
                      onClick={() => setSelectedReport(rep)}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                        selectedReport?.id === rep.id
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-card border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {format(new Date(rep.generated_at), "dd MMM yyyy", { locale: ptBR })}
                    </button>
                  ))}
                </div>
              )}

              {/* Section 1: Diagnóstico */}
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-card mb-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Stethoscope className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-semibold text-lg text-foreground">
                      Diagnóstico do Cardápio
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(r.generated_at), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}
                      {" · "}{r.total_products_analyzed} produtos analisados
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="text-center p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                    <p className="text-2xl font-bold text-destructive">{r.summary.loss_products}</p>
                    <p className="text-[10px] text-destructive/80 mt-0.5">Em prejuízo</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-warning/5 border border-warning/10">
                    <p className="text-2xl font-bold text-warning-foreground">{r.summary.low_margin_products}</p>
                    <p className="text-[10px] text-warning-foreground/80 mt-0.5">Margem baixa</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-muted">
                    <p className="text-2xl font-bold text-foreground">{r.summary.balanced_products}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Equilibrado</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-success/5 border border-success/10">
                    <p className="text-2xl font-bold text-success">{r.summary.healthy_products}</p>
                    <p className="text-[10px] text-success/80 mt-0.5">Saudável</p>
                  </div>
                </div>

                <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                  <p className="text-sm text-foreground/90 italic flex items-start gap-2">
                    <Stethoscope className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    "{r.advisor_message}"
                  </p>
                </div>
              </div>

              {/* Section 2: Critical */}
              {r.critical_products.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-display font-semibold text-base text-foreground mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    Atenção Urgente
                  </h3>
                  <div className="space-y-3">
                    {r.critical_products.map((p, i) => (
                      <ProductCard key={i} product={p} variant="critical" />
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Improvement */}
              {r.improvement_opportunities.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-display font-semibold text-base text-foreground mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-warning-foreground" />
                    Oportunidades de Melhoria
                  </h3>
                  <div className="space-y-3">
                    {r.improvement_opportunities.map((p, i) => (
                      <ProductCard key={i} product={p} variant="improvement" />
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Strong */}
              {r.strong_products.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-display font-semibold text-base text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-success" />
                    Produtos Fortes
                  </h3>
                  <div className="space-y-3">
                    {r.strong_products.map((p, i) => (
                      <ProductCard key={i} product={p} variant="strong" />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
