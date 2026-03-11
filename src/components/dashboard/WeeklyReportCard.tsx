import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stethoscope,
  ChevronRight,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useToast } from "@/hooks/use-toast";
import { formatDateSP } from "@/lib/date-utils";

interface ReportSummary {
  loss_products: number;
  low_margin_products: number;
  balanced_products: number;
  healthy_products: number;
}

interface WeeklyReport {
  id: string;
  generated_at: string;
  summary: ReportSummary;
  advisor_message: string;
  total_products_analyzed: number;
}

export default function WeeklyReportCard() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { activeStore } = useStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchLatestReport();
  }, [activeStore?.id]);

  const fetchLatestReport = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setLoading(false); return; }

    let query = supabase
      .from("dr_margem_reports")
      .select("id, generated_at, summary, advisor_message, total_products_analyzed")
      .eq("user_id", session.user.id)
      .order("generated_at", { ascending: false })
      .limit(1);

    if (activeStore?.id) query = query.eq("store_id", activeStore.id);

    const { data } = await query;
    if (data && data.length > 0) {
      const raw = data[0] as any;
      setReport({
        ...raw,
        summary: raw.summary as ReportSummary,
      });
    } else {
      setReport(null);
    }
    setLoading(false);
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-weekly-report", {
        body: { store_id: activeStore?.id || null },
      });
      if (error) throw error;
      toast({ title: "Relatório gerado!", description: "Dr. Margem analisou seu cardápio." });
      await fetchLatestReport();
    } catch (err: any) {
      toast({
        title: "Erro ao gerar relatório",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
            <div className="h-3 w-56 bg-muted rounded animate-pulse mt-1.5" />
          </div>
        </div>
      </div>
    );
  }

  // No report yet
  if (!report) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-base text-foreground">
              Relatório Semanal
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Gere seu primeiro relatório do Dr. Margem para receber um diagnóstico completo do cardápio.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full mt-3 h-11"
          onClick={handleGenerateReport}
          disabled={generating}
        >
          {generating ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Stethoscope className="w-4 h-4 mr-2" />
          )}
          {generating ? "Analisando cardápio..." : "Gerar relatório agora"}
        </Button>
      </div>
    );
  }

  const s = report.summary;
  const hasUrgent = s.loss_products > 0 || s.low_margin_products > 0;

  return (
    <div className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-base text-foreground">
                Relatório Semanal
              </h3>
              <Badge variant="secondary" className="text-[10px]">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDateSP(report.generated_at, "dd MMM")}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 italic leading-relaxed">
              "{report.advisor_message}"
            </p>
          </div>
        </div>

        {/* Summary pills */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {s.loss_products > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
              <span className="text-xs text-destructive font-medium">
                {s.loss_products} em prejuízo
              </span>
            </div>
          )}
          {s.low_margin_products > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-2">
              <TrendingUp className="w-3.5 h-3.5 text-warning-foreground flex-shrink-0" />
              <span className="text-xs text-warning-foreground font-medium">
                {s.low_margin_products} margem baixa
              </span>
            </div>
          )}
          {s.balanced_products > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground font-medium">
                {s.balanced_products} equilibrado(s)
              </span>
            </div>
          )}
          {s.healthy_products > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/20 px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-success flex-shrink-0" />
              <span className="text-xs text-success font-medium">
                {s.healthy_products} saudável(is)
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            className="flex-1 h-10 text-sm"
            onClick={() => navigate("/app/reports")}
          >
            Ver relatório completo
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-10 text-xs text-muted-foreground"
            onClick={handleGenerateReport}
            disabled={generating}
          >
            {generating ? (
              <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
            )}
            Atualizar
          </Button>
        </div>
      </div>
    </div>
  );
}
