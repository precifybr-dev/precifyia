import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { useToast } from "@/hooks/use-toast";

export interface CMVPeriodo {
  id: string;
  user_id: string;
  store_id: string | null;
  mes: number;
  ano: number;
  modo: "simplificado" | "completo" | "avancado";
  estoque_inicial: number;
  compras: number;
  estoque_final: number;
  ajustes: number;
  cmv_calculado: number;
  cmv_percentual: number;
  faturamento_liquido: number;
  meta_definida: number | null;
  meta_automatica: number | null;
  onboarding_concluido: boolean;
  created_at: string;
  updated_at: string;
}

export interface CMVCategoria {
  id: string;
  periodo_id: string;
  categoria: string;
  estoque_inicial: number;
  compras: number;
  estoque_final: number;
  ajustes: number;
  cmv_categoria: number;
  cmv_percentual_categoria: number;
}

const CATEGORIAS_PADRAO = [
  "Proteínas",
  "Bebidas",
  "Secos",
  "Hortifruti",
  "Embalagens",
  "Outros",
];

export function useCMV() {
  const [periodos, setPeriodos] = useState<CMVPeriodo[]>([]);
  const [periodoAtual, setPeriodoAtual] = useState<CMVPeriodo | null>(null);
  const [categorias, setCategorias] = useState<CMVCategoria[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { activeStore } = useStore();
  const { toast } = useToast();

  const now = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(now.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(now.getFullYear());

  const calcularCMV = (ei: number, compras: number, ef: number, ajustes: number) => {
    return ei + compras - ef - ajustes;
  };

  const calcularCMVPercentual = (cmv: number, faturamento: number) => {
    if (!faturamento || faturamento === 0) return 0;
    return (cmv / faturamento) * 100;
  };

  const getStatusCMV = (percentual: number): { label: string; color: "success" | "warning" | "destructive"; emoji: string } => {
    if (percentual <= 32) return { label: "Ideal", color: "success", emoji: "🟢" };
    if (percentual <= 38) return { label: "Atenção", color: "warning", emoji: "🟡" };
    return { label: "Crítico", color: "destructive", emoji: "🔴" };
  };

  const fetchPeriodos = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      let query = supabase
        .from("cmv_periodos")
        .select("*")
        .eq("user_id", session.user.id)
        .order("ano", { ascending: false })
        .order("mes", { ascending: false });

      if (activeStore?.id) {
        query = query.eq("store_id", activeStore.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPeriodos((data || []) as unknown as CMVPeriodo[]);
    } catch (err) {
      console.error("Erro ao buscar períodos CMV:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore?.id]);

  const fetchPeriodoAtual = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      let query = supabase
        .from("cmv_periodos")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("mes", mesSelecionado)
        .eq("ano", anoSelecionado);

      if (activeStore?.id) {
        query = query.eq("store_id", activeStore.id);
      } else {
        query = query.is("store_id", null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      setPeriodoAtual(data as unknown as CMVPeriodo | null);

      if (data) {
        await fetchCategorias(data.id);
      } else {
        setCategorias([]);
      }
    } catch (err) {
      console.error("Erro ao buscar período atual:", err);
    }
  }, [mesSelecionado, anoSelecionado, activeStore?.id]);

  const fetchCategorias = async (periodoId: string) => {
    const { data, error } = await supabase
      .from("cmv_categorias")
      .select("*")
      .eq("periodo_id", periodoId);

    if (!error && data) {
      setCategorias(data as unknown as CMVCategoria[]);
    }
  };

  const salvarPeriodo = async (dados: {
    modo: "simplificado" | "completo" | "avancado";
    estoque_inicial: number;
    compras: number;
    estoque_final: number;
    ajustes: number;
    faturamento_liquido: number;
    meta_definida?: number | null;
    categoriasData?: Omit<CMVCategoria, "id" | "periodo_id" | "cmv_categoria" | "cmv_percentual_categoria">[];
  }) => {
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Sessão expirada");

      let cmv: number;
      let cmvPercent: number;

      if (dados.modo === "simplificado") {
        cmv = dados.compras;
        cmvPercent = calcularCMVPercentual(dados.compras, dados.faturamento_liquido);
      } else {
        cmv = calcularCMV(dados.estoque_inicial, dados.compras, dados.estoque_final, dados.ajustes);
        cmvPercent = calcularCMVPercentual(cmv, dados.faturamento_liquido);
      }

      const periodoData = {
        user_id: session.user.id,
        store_id: activeStore?.id || null,
        mes: mesSelecionado,
        ano: anoSelecionado,
        modo: dados.modo,
        estoque_inicial: dados.estoque_inicial,
        compras: dados.compras,
        estoque_final: dados.estoque_final,
        ajustes: dados.ajustes,
        cmv_calculado: cmv,
        cmv_percentual: cmvPercent,
        faturamento_liquido: dados.faturamento_liquido,
        meta_definida: dados.meta_definida ?? null,
        onboarding_concluido: true,
      };

      let periodoId: string;

      if (periodoAtual) {
        const { error } = await supabase
          .from("cmv_periodos")
          .update(periodoData)
          .eq("id", periodoAtual.id);
        if (error) throw error;
        periodoId = periodoAtual.id;
      } else {
        const { data, error } = await supabase
          .from("cmv_periodos")
          .insert(periodoData)
          .select("id")
          .single();
        if (error) throw error;
        periodoId = data.id;
      }

      // Salvar categorias se modo avançado
      if (dados.modo === "avancado" && dados.categoriasData) {
        // Deletar categorias anteriores
        await supabase.from("cmv_categorias").delete().eq("periodo_id", periodoId);

        const categoriasInsert = dados.categoriasData.map((cat) => {
          const cmvCat = calcularCMV(cat.estoque_inicial, cat.compras, cat.estoque_final, cat.ajustes);
          return {
            periodo_id: periodoId,
            categoria: cat.categoria,
            estoque_inicial: cat.estoque_inicial,
            compras: cat.compras,
            estoque_final: cat.estoque_final,
            ajustes: cat.ajustes,
            cmv_categoria: cmvCat,
            cmv_percentual_categoria: calcularCMVPercentual(cmvCat, dados.faturamento_liquido),
          };
        });

        const { error: catError } = await supabase.from("cmv_categorias").insert(categoriasInsert);
        if (catError) throw catError;
      }

      toast({ title: "Salvo!", description: "CMV do período salvo com sucesso." });
      await fetchPeriodoAtual();
      await fetchPeriodos();
    } catch (err: any) {
      console.error("Erro ao salvar CMV:", err);
      toast({ title: "Erro", description: err.message || "Não foi possível salvar.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Calcular meta automática baseada nos últimos 3 meses
  const calcularMetaAutomatica = useCallback((): { meta: number | null; melhorMes: number | null; media: number | null } => {
    if (periodos.length < 3) return { meta: null, melhorMes: null, media: null };

    const ultimos3 = periodos
      .filter((p) => p.cmv_percentual > 0)
      .slice(0, 3);

    if (ultimos3.length < 3) return { meta: null, melhorMes: null, media: null };

    const percentuais = ultimos3.map((p) => Number(p.cmv_percentual));
    const media = percentuais.reduce((a, b) => a + b, 0) / percentuais.length;
    const melhorMes = Math.min(...percentuais);
    const meta = melhorMes + 1.5;

    return { meta: Math.round(meta * 100) / 100, melhorMes, media: Math.round(media * 100) / 100 };
  }, [periodos]);

  useEffect(() => {
    fetchPeriodos();
  }, [fetchPeriodos]);

  useEffect(() => {
    fetchPeriodoAtual();
  }, [fetchPeriodoAtual]);

  return {
    periodos,
    periodoAtual,
    categorias,
    isLoading,
    isSaving,
    mesSelecionado,
    anoSelecionado,
    setMesSelecionado,
    setAnoSelecionado,
    salvarPeriodo,
    calcularCMV,
    calcularCMVPercentual,
    getStatusCMV,
    calcularMetaAutomatica,
    fetchPeriodos,
    fetchPeriodoAtual,
    CATEGORIAS_PADRAO,
  };
}
