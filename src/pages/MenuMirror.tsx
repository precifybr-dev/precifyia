import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, Link2, Trash2, UtensilsCrossed } from "lucide-react";
import { useMenuMirror } from "@/hooks/useMenuMirror";
import { IfoodMenuView } from "@/components/menu-mirror/IfoodMenuView";
import { MenuPerformanceDashboard } from "@/components/menu-mirror/MenuPerformanceDashboard";

export default function MenuMirror() {
  const { menuData, isLoading, isSaving, ifoodUrl, fetchMenu, saveIfoodUrl, clearUrl, analysis, isAnalyzing, analyzeMenu, loadFromCache, loadAnalysisFromCache, analysisUsage, fetchAnalysisUsage } = useMenuMirror();
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Auto-load from cache on mount (no Edge Function call, zero cost)
  useEffect(() => {
    if (ifoodUrl && !menuData && !isLoading) {
      loadFromCache();
    }
    loadAnalysisFromCache();
    fetchAnalysisUsage();
  }, [ifoodUrl]);

  const handleSaveUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed || !/ifood\.com\.br/i.test(trimmed)) return;
    saveIfoodUrl(trimmed);
    setShowUrlInput(false);
    setUrlInput("");
  };

  const hasUrl = !!ifoodUrl;

  return (
    <AppLayout>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        {/* Header */}
        <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EA1D2C]/10 flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-[#EA1D2C]" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-foreground">Meu Cardápio</h1>
                <p className="text-xs text-muted-foreground">Espelho do seu cardápio iFood</p>
              </div>
            </div>

            {hasUrl && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchMenu(undefined, true)}
                  disabled={isLoading}
                  className="gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                  Atualizar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUrlInput(true)}
                  className="gap-1.5 text-muted-foreground"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Trocar link
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* URL Input (first time or changing) */}
        {(!hasUrl || showUrlInput) && (
          <div className="max-w-2xl mx-auto p-4">
            <Card className="border-dashed border-2 border-[#EA1D2C]/30">
              <CardContent className="p-6 space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-[#EA1D2C]/10 flex items-center justify-center">
                    <UtensilsCrossed className="w-8 h-8 text-[#EA1D2C]" />
                  </div>
                  <h2 className="font-bold text-lg text-foreground">
                    {showUrlInput ? "Trocar link do iFood" : "Conecte seu cardápio"}
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Cole o link da sua loja no iFood para visualizar seu cardápio completo aqui.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://www.ifood.com.br/delivery/..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleSaveUrl()}
                  />
                  <Button
                    onClick={handleSaveUrl}
                    disabled={isSaving || !urlInput.trim()}
                    className="bg-[#EA1D2C] hover:bg-[#c9151f] text-white"
                  >
                    {isSaving ? "Salvando..." : "Conectar"}
                  </Button>
                </div>

                {showUrlInput && (
                  <div className="flex justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setShowUrlInput(false)}>
                      Cancelar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { clearUrl(); setShowUrlInput(false); }}
                      className="text-destructive gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remover link
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Dashboard */}
        {hasUrl && !showUrlInput && (
          <MenuPerformanceDashboard
            analysis={analysis}
            isLoading={isAnalyzing}
            onAnalyze={analyzeMenu}
            hasMenu={!!menuData && menuData.items.length > 0}
            analysisUsage={analysisUsage}
          />
        )}

        {/* Menu View */}
        {hasUrl && !showUrlInput && (
          <IfoodMenuView
            storeName={menuData?.storeName || "Carregando..."}
            items={menuData?.items || []}
            isLoading={isLoading}
          />
        )}
      </div>
    </AppLayout>
  );
}
