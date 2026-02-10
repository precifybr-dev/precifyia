import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FileSpreadsheet, Link2, X, ClipboardCopy, Sparkles, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface WelcomeImportPromptProps {
  userId: string;
  storeId: string | null;
  onOpenSpreadsheetImport: () => void;
}

const DISMISS_KEY = "precify_import_prompt_dismissed";

export default function WelcomeImportPrompt({ userId, storeId, onOpenSpreadsheetImport }: WelcomeImportPromptProps) {
  const [visible, setVisible] = useState(false);
  const [ingredientsCount, setIngredientsCount] = useState<number | null>(null);
  const [recipesCount, setRecipesCount] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY) === "true") return;

    const fetchCounts = async () => {
      const [ingRes, recRes] = await Promise.all([
        supabase.from("ingredients").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("recipes").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      const ic = ingRes.count ?? 0;
      const rc = recRes.count ?? 0;
      setIngredientsCount(ic);
      setRecipesCount(rc);
      if (ic === 0 || rc === 0) setVisible(true);
    };
    fetchCounts();
  }, [userId]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-card relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label="Fechar"
      >
        <X className="w-4 h-4" />
      </button>

      <h3 className="font-display font-semibold text-lg mb-1 text-foreground">
        🚀 Importe seus dados rapidamente
      </h3>
      <p className="text-sm text-muted-foreground mb-5">
        Traga seus insumos da planilha ou seus produtos do iFood em poucos cliques.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        {/* Importar Insumos */}
        {ingredientsCount === 0 && (
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground text-sm">Importar Insumos da Planilha</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Copie os dados da sua planilha (Excel, Google Sheets) e cole aqui. A IA mapeia as colunas automaticamente.
            </p>
            {/* Mini tutorial */}
            <div className="space-y-2">
              {[
                { step: 1, text: "Abra sua planilha (Excel, Google Sheets)" },
                { step: 2, text: "Selecione os dados e copie (Ctrl+C)" },
                { step: 3, icon: <Sparkles className="w-3 h-3" />, text: "Cole aqui e a IA mapeia automaticamente" },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.text}</span>
                </div>
              ))}
            </div>
            <Button size="sm" className="w-full gap-2" onClick={onOpenSpreadsheetImport}>
              <ClipboardCopy className="w-4 h-4" />
              Importar Planilha
            </Button>
          </div>
        )}

        {/* Importar do iFood */}
        {recipesCount === 0 && (
          <div className="border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground text-sm">Importar Fichas do iFood</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Puxe seus produtos direto do iFood colando o link do seu restaurante.
            </p>
            {/* Mini tutorial */}
            <div className="space-y-2">
              {[
                { step: 1, text: "Acesse seu restaurante no iFood pelo navegador" },
                { step: 2, text: "Copie o link da página do restaurante" },
                { step: 3, text: "Cole aqui e importamos seus produtos" },
              ].map((item) => (
                <div key={item.step} className="flex items-center gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.text}</span>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => navigate("/app/recipes?openIfood=true")}>
              <ExternalLink className="w-4 h-4" />
              Importar do iFood
            </Button>
          </div>
        )}
      </div>

      <button
        onClick={handleDismiss}
        className="mt-4 text-xs text-muted-foreground hover:text-foreground transition-colors underline"
      >
        Não mostrar novamente
      </button>
    </div>
  );
}
