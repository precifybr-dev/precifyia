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

export interface ScoreSnapshot {
  id: string;
  overall_score: number;
  security_score: number;
  backend_score: number;
  continuity_score: number;
  help_score: number;
  ux_score: number;
  governance_score: number;
  risk_level: string;
  critical_failures: string[];
  created_at: string;
}

export interface Certification {
  id: string;
  certified_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
  overall_score: number;
  security_score: number;
  risk_level: string;
  is_valid: boolean;
  created_by: string | null;
}

export type RiskLevel = "baixo" | "medio" | "alto";

export interface MaturityScores {
  overall: number;
  security: number;
  backend: number;
  continuity: number;
  help: number;
  ux: number;
  governance: number;
}

export interface RiskReport {
  level: RiskLevel;
  failures: { area: string; description: string; impact: string }[];
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

// ─── Phase weights for maturity score ───
const PHASE_WEIGHTS: Record<number, { key: keyof MaturityScores; weight: number }> = {
  1: { key: "security", weight: 0.30 },
  2: { key: "backend", weight: 0.20 },
  3: { key: "continuity", weight: 0.20 },
  4: { key: "help", weight: 0.10 },
  5: { key: "ux", weight: 0.10 },
  6: { key: "governance", weight: 0.10 },
};

export function useArchitectureGovernance() {
  const { toast } = useToast();
  const [prompts, setPrompts] = useState<ArchitecturePrompt[]>([]);
  const [history, setHistory] = useState<ArchitectureHistory[]>([]);
  const [baseChecks, setBaseChecks] = useState<ArchitectureBaseCheck[]>([]);
  const [scoreHistory, setScoreHistory] = useState<ScoreSnapshot[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [promptsRes, historyRes, checksRes, scoresRes, certsRes] = await Promise.all([
        supabase.from("architecture_prompts").select("*").order("created_at", { ascending: false }),
        supabase.from("architecture_history").select("*").order("created_at", { ascending: false }).limit(100),
        supabase.from("architecture_base_checks").select("*").order("sort_order"),
        supabase.from("architecture_score_history").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("architecture_certifications").select("*").order("certified_at", { ascending: false }),
      ]);

      if (promptsRes.data) setPrompts(promptsRes.data as any);
      if (historyRes.data) setHistory(historyRes.data as any);
      if (checksRes.data) setBaseChecks(checksRes.data as any);
      if (scoresRes.data) setScoreHistory(scoresRes.data as any);
      if (certsRes.data) setCertifications(certsRes.data as any);
    } catch (err) {
      console.error("Error fetching governance data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── Maturity Score Calculation ───
  const calculateMaturityScores = useCallback((): MaturityScores => {
    const phases = [1, 2, 3, 4, 5, 6];
    const scores: MaturityScores = { overall: 0, security: 0, backend: 0, continuity: 0, help: 0, ux: 0, governance: 0 };

    for (const phase of phases) {
      const checks = baseChecks.filter(c => c.phase === phase);
      if (checks.length === 0) continue;
      const completed = checks.filter(c => c.is_completed).length;
      const pct = Math.round((completed / checks.length) * 100);
      const mapping = PHASE_WEIGHTS[phase];
      if (mapping) {
        scores[mapping.key] = pct;
      }
    }

    // Overall = weighted average
    scores.overall = Math.round(
      scores.security * 0.30 +
      scores.backend * 0.20 +
      scores.continuity * 0.20 +
      scores.help * 0.10 +
      scores.ux * 0.10 +
      scores.governance * 0.10
    );

    return scores;
  }, [baseChecks]);

  // ─── Risk Assessment ───
  const calculateRisk = useCallback((): RiskReport => {
    const scores = calculateMaturityScores();
    const failures: { area: string; description: string; impact: string }[] = [];

    // Check critical failures
    const securityChecks = baseChecks.filter(c => c.phase === 1);
    const backupChecks = baseChecks.filter(c => c.phase === 3);

    const rlsCheck = securityChecks.find(c => c.check_name.toLowerCase().includes("rls"));
    if (rlsCheck && !rlsCheck.is_completed) {
      failures.push({ area: "Segurança", description: "RLS não aplicado", impact: "Acesso irrestrito ao banco de dados" });
    }

    const rateLimitCheck = securityChecks.find(c => c.check_name.toLowerCase().includes("rate limit"));
    if (rateLimitCheck && !rateLimitCheck.is_completed) {
      failures.push({ area: "Segurança", description: "Rate limit ausente", impact: "Vulnerável a ataques de força bruta" });
    }

    const roleCheck = securityChecks.find(c => c.check_name.toLowerCase().includes("role") || c.check_name.toLowerCase().includes("acesso"));
    if (roleCheck && !roleCheck.is_completed) {
      failures.push({ area: "Segurança", description: "Controle de acesso por role ausente", impact: "Escalação de privilégios possível" });
    }

    const blindageCheck = securityChecks.find(c => c.check_name.toLowerCase().includes("blindagem"));
    if (blindageCheck && !blindageCheck.is_completed) {
      failures.push({ area: "Segurança", description: "Acesso direto do frontend a dados sensíveis", impact: "Exposição de dados administrativos" });
    }

    const logsCheck = securityChecks.find(c => c.check_name.toLowerCase().includes("log"));
    if (logsCheck && !logsCheck.is_completed) {
      failures.push({ area: "Segurança", description: "Logs de ações críticas inativos", impact: "Impossível rastrear violações" });
    }

    const backupIncomplete = backupChecks.some(c => !c.is_completed);
    if (backupIncomplete) {
      failures.push({ area: "Continuidade", description: "Backup não implementado completamente", impact: "Perda de dados em caso de falha" });
    }

    // High criticality prompts not implemented
    const criticalMissing = prompts.filter(p => p.criticality === "alto" && p.status !== "implementado");
    for (const p of criticalMissing) {
      failures.push({ area: CATEGORY_LABELS[p.category] || p.category, description: `Prompt crítico não implementado: ${p.name}`, impact: "Risco estrutural" });
    }

    // Determine level
    let level: RiskLevel = "baixo";
    if (scores.security < 90 || backupIncomplete || failures.length > 0) {
      level = "medio";
    }
    if (scores.security < 70 || (rlsCheck && !rlsCheck.is_completed) || (rateLimitCheck && !rateLimitCheck.is_completed) || criticalMissing.length > 0) {
      level = "alto";
    }
    if (scores.security >= 90 && !backupIncomplete && failures.length === 0) {
      level = "baixo";
    }

    return { level, failures };
  }, [baseChecks, prompts, calculateMaturityScores]);

  // ─── Certification ───
  const checkCertificationEligibility = useCallback(() => {
    const scores = calculateMaturityScores();
    const risk = calculateRisk();

    return {
      eligible: scores.overall >= 85 && scores.security >= 90 && risk.level !== "alto" && risk.failures.length === 0,
      reasons: [
        ...(scores.overall < 85 ? [`Score geral ${scores.overall} < 85`] : []),
        ...(scores.security < 90 ? [`Score segurança ${scores.security} < 90`] : []),
        ...(risk.level === "alto" ? ["Risco estrutural alto detectado"] : []),
        ...(risk.failures.length > 0 ? [`${risk.failures.length} falha(s) crítica(s) aberta(s)`] : []),
      ],
      scores,
      risk,
    };
  }, [calculateMaturityScores, calculateRisk]);

  const issueCertification = async () => {
    const eligibility = checkCertificationEligibility();
    if (!eligibility.eligible) {
      toast({ title: "Certificação negada", description: eligibility.reasons.join("; "), variant: "destructive" });
      return false;
    }

    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    // Revoke previous valid certifications
    await supabase.from("architecture_certifications").update({
      is_valid: false,
      revoked_at: new Date().toISOString(),
      revocation_reason: "Nova certificação emitida",
    } as any).eq("is_valid", true);

    const { error } = await supabase.from("architecture_certifications").insert({
      overall_score: eligibility.scores.overall,
      security_score: eligibility.scores.security,
      risk_level: eligibility.risk.level,
      is_valid: true,
      created_by: userId,
    } as any);

    if (error) {
      toast({ title: "Erro ao certificar", description: error.message, variant: "destructive" });
      return false;
    }

    // Log history
    await supabase.from("architecture_history").insert({
      action: "certificacao_emitida",
      description: `Selo "Arquitetura Aprovada" emitido com score ${eligibility.scores.overall}/100`,
      metadata: { scores: eligibility.scores },
      created_by: userId,
    } as any);

    toast({ title: "🏆 Certificação emitida!", description: `Score: ${eligibility.scores.overall}/100` });
    fetchAll();
    return true;
  };

  const revokeCertification = async (id: string, reason: string) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    await supabase.from("architecture_certifications").update({
      is_valid: false,
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
    } as any).eq("id", id);

    await supabase.from("architecture_history").insert({
      action: "certificacao_revogada",
      description: `Selo revogado: ${reason}`,
      created_by: userId,
    } as any);

    toast({ title: "Certificação revogada" });
    fetchAll();
  };

  // ─── Save Score Snapshot ───
  const saveScoreSnapshot = async () => {
    const scores = calculateMaturityScores();
    const risk = calculateRisk();
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    await supabase.from("architecture_score_history").insert({
      overall_score: scores.overall,
      security_score: scores.security,
      backend_score: scores.backend,
      continuity_score: scores.continuity,
      help_score: scores.help,
      ux_score: scores.ux,
      governance_score: scores.governance,
      risk_level: risk.level,
      critical_failures: risk.failures.map(f => f.description),
      created_by: userId,
    } as any);

    // Auto-revoke certification if conditions no longer met
    const activeCert = certifications.find(c => c.is_valid);
    if (activeCert && (scores.overall < 85 || scores.security < 90 || risk.level === "alto")) {
      await revokeCertification(activeCert.id, `Score caiu para ${scores.overall}/100 ou risco elevado para ${risk.level}`);
    }

    toast({ title: "Score registrado" });
    fetchAll();
  };

  // ─── Existing CRUD methods (unchanged) ───
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
              name, category,
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

    const existing = prompts.map(p => p.name.toLowerCase());
    const report = extracted.map(e => {
      const match = existing.find(ex => ex.includes(e.name!.toLowerCase().substring(0, 20)));
      if (match) return `✅ "${e.name}" → Já implementado`;
      return `⚠️ "${e.name}" → Não encontrado`;
    }).join("\n");

    return { extracted, report };
  };

  const getComplianceReport = () => {
    const phases = [1, 2, 3, 4, 5, 6];
    return phases.map(phase => {
      const checks = baseChecks.filter(c => c.phase === phase);
      const completed = checks.filter(c => c.is_completed).length;
      const total = checks.length;
      const isBlocking = checks.some(c => c.is_blocking);
      const allCompleted = completed === total && total > 0;
      return {
        phase,
        name: checks[0]?.phase_name || `Fase ${phase}`,
        completed, total,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        isBlocking, allCompleted,
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

  const activeCertification = certifications.find(c => c.is_valid) || null;

  return {
    prompts, history, baseChecks, scoreHistory, certifications, activeCertification,
    isLoading, stats,
    createPrompt, updatePrompt, deletePrompt, toggleBaseCheck,
    importFromText, getComplianceReport,
    calculateMaturityScores, calculateRisk, checkCertificationEligibility,
    issueCertification, revokeCertification, saveScoreSnapshot,
    refetch: fetchAll,
  };
}
