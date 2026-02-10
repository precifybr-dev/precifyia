import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BackupPreview {
  valid: boolean;
  schema_version: string;
  exported_at: string;
  store_name: string | null;
  counts: Record<string, number>;
}

export function useBackupRestore() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [importFile, setImportFile] = useState<any>(null);
  const { toast } = useToast();

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Sessão não encontrada. Faça login novamente.");
    return {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
  };

  const exportBackup = async (storeId?: string) => {
    setIsExporting(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams({ action: "export" });
      if (storeId) params.set("store_id", storeId);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-restore?${params}`,
        { method: "GET", headers }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao exportar backup.");
      }

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const date = new Date().toISOString().split("T")[0];
      const storeName = data.store_name ? `-${data.store_name.replace(/\s+/g, "_")}` : "";
      a.download = `precify-backup${storeName}-${date}.precify-backup`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "Backup realizado!", description: `Arquivo exportado em ${new Date().toLocaleString("pt-BR")}` });
    } catch (err: any) {
      toast({ title: "Erro no backup", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const previewImport = async (file: File) => {
    setIsPreviewing(true);
    setPreview(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      setImportFile(parsed);

      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-restore?action=import&preview=true`,
        { method: "POST", headers, body: JSON.stringify(parsed) }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao validar arquivo.");

      setPreview(result);
    } catch (err: any) {
      toast({ title: "Arquivo inválido", description: err.message, variant: "destructive" });
      setImportFile(null);
    } finally {
      setIsPreviewing(false);
    }
  };

  const executeImport = async (mode: "replace" | "merge") => {
    if (!importFile) return;
    setIsImporting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/backup-restore?action=import&preview=false&mode=${mode}`,
        { method: "POST", headers, body: JSON.stringify(importFile) }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro ao importar dados.");

      toast({
        title: "Importação concluída!",
        description: mode === "replace"
          ? "Todos os dados foram substituídos com sucesso."
          : "Novos dados foram adicionados sem sobrescrever os existentes.",
      });

      setPreview(null);
      setImportFile(null);
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setImportFile(null);
  };

  return {
    isExporting,
    isImporting,
    isPreviewing,
    preview,
    importFile,
    exportBackup,
    previewImport,
    executeImport,
    clearPreview,
  };
}
