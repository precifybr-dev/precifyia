import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ProtectedTable =
  | "ingredients"
  | "recipes"
  | "sub_recipes"
  | "beverages"
  | "fixed_costs"
  | "variable_costs"
  | "fixed_expenses"
  | "variable_expenses";

interface SoftDeleteOptions {
  table: ProtectedTable;
  id: string;
  data: Record<string, any>;
  storeId?: string | null;
  confirmationSteps?: number;
}

interface RestoreOptions {
  deletedRecordId: string;
}

interface DeletedRecord {
  id: string;
  original_table: string;
  original_id: string;
  data: Record<string, any>;
  deleted_at: string;
  expires_at: string;
  is_restored: boolean;
  store_id: string | null;
}

interface AuditLogEntry {
  action: string;
  table_name: string;
  record_id: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  confirmation_steps?: number;
}

export function useDataProtection() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  /**
   * Log an action to the audit log
   */
  const logAction = useCallback(
    async (entry: AuditLogEntry) => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return;

        await supabase.from("data_audit_log").insert({
          user_id: session.user.id,
          action: entry.action,
          table_name: entry.table_name,
          record_id: entry.record_id,
          old_data: entry.old_data || null,
          new_data: entry.new_data || null,
          user_agent: navigator.userAgent,
          confirmation_steps: entry.confirmation_steps || 1,
        });
      } catch (error) {
        console.error("Failed to log action:", error);
      }
    },
    []
  );

  /**
   * Soft delete - move data to recycle bin instead of permanent deletion
   */
  const softDelete = useCallback(
    async ({
      table,
      id,
      data,
      storeId,
      confirmationSteps = 1,
    }: SoftDeleteOptions): Promise<boolean> => {
      setIsProcessing(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          toast({
            title: "Erro de autenticação",
            description: "Você precisa estar logado para realizar esta ação.",
            variant: "destructive",
          });
          return false;
        }

        // 1. Insert into deleted_records (recycle bin)
        const { error: insertError } = await supabase
          .from("deleted_records")
          .insert({
            original_table: table,
            original_id: id,
            user_id: session.user.id,
            store_id: storeId || null,
            data: data,
            deleted_by: session.user.id,
          });

        if (insertError) {
          console.error("Error inserting to recycle bin:", insertError);
          toast({
            title: "Erro ao mover para lixeira",
            description: "Não foi possível mover o item para a lixeira.",
            variant: "destructive",
          });
          return false;
        }

        // 2. Delete from original table
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq("id", id);

        if (deleteError) {
          console.error("Error deleting from original table:", deleteError);
          // Rollback: remove from recycle bin
          await supabase
            .from("deleted_records")
            .delete()
            .eq("original_id", id)
            .eq("original_table", table);

          toast({
            title: "Erro ao excluir",
            description: "Não foi possível excluir o item.",
            variant: "destructive",
          });
          return false;
        }

        // 3. Log the action
        await logAction({
          action: "soft_delete",
          table_name: table,
          record_id: id,
          old_data: data,
          confirmation_steps: confirmationSteps,
        });

        toast({
          title: "Item movido para lixeira",
          description: "O item foi movido para a lixeira e pode ser recuperado em até 30 dias.",
        });

        return true;
      } catch (error) {
        console.error("Soft delete error:", error);
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro ao processar a exclusão.",
          variant: "destructive",
        });
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [toast, logAction]
  );

  /**
   * Restore an item from the recycle bin
   */
  const restore = useCallback(
    async ({ deletedRecordId }: RestoreOptions): Promise<boolean> => {
      setIsProcessing(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) {
          toast({
            title: "Erro de autenticação",
            description: "Você precisa estar logado para realizar esta ação.",
            variant: "destructive",
          });
          return false;
        }

        // 1. Get the deleted record
        const { data: deletedRecord, error: fetchError } = await supabase
          .from("deleted_records")
          .select("*")
          .eq("id", deletedRecordId)
          .single();

        if (fetchError || !deletedRecord) {
          toast({
            title: "Item não encontrado",
            description: "O item não foi encontrado na lixeira.",
            variant: "destructive",
          });
          return false;
        }

        const record = deletedRecord as DeletedRecord;

        // 2. Re-insert into original table
        // Strip auto-generated fields that may cause unique constraint conflicts
        const dataToRestore = { ...(record.data as Record<string, unknown>) };
        
        // Remove 'code' field for tables that auto-generate it (sequence-based)
        const tablesWithAutoCode = ["ingredients", "beverages", "sub_recipes"];
        if (tablesWithAutoCode.includes(record.original_table)) {
          delete dataToRestore.code;
        }
        
        // Update timestamps
        dataToRestore.updated_at = new Date().toISOString();

        const { error: insertError } = await supabase
          .from(record.original_table as ProtectedTable)
          .insert(dataToRestore as any);

        if (insertError) {
          console.error("Error restoring to original table:", insertError);
          
          // Provide more specific error messages
          let errorDescription = "Não foi possível restaurar o item.";
          if (insertError.message?.includes("unique") || insertError.message?.includes("duplicate")) {
            errorDescription = "Já existe um item com os mesmos dados. Verifique se o item não foi recriado.";
          } else if (insertError.message?.includes("foreign key") || insertError.message?.includes("violates")) {
            errorDescription = "Dados vinculados (loja ou sub-receita) não existem mais. Recrie os itens dependentes primeiro.";
          } else {
            errorDescription = `Erro: ${insertError.message || "conflito de dados desconhecido."}`;
          }
          
          toast({
            title: "Erro ao restaurar",
            description: errorDescription,
            variant: "destructive",
          });
          return false;
        }

        // 3. Mark as restored in recycle bin
        const { error: updateError } = await supabase
          .from("deleted_records")
          .update({
            is_restored: true,
            restored_at: new Date().toISOString(),
          })
          .eq("id", deletedRecordId);

        if (updateError) {
          console.error("Error marking as restored:", updateError);
        }

        // 4. Log the restoration
        await logAction({
          action: "restore",
          table_name: record.original_table,
          record_id: record.original_id,
          new_data: record.data,
        });

        toast({
          title: "Item restaurado",
          description: "O item foi restaurado com sucesso.",
        });

        return true;
      } catch (error) {
        console.error("Restore error:", error);
        toast({
          title: "Erro inesperado",
          description: "Ocorreu um erro ao restaurar o item.",
          variant: "destructive",
        });
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [toast, logAction]
  );

  /**
   * Get deleted items from the recycle bin
   */
  const getDeletedItems = useCallback(
    async (table?: ProtectedTable): Promise<DeletedRecord[]> => {
      try {
        let query = supabase
          .from("deleted_records")
          .select("*")
          .eq("is_restored", false)
          .order("deleted_at", { ascending: false });

        if (table) {
          query = query.eq("original_table", table);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching deleted items:", error);
          return [];
        }

        return (data || []) as DeletedRecord[];
      } catch (error) {
        console.error("Error fetching deleted items:", error);
        return [];
      }
    },
    []
  );

  /**
   * Permanently delete an item from the recycle bin (MASTER only)
   */
  const permanentDelete = useCallback(
    async (deletedRecordId: string): Promise<boolean> => {
      setIsProcessing(true);
      try {
        const { error } = await supabase
          .from("deleted_records")
          .delete()
          .eq("id", deletedRecordId);

        if (error) {
          console.error("Error permanently deleting:", error);
          toast({
            title: "Erro ao excluir permanentemente",
            description: "Apenas usuários MASTER podem excluir permanentemente.",
            variant: "destructive",
          });
          return false;
        }

        toast({
          title: "Excluído permanentemente",
          description: "O item foi excluído permanentemente e não pode ser recuperado.",
        });

        return true;
      } catch (error) {
        console.error("Permanent delete error:", error);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [toast]
  );

  /**
   * Get the count of items in the recycle bin
   */
  const getRecycleBinCount = useCallback(async (): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from("deleted_records")
        .select("*", { count: "exact", head: true })
        .eq("is_restored", false);

      if (error) {
        console.error("Error counting recycle bin:", error);
        return 0;
      }

      return count || 0;
    } catch {
      return 0;
    }
  }, []);

  /**
   * Check how many items depend on a given record
   */
  const checkDependencies = useCallback(
    async (table: string, id: string): Promise<{ total: number; details: string[] }> => {
      const details: string[] = [];
      let total = 0;

      try {
        if (table === "ingredients") {
          const { count: recipeCount } = await supabase
            .from("recipe_ingredients")
            .select("*", { count: "exact", head: true })
            .eq("ingredient_id", id);
          if (recipeCount && recipeCount > 0) {
            details.push(`${recipeCount} ficha(s) técnica(s)`);
            total += recipeCount;
          }

          const { count: subRecipeCount } = await supabase
            .from("sub_recipe_ingredients")
            .select("*", { count: "exact", head: true })
            .eq("ingredient_id", id);
          if (subRecipeCount && subRecipeCount > 0) {
            details.push(`${subRecipeCount} sub-receita(s)`);
            total += subRecipeCount;
          }
        }

        if (table === "sub_recipes") {
          const { count: ingredientCount } = await supabase
            .from("ingredients")
            .select("*", { count: "exact", head: true })
            .eq("sub_recipe_id", id);
          if (ingredientCount && ingredientCount > 0) {
            details.push(`${ingredientCount} insumo(s) vinculado(s)`);
            total += ingredientCount;
          }
        }

        if (table === "recipes" || table === "beverages") {
          const { count: comboCount } = await supabase
            .from("combo_items")
            .select("*", { count: "exact", head: true })
            .eq("item_id", id);
          if (comboCount && comboCount > 0) {
            details.push(`${comboCount} combo(s)`);
            total += comboCount;
          }
        }
      } catch (error) {
        console.error("Error checking dependencies:", error);
      }

      return { total, details };
    },
    []
  );

  return {
    softDelete,
    restore,
    getDeletedItems,
    permanentDelete,
    getRecycleBinCount,
    checkDependencies,
    logAction,
    isProcessing,
  };
}
