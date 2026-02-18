import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";

interface SharingGroup {
  id: string;
  user_id: string;
  name: string;
  division_type: string;
  created_at: string;
}

interface GroupStore {
  id: string;
  sharing_group_id: string;
  store_id: string;
  percentage: number | null;
  created_at: string;
  store_name?: string;
}

interface SharedExpense {
  id: string;
  name: string;
  monthly_value: number;
  sharing_group_id: string;
}

interface CostAllocation {
  id: string;
  expense_id: string;
  store_id: string;
  reference_month: string;
  allocated_amount: number;
  division_type: string;
  total_stores: number;
  expense_name?: string;
  expense_total?: number;
}

export function useSharingGroup() {
  const { activeStore, stores } = useStore();
  const { toast } = useToast();
  const [group, setGroup] = useState<SharingGroup | null>(null);
  const [groupStores, setGroupStores] = useState<GroupStore[]>([]);
  const [sharedExpenses, setSharedExpenses] = useState<SharedExpense[]>([]);
  const [allocations, setAllocations] = useState<CostAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sharedTotal, setSharedTotal] = useState(0);

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const fetchGroupData = useCallback(async () => {
    if (!activeStore?.sharing_group_id) {
      setGroup(null);
      setGroupStores([]);
      setSharedExpenses([]);
      setAllocations([]);
      setSharedTotal(0);
      return;
    }

    setIsLoading(true);

    // Fetch group
    const { data: groupData } = await supabase
      .from("sharing_groups")
      .select("*")
      .eq("id", activeStore.sharing_group_id)
      .single();

    if (groupData) {
      setGroup(groupData as SharingGroup);
    }

    // Fetch group stores
    const { data: groupStoresData } = await supabase
      .from("sharing_group_stores")
      .select("*")
      .eq("sharing_group_id", activeStore.sharing_group_id);

    if (groupStoresData) {
      const enriched = (groupStoresData as GroupStore[]).map((gs) => {
        const store = stores.find((s) => s.id === gs.store_id);
        return { ...gs, store_name: store?.name || "Loja" };
      });
      setGroupStores(enriched);
    }

    // Fetch shared expenses
    const { data: expensesData } = await supabase
      .from("fixed_expenses")
      .select("id, name, monthly_value, sharing_group_id")
      .eq("sharing_group_id", activeStore.sharing_group_id)
      .eq("cost_type", "shared");

    if (expensesData) {
      setSharedExpenses(expensesData as SharedExpense[]);
    }

    // Fetch allocations for current month
    const { data: allocData } = await supabase
      .from("cost_allocations")
      .select("*")
      .eq("store_id", activeStore.id)
      .eq("reference_month", currentMonth);

    if (allocData) {
      const enrichedAlloc = (allocData as CostAllocation[]).map((a) => {
        const exp = expensesData?.find((e) => e.id === a.expense_id);
        return {
          ...a,
          expense_name: exp?.name || "",
          expense_total: exp?.monthly_value || 0,
        };
      });
      setAllocations(enrichedAlloc);
      setSharedTotal(enrichedAlloc.reduce((sum, a) => sum + Number(a.allocated_amount), 0));
    }

    setIsLoading(false);
  }, [activeStore?.id, activeStore?.sharing_group_id, stores, currentMonth]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const createGroupAndLink = useCallback(
    async (baseStoreId: string, newStoreId: string, groupName: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const baseStore = stores.find((s) => s.id === baseStoreId);

      // Check if base store already has a group
      if (baseStore?.sharing_group_id) {
        // Add new store to existing group
        const groupId = baseStore.sharing_group_id;

        await supabase
          .from("sharing_group_stores")
          .insert({ sharing_group_id: groupId, store_id: newStoreId });

        await supabase
          .from("stores")
          .update({ sharing_group_id: groupId })
          .eq("id", newStoreId);

        return groupId;
      }

      // Create new group
      const { data: newGroup, error: groupError } = await supabase
        .from("sharing_groups")
        .insert({
          user_id: session.user.id,
          name: groupName,
        })
        .select()
        .single();

      if (groupError || !newGroup) {
        toast({ title: "Erro", description: "Não foi possível criar o grupo", variant: "destructive" });
        return null;
      }

      const groupId = newGroup.id;

      // Link both stores
      await supabase.from("sharing_group_stores").insert([
        { sharing_group_id: groupId, store_id: baseStoreId },
        { sharing_group_id: groupId, store_id: newStoreId },
      ]);

      // Update stores with group reference
      await supabase.from("stores").update({ sharing_group_id: groupId }).eq("id", baseStoreId);
      await supabase.from("stores").update({ sharing_group_id: groupId }).eq("id", newStoreId);

      return groupId;
    },
    [stores, toast]
  );

  const addSharedExpense = useCallback(
    async (name: string, monthlyValue: number) => {
      if (!group) return false;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const { error } = await supabase.from("fixed_expenses").insert({
        user_id: session.user.id,
        name,
        monthly_value: monthlyValue,
        cost_type: "shared",
        sharing_group_id: group.id,
        store_id: null,
      });

      if (error) {
        toast({ title: "Erro", description: "Não foi possível adicionar a despesa compartilhada", variant: "destructive" });
        return false;
      }

      toast({ title: "Sucesso!", description: "Despesa compartilhada adicionada" });
      await fetchGroupData();
      return true;
    },
    [group, toast, fetchGroupData]
  );

  const updateSharedExpense = useCallback(
    async (expenseId: string, name: string, monthlyValue: number) => {
      const { error } = await supabase
        .from("fixed_expenses")
        .update({ name, monthly_value: monthlyValue })
        .eq("id", expenseId);

      if (error) {
        toast({ title: "Erro", description: "Não foi possível atualizar", variant: "destructive" });
        return false;
      }

      toast({ title: "Sucesso!", description: "Despesa atualizada" });
      await fetchGroupData();
      return true;
    },
    [toast, fetchGroupData]
  );

  const deleteSharedExpense = useCallback(
    async (expenseId: string) => {
      const { error } = await supabase
        .from("fixed_expenses")
        .delete()
        .eq("id", expenseId);

      if (error) {
        toast({ title: "Erro", description: "Não foi possível remover", variant: "destructive" });
        return false;
      }

      toast({ title: "Sucesso!", description: "Despesa removida" });
      await fetchGroupData();
      return true;
    },
    [toast, fetchGroupData]
  );

  const removeStoreFromGroup = useCallback(
    async (storeId: string) => {
      if (!group) return false;

      const { error } = await supabase
        .from("sharing_group_stores")
        .delete()
        .eq("sharing_group_id", group.id)
        .eq("store_id", storeId);

      if (error) {
        toast({ title: "Erro", description: "Não foi possível remover a loja do grupo", variant: "destructive" });
        return false;
      }

      await supabase
        .from("stores")
        .update({ sharing_group_id: null })
        .eq("id", storeId);

      toast({ title: "Sucesso!", description: "Loja removida do grupo. Custos recalculados." });
      await fetchGroupData();
      return true;
    },
    [group, toast, fetchGroupData]
  );

  return {
    group,
    groupStores,
    sharedExpenses,
    allocations,
    sharedTotal,
    isLoading,
    hasGroup: !!group,
    storeCount: groupStores.length,
    createGroupAndLink,
    addSharedExpense,
    updateSharedExpense,
    deleteSharedExpense,
    removeStoreFromGroup,
    refreshGroup: fetchGroupData,
  };
}
