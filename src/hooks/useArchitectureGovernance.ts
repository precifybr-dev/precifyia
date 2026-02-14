import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ArchitecturePrompt {
  id: string;
  name: string;
  category: string;
  description: string;
  prompt_text: string;
  implementation_date: string | null;
  status: string;
  criticality: string;
  related_files: string[];
  related_functions: string[];
  related_tables: string[];
  related_policies: string[];
  related_edge_functions: string[];
  impacts: string[];
  dependencies: string[];
  auto_scan_result: any;
  auto_scan_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArchitectureHistory {
  id: string;
  prompt_id: string | null;
  action: string;
  description: string;
  old_status: string | null;
  new_status: string | null;
  metadata: any;
  created_at: string;
}

export interface ArchitectureBaseCheck {
  id: string;
  phase: number;
  phase_name: string;
  check_name: string;
  check_description: string;
  is_blocking: boolean;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  seguranca: "Segurança",
  backend: "Backend",
  frontend: "Frontend",
  ux_educacao: "UX / Educação",
  backup_continuidade: "Backup & Continuidade",
  infraestrutura: "Infraestrutura",
  versionamento: "Versionamento",
  logs_auditoria: "Logs & Auditoria",
};

const STATUS_LABELS: Record<string, string> = {
  implementado: "Implementado",
  parcial: "Parcial",
  nao_implementado: "Não Implementado",
};

const CRITICALITY_LABELS: Record<string, string> = {
  alto: "Alto",
  medio: "Médio",
  baixo: "Baixo",
};

export { CATEGORY_LABELS, STATUS_LABELS, CRITICALITY_LABELS };

export function useArchitectureGovernance() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<ArchitecturePrompt[]>([]);
  const [history, setHistory] = useState<ArchitectureHistory[]>([]);
  const [baseChecks, setBaseChecks] = useState<ArchitectureBaseCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [promptsRes, historyRes, checksRes] = await Promise.all([
        supabase.from("architecture_prompts").select("*").order("created_at", { ascending: false }),
        supabase.from("architecture_history").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("architecture_base_checks").select("*").order("sort_order"),
      ]);

      if (promptsRes.data) setPrompts(promptsRes.data as any);
      if (historyRes.data) setHistory(historyRes.data as any);
      if (checksRes.data) setBaseChecks(checksRes.data as any);
    } catch (err) {
      console.error("Error fetching governance data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createPrompt = async (data: Partial<ArchitecturePrompt>) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    const { error } = await supabase.from("architecture_prompts").insert({
      name: data.name || "",
      category: data.category || "backend",
      description: data.description || "",
      prompt_text: data.prompt_text || "",
      implementation_date: data.implementation_date || null,
      status: data.status || "nao_implementado",
      criticality: data.criticality || "medio",
      related_files: data.related_files || [],
      related_functions: data.related_functions || [],
      related_tables: data.related_tables || [],
      related_policies: data.related_policies || [],
      related_edge_functions: data.related_edge_functions || [],
      impacts: data.impacts || [],
      dependencies: data.dependencies || [],
      created_by: userId,
    } as any);

    if (error) {
      toast({ title: "Erro ao criar prompt", description: error.message, variant: "destructive" });
      return false;
    }

    // Log history
    await supabase.from("architecture_history").insert({
      action: "prompt_criado",
      description: `Prompt "${data.name}" criado na categoria ${CATEGORY_LABELS[data.category || "backend"]}`,
      new_status: data.status,
      created_by: userId,
    } as any);

    toast({ title: "Prompt registrado com sucesso" });
    fetchAll();
    return true;
  };

  const updatePrompt = async (id: string, data: Partial<ArchitecturePrompt>) => {
    const oldPrompt = prompts.find(p => p.id === id);
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    const { error } = await supabase.from("architecture_prompts").update({
      ...data,
      updated_at: new Date().toISOString(),
    } as any).eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      return false;
    }

    if (oldPrompt && data.status && oldPrompt.status !== data.status) {
      await supabase.from("architecture_history").insert({
        prompt_id: id,
        action: "status_alterado",
        description: `Status de "${oldPrompt.name}" alterado de ${STATUS_LABELS[oldPrompt.status]} para ${STATUS_LABELS[data.status]}`,
        old_status: oldPrompt.status,
        new_status: data.status,
        created_by: userId,
      } as any);
    }

    toast({ title: "Prompt atualizado" });
    fetchAll();
    return true;
  };

  const deletePrompt = async (id: string) => {
    const prompt = prompts.find(p => p.id === id);
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    const { error } = await supabase.from("architecture_prompts").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }

    await supabase.from("architecture_history").insert({
      action: "prompt_excluido",
      description: `Prompt "${prompt?.name}" excluído`,
      created_by: userId,
    } as any);

    toast({ title: "Prompt excluído" });
    fetchAll();
  };

  const toggleBaseCheck = async (id: string, completed: boolean) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    await supabase.from("architecture_base_checks").update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      completed_by: completed ? userId : null,
    } as any).eq("id", id);

    fetchAll();
  };

  const importFromText = async (text: string): Promise<{ extracted: Partial<ArchitecturePrompt>[], report: string }> => {
    // Simple extraction: detect patterns like numbered items, bullet points, security rules
    const lines = text.split("\n").filter(l => l.trim());
    const extracted: Partial<ArchitecturePrompt>[] = [];
    
    const securityKeywords = ["rls", "policy", "security", "auth", "role", "permission", "rate limit", "mfa", "encrypt"];
    const backendKeywords = ["table", "function", "trigger", "migration", "rpc", "edge function", "schema"];
    const frontendKeywords = ["component", "hook", "ui", "page", "modal", "form", "button"];
    const backupKeywords = ["backup", "restore", "export", "import", "rollback"];

    let currentBlock = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^(#{1,3}|[0-9]+[\.\)]|\*|-)\s+/) || trimmed.length > 20) {
        if (currentBlock && currentBlock.length > 30) {
          const lower = currentBlock.toLowerCase();
          let category = "backend";
          if (securityKeywords.some(k => lower.includes(k))) category = "seguranca";
          else if (backupKeywords.some(k => lower.includes(k))) category = "backup_continuidade";
          else if (frontendKeywords.some(k => lower.includes(k))) category = "frontend";

          const name = currentBlock.substring(0, 80).replace(/^[#*\-0-9\.\)]+\s*/, "").trim();
          if (name.length > 5) {
            extracted.push({
              name,
              category,
              description: currentBlock.substring(0, 500),
              prompt_text: currentBlock,
              status: "nao_implementado",
              criticality: category === "seguranca" ? "alto" : "medio",
            });
          }
        }
        currentBlock = trimmed;
      } else {
        currentBlock += " " + trimmed;
      }
    }

    // Compare with existing
    const existing = prompts.map(p => p.name.toLowerCase());
    const report = extracted.map(e => {
      const match = existing.find(ex => ex.includes(e.name!.toLowerCase().substring(0, 20)));
      if (match) return `✅ "${e.name}" → Já implementado`;
      return `⚠️ "${e.name}" → Não encontrado`;
    }).join("\n");

    return { extracted, report };
  };

  // Compute architecture compliance
  const getComplianceReport = () => {
    const phases = [1, 2, 3, 4, 5];
    return phases.map(phase => {
      const checks = baseChecks.filter(c => c.phase === phase);
      const completed = checks.filter(c => c.is_completed).length;
      const total = checks.length;
      const isBlocking = checks.some(c => c.is_blocking);
      const allCompleted = completed === total;
      return {
        phase,
        name: checks[0]?.phase_name || `Fase ${phase}`,
        completed,
        total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        isBlocking,
        allCompleted,
      };
    });
  };

  const stats = {
    total: prompts.length,
    implemented: prompts.filter(p => p.status === "implementado").length,
    partial: prompts.filter(p => p.status === "parcial").length,
    notImplemented: prompts.filter(p => p.status === "nao_implementado").length,
    highCriticality: prompts.filter(p => p.criticality === "alto").length,
  };

  return {
    prompts,
    history,
    baseChecks,
    isLoading,
    stats,
    createPrompt,
    updatePrompt,
    deletePrompt,
    toggleBaseCheck,
    importFromText,
    getComplianceReport,
    refetch: fetchAll,
  };
}
