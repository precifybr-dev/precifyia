import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, ArrowLeft, Menu, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { StoreSwitcher } from "@/components/store/StoreSwitcher";
import { useCMV } from "@/hooks/useCMV";
import { CMVOnboarding } from "@/components/cmv/CMVOnboarding";
import { CMVPeriodForm } from "@/components/cmv/CMVPeriodForm";
import { CMVDashboard } from "@/components/cmv/CMVDashboard";

const MESES = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export default function CMVGlobal() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<"form" | "dashboard">("form");
  const navigate = useNavigate();

  const {
    periodos,
    periodoAtual,
    categorias,
    isLoading: cmvLoading,
    isSaving,
    mesSelecionado,
    anoSelecionado,
    setMesSelecionado,
    setAnoSelecionado,
    salvarPeriodo,
    getStatusCMV,
    calcularMetaAutomatica,
    CATEGORIAS_PADRAO,
  } = useCMV();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { navigate("/login"); return; }
      setUser(session.user);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!profileData || profileData.onboarding_step !== "completed") {
        navigate("/onboarding");
        return;
      }

      setProfile(profileData);
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  // Decide se mostra onboarding
  useEffect(() => {
    if (!isLoading && periodos.length === 0 && !periodoAtual) {
      setShowOnboarding(true);
    }
  }, [isLoading, periodos, periodoAtual]);

  // Se tem dados, mostra dashboard por default
  useEffect(() => {
    if (periodoAtual && Number(periodoAtual.cmv_calculado) > 0) {
      setActiveTab("dashboard");
    } else {
      setActiveTab("form");
    }
  }, [periodoAtual]);

  const metaAutomatica = calcularMetaAutomatica();

  const anoAtual = new Date().getFullYear();
  const anos = Array.from({ length: 6 }, (_, i) => anoAtual - i);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} user={user} profile={profile} />

      <main className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 hover:bg-muted rounded-lg flex-shrink-0" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/app/business")} className="gap-1 px-2 flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                CMV Global Inteligente
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Controle seu custo real mensal</p>
            </div>
            <div className="hidden sm:block"><StoreSwitcher /></div>
          </div>
        </header>

        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
          {showOnboarding ? (
            <CMVOnboarding onComplete={() => setShowOnboarding(false)} />
          ) : (
            <div className="space-y-6">
              {/* Seleção de período */}
              <div className="flex flex-wrap items-center gap-3">
                <Select value={String(mesSelecionado)} onValueChange={(v) => setMesSelecionado(Number(v))}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(Number(v))}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {anos.map((a) => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-1 ml-auto">
                  <Button
                    variant={activeTab === "form" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("form")}
                  >
                    Inserir Dados
                  </Button>
                  <Button
                    variant={activeTab === "dashboard" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab("dashboard")}
                    disabled={!periodoAtual}
                  >
                    Dashboard
                  </Button>
                </div>
              </div>

              {activeTab === "form" ? (
                <CMVPeriodForm
                  periodoAtual={periodoAtual}
                  categorias={categorias}
                  isSaving={isSaving}
                  categoriasDefault={CATEGORIAS_PADRAO}
                  onSave={salvarPeriodo}
                />
              ) : periodoAtual ? (
                <CMVDashboard
                  periodoAtual={periodoAtual}
                  periodos={periodos}
                  metaAutomatica={metaAutomatica}
                  getStatusCMV={getStatusCMV}
                />
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
