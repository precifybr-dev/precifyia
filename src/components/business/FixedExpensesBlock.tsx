import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Receipt, Percent, DollarSign, Share2, Users, Eye, AlertTriangle, Check } from "lucide-react";
import CategoryMismatchAlert from "@/components/business/CategoryMismatchAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";
import { useSharingGroup } from "@/hooks/useSharingGroup";
import { useDataProtection } from "@/hooks/useDataProtection";

interface FixedExpense {
  id: string;
  name: string;
  monthly_value: number;
  cost_type: string;
  sharing_group_id: string | null;
  store_id: string | null;
  shared_store_ids: string[] | null;
}

interface FixedExpensesBlockProps {
  userId: string;
  storeId?: string | null;
  monthlyRevenue: number | null;
  onTotalChange?: (total: number) => void;
  onSharedTotalChange?: (total: number) => void;
}

export default function FixedExpensesBlock({ userId, storeId, monthlyRevenue, onTotalChange, onSharedTotalChange }: FixedExpensesBlockProps) {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newExpense, setNewExpense] = useState({ name: "", value: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState({ name: "", value: "" });
  const [shareConfirmExpense, setShareConfirmExpense] = useState<FixedExpense | null>(null);
  const [unshareConfirmExpense, setUnshareConfirmExpense] = useState<FixedExpense | null>(null);
  const [detailExpense, setDetailExpense] = useState<FixedExpense | null>(null);
  const [deleteSharedConfirm, setDeleteSharedConfirm] = useState<FixedExpense | null>(null);
  const [isDeletingShared, setIsDeletingShared] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [selectedShareStores, setSelectedShareStores] = useState<string[]>([]);
  const { toast } = useToast();
  const { activeStore, stores } = useStore();
  const { group, groupStores, hasGroup, storeCount, refreshGroup } = useSharingGroup();
  const { softDelete } = useDataProtection();

  const fetchExpenses = useCallback(async () => {
    // Fetch exclusive expenses for current store
    let exclusiveQuery = supabase
      .from("fixed_expenses")
      .select("id, name, monthly_value, cost_type, sharing_group_id, store_id, shared_store_ids")
      .eq("user_id", userId)
      .eq("cost_type", "exclusive");
    if (storeId) exclusiveQuery = exclusiveQuery.eq("store_id", storeId);
    else exclusiveQuery = exclusiveQuery.is("store_id", null);

    const { data: exclusiveData, error: exclusiveError } = await exclusiveQuery.order("created_at", { ascending: true });

    // Fetch shared expenses for the group (if store is in a group)
    let sharedData: FixedExpense[] = [];
    if (activeStore?.sharing_group_id) {
      const { data } = await supabase
        .from("fixed_expenses")
        .select("id, name, monthly_value, cost_type, sharing_group_id, store_id, shared_store_ids")
        .eq("sharing_group_id", activeStore.sharing_group_id)
        .eq("cost_type", "shared")
        .order("created_at", { ascending: true });
      // Filter: only show shared expenses where this store is included (or no filter = all stores)
      const filteredShared = (data || []).filter((exp: any) => {
        if (!exp.shared_store_ids || exp.shared_store_ids.length === 0) return true; // legacy: all stores
        return exp.shared_store_ids.includes(storeId || activeStore?.id);
      });
      sharedData = filteredShared as FixedExpense[];
    }

    if (exclusiveError) {
      toast({ title: "Erro", description: "Não foi possível carregar as despesas", variant: "destructive" });
    }

    const allExpenses = [...(exclusiveData || []) as FixedExpense[], ...sharedData];
    setExpenses(allExpenses);

    // Exclusive total
    const exclusiveTotal = (exclusiveData || []).reduce((sum, exp) => sum + Number(exp.monthly_value), 0);
    onTotalChange?.(exclusiveTotal);

    // Shared parcela total - use per-expense store count
    const sharedParcela = sharedData.reduce((sum, exp) => {
      const count = exp.shared_store_ids?.length || storeCount;
      return sum + (count > 0 ? Number(exp.monthly_value) / count : 0);
    }, 0);
    onSharedTotalChange?.(sharedParcela);

    setIsLoading(false);
  }, [userId, storeId, activeStore?.sharing_group_id, storeCount]);

  useEffect(() => {
    if (userId) fetchExpenses();
  }, [fetchExpenses]);

  const exclusiveExpenses = expenses.filter(e => e.cost_type === "exclusive");
  const sharedExpenses = expenses.filter(e => e.cost_type === "shared");
  const exclusiveTotal = exclusiveExpenses.reduce((sum, exp) => sum + Number(exp.monthly_value), 0);
  const sharedOriginalTotal = sharedExpenses.reduce((sum, exp) => sum + Number(exp.monthly_value), 0);
  const sharedParcelaTotal = storeCount > 0 ? sharedExpenses.reduce((sum, exp) => sum + Number(exp.monthly_value) / storeCount, 0) : 0;
  const effectiveTotal = exclusiveTotal + sharedParcelaTotal;
  const percentOfRevenue = monthlyRevenue && monthlyRevenue > 0 ? (effectiveTotal / monthlyRevenue) * 100 : null;

  const handleAdd = async () => {
    if (!newExpense.name.trim()) {
      toast({ title: "Erro", description: "Nome da despesa é obrigatório", variant: "destructive" });
      return;
    }
    const value = parseFloat(newExpense.value) || 0;
    if (value < 0) {
      toast({ title: "Erro", description: "Valor não pode ser negativo", variant: "destructive" });
      return;
    }
    setIsAdding(true);
    const { data, error } = await supabase
      .from("fixed_expenses")
      .insert({ user_id: userId, store_id: storeId || null, name: newExpense.name.trim(), monthly_value: value })
      .select("id, name, monthly_value, cost_type, sharing_group_id, store_id")
      .single();
    if (error) {
      toast({ title: "Erro", description: "Não foi possível adicionar a despesa", variant: "destructive" });
    } else {
      setNewExpense({ name: "", value: "" });
      toast({ title: "Sucesso!", description: "Despesa adicionada" });
      await fetchExpenses();
    }
    setIsAdding(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editValue.name.trim()) {
      toast({ title: "Erro", description: "Nome da despesa é obrigatório", variant: "destructive" });
      return;
    }
    const value = parseFloat(editValue.value) || 0;
    const { error } = await supabase
      .from("fixed_expenses")
      .update({ name: editValue.name.trim(), monthly_value: value })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar a despesa", variant: "destructive" });
    } else {
      setEditingId(null);
      toast({ title: "Sucesso!", description: "Despesa atualizada" });
      await fetchExpenses();
      if (hasGroup) await refreshGroup();
    }
  };

  const isPrimaryStore = activeStore?.is_default === true;

  const handleDelete = async (id: string) => {
    const expense = expenses.find(e => e.id === id);
    
    // If it's a shared expense, show confirmation dialog instead of deleting directly
    if (expense?.cost_type === "shared") {
      setDeleteSharedConfirm(expense);
      return;
    }

    // Exclusive expense: softDelete normally
    const { data: record } = await supabase.from("fixed_expenses").select("*").eq("id", id).single();
    if (!record) {
      toast({ title: "Erro", description: "Não foi possível encontrar a despesa", variant: "destructive" });
      return;
    }
    const success = await softDelete({ table: "fixed_expenses", id, data: record, storeId: storeId || null });
    if (success) {
      await fetchExpenses();
      if (hasGroup) await refreshGroup();
    }
  };

  const handleConfirmDeleteShared = async () => {
    if (!deleteSharedConfirm || !activeStore) return;
    setIsDeletingShared(true);

    if (isPrimaryStore) {
      // Primary store: actually delete the shared expense (affects all stores)
      const { data: record } = await supabase.from("fixed_expenses").select("*").eq("id", deleteSharedConfirm.id).single();
      if (record) {
        const success = await softDelete({ table: "fixed_expenses", id: deleteSharedConfirm.id, data: record, storeId: null });
        if (success) {
          await fetchExpenses();
          await refreshGroup();
        }
      }
    } else {
      // Secondary store: remove this store from this expense's shared_store_ids
      const currentIds = deleteSharedConfirm.shared_store_ids || [];
      const newIds = currentIds.filter(id => id !== activeStore.id);

      if (newIds.length < 2) {
        // If only 1 store left, convert back to exclusive for that store
        const remainingStoreId = newIds[0] || null;
        const { error } = await supabase
          .from("fixed_expenses")
          .update({ 
            cost_type: "exclusive", 
            sharing_group_id: null, 
            store_id: remainingStoreId,
            shared_store_ids: null
          })
          .eq("id", deleteSharedConfirm.id);

        if (error) {
          toast({ title: "Erro", description: "Não foi possível atualizar a despesa", variant: "destructive" });
        } else {
          toast({ title: "Sucesso!", description: "Despesa removida do compartilhamento desta loja. Como restou apenas 1 loja, a despesa voltou a ser exclusiva." });
        }
      } else {
        // Update shared_store_ids removing current store
        const { error } = await supabase
          .from("fixed_expenses")
          .update({ shared_store_ids: newIds })
          .eq("id", deleteSharedConfirm.id);

        if (error) {
          toast({ title: "Erro", description: "Não foi possível remover a loja do compartilhamento", variant: "destructive" });
        } else {
          // Trigger recalculation
          if (activeStore.sharing_group_id) {
            await supabase.rpc("recalculate_shared_costs", { p_group_id: activeStore.sharing_group_id });
          }
          toast({ 
            title: "Sucesso!", 
            description: `Esta loja foi removida. A despesa continua dividida entre ${newIds.length} lojas.`
          });
        }
      }
      await fetchExpenses();
      await refreshGroup();
    }

    setDeleteSharedConfirm(null);
    setIsDeletingShared(false);
  };

  const handleToggleShare = async (expense: FixedExpense) => {
    if (expense.cost_type === "exclusive") {
      // Pre-select all user stores
      setSelectedShareStores(stores.map(s => s.id));
      setShareConfirmExpense(expense);
    } else {
      setUnshareConfirmExpense(expense);
    }
  };

  const toggleStoreSelection = (storeId: string) => {
    setSelectedShareStores(prev => 
      prev.includes(storeId) 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  const confirmShare = async () => {
    if (!shareConfirmExpense || selectedShareStores.length < 2) {
      toast({ title: "Atenção", description: "Selecione pelo menos 2 lojas para compartilhar", variant: "destructive" });
      return;
    }
    setIsToggling(true);

    // Ensure all selected stores are in the sharing group
    let groupId = group?.id;
    if (!groupId) {
      // No group yet — create one with the selected stores
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setIsToggling(false); return; }
      const { data: newGroup, error: groupError } = await supabase
        .from("sharing_groups")
        .insert({ user_id: session.user.id, name: "Grupo compartilhado" })
        .select()
        .single();
      if (groupError || !newGroup) {
        toast({ title: "Erro", description: "Não foi possível criar o grupo", variant: "destructive" });
        setIsToggling(false);
        return;
      }
      groupId = newGroup.id;
      // Add all selected stores to the group
      await supabase.from("sharing_group_stores").insert(
        selectedShareStores.map(sid => ({ sharing_group_id: groupId!, store_id: sid }))
      );
      // Update stores with group reference
      for (const sid of selectedShareStores) {
        await supabase.from("stores").update({ sharing_group_id: groupId }).eq("id", sid);
      }
    } else {
      // Group exists — add any stores not yet in the group
      const existingStoreIds = groupStores.map(gs => gs.store_id);
      const newStoreIds = selectedShareStores.filter(sid => !existingStoreIds.includes(sid));
      if (newStoreIds.length > 0) {
        await supabase.from("sharing_group_stores").insert(
          newStoreIds.map(sid => ({ sharing_group_id: groupId!, store_id: sid }))
        );
        for (const sid of newStoreIds) {
          await supabase.from("stores").update({ sharing_group_id: groupId }).eq("id", sid);
        }
      }
    }

    const { error } = await supabase
      .from("fixed_expenses")
      .update({ 
        cost_type: "shared", 
        sharing_group_id: groupId, 
        store_id: null,
        shared_store_ids: selectedShareStores
      })
      .eq("id", shareConfirmExpense.id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível compartilhar a despesa", variant: "destructive" });
    } else {
      // Recalculate shared costs
      await supabase.rpc("recalculate_shared_costs", { p_group_id: groupId });
      toast({ title: "Sucesso!", description: `Despesa compartilhada entre ${selectedShareStores.length} lojas` });
      await fetchExpenses();
      await refreshGroup();
    }
    setShareConfirmExpense(null);
    setSelectedShareStores([]);
    setIsToggling(false);
  };

  const confirmUnshare = async () => {
    if (!unshareConfirmExpense) return;
    setIsToggling(true);
    const { error } = await supabase
      .from("fixed_expenses")
      .update({ cost_type: "exclusive", sharing_group_id: null, store_id: storeId || null })
      .eq("id", unshareConfirmExpense.id);
    if (error) {
      toast({ title: "Erro", description: "Não foi possível tornar a despesa exclusiva", variant: "destructive" });
    } else {
      toast({ title: "Sucesso!", description: "Despesa agora é exclusiva desta loja" });
      await fetchExpenses();
      await refreshGroup();
    }
    setUnshareConfirmExpense(null);
    setIsToggling(false);
  };

  const startEdit = (expense: FixedExpense) => {
    setEditingId(expense.id);
    setEditValue({ name: expense.name, value: expense.monthly_value.toString() });
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">Despesas Fixas do Negócio</h3>
              <p className="text-sm text-muted-foreground">Gastos mensais que não variam conforme vendas</p>
            </div>
          </div>
        </div>

        {/* Group info banner */}
        {hasGroup && group && (
          <div className="flex items-center gap-3 p-3 mb-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <Users className="w-5 h-5 text-violet-500 flex-shrink-0" />
            <p className="text-sm text-foreground">
              Esta loja faz parte do grupo <strong>{group.name}</strong>. As despesas compartilhadas estão sendo divididas entre <strong>{storeCount} lojas</strong>.
            </p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 rounded-lg p-3 sm:p-4 border border-rose-500/20">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-rose-500" />
              <span className="text-xs text-muted-foreground">Total Efetivo</span>
            </div>
            <p className="font-display text-base sm:text-xl font-bold text-foreground truncate">
              R$ {formatCurrency(effectiveTotal)}
            </p>
            {sharedParcelaTotal > 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">
                R$ {formatCurrency(exclusiveTotal)} exclusivo + R$ {formatCurrency(sharedParcelaTotal)} parcela
              </p>
            )}
          </div>
          <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Despesas</span>
            </div>
            <p className="font-display text-base sm:text-xl font-bold text-foreground">{expenses.length}</p>
          </div>
          <div className={`rounded-lg p-3 sm:p-4 border ${percentOfRevenue !== null ? "bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20" : "bg-muted/50 border-border"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Do Faturamento</span>
            </div>
            <p className={`font-display text-base sm:text-xl font-bold truncate ${percentOfRevenue !== null ? "text-amber-600" : "text-muted-foreground"}`}>
              {percentOfRevenue !== null ? `${percentOfRevenue.toFixed(1)}%` : "—"}
            </p>
            {percentOfRevenue === null && (
              <p className="text-xs text-muted-foreground mt-1">Informe o faturamento</p>
            )}
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-2 mb-4">
          {expenses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma despesa fixa cadastrada</p>
            </div>
          ) : (
            expenses.map((expense) => {
              const isShared = expense.cost_type === "shared";
              const expenseStoreCount = isShared && expense.shared_store_ids?.length ? expense.shared_store_ids.length : storeCount;
              const parcela = isShared && expenseStoreCount > 0 ? expense.monthly_value / expenseStoreCount : expense.monthly_value;

              return (
                <div
                  key={expense.id}
                  className={`p-3 rounded-lg transition-colors group ${
                    isShared
                      ? "bg-violet-500/5 border border-violet-500/20 hover:bg-violet-500/10"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  {editingId === expense.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue.name}
                        onChange={(e) => setEditValue({ ...editValue, name: e.target.value })}
                        placeholder="Nome da despesa"
                        className="flex-1"
                      />
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editValue.value}
                          onChange={(e) => setEditValue({ ...editValue, value: e.target.value })}
                          className="pl-8 text-right"
                        />
                      </div>
                      <Button size="sm" onClick={() => handleUpdate(expense.id)}>Salvar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span
                            className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                            onClick={() => startEdit(expense)}
                          >
                            {expense.name}
                          </span>
                          {isShared && (
                            <Badge variant="secondary" className="bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[10px] gap-0.5 flex-shrink-0">
                              <Share2 className="w-2.5 h-2.5" />
                              {expenseStoreCount} lojas
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                            onClick={() => startEdit(expense)}
                          >
                            R$ {formatCurrency(isShared ? expense.monthly_value : expense.monthly_value)}
                          </span>
                          {isShared && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100"
                              onClick={() => setDetailExpense(expense)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Shared details line */}
                      {isShared && expenseStoreCount > 0 && (
                        <div className="flex items-center gap-3 mt-1.5 text-sm">
                          <span className="text-muted-foreground">Total: R$ {formatCurrency(expense.monthly_value)}</span>
                          <span className="text-violet-600 dark:text-violet-400 font-medium">
                            Sua parcela: R$ {formatCurrency(parcela)}
                          </span>
                        </div>
                      )}

                      {/* Toggle (only if user has a sharing group) */}
                      {hasGroup && (
                        <div className="flex items-center gap-2 mt-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={isShared}
                                    onCheckedChange={() => handleToggleShare(expense)}
                                    className="data-[state=checked]:bg-violet-500"
                                  />
                                  <span className="text-xs text-muted-foreground">
                                    {isShared ? "Compartilhada" : "Compartilhar"}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[250px]">
                                <p className="text-xs">
                                  Dividir essa despesa automaticamente entre as lojas que compartilham a mesma estrutura.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add new expense */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Ex: Aluguel, Água, Luz, Funcionários, Sistemas"
              value={newExpense.name}
              onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <div className="relative w-32">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={newExpense.value}
                onChange={(e) => setNewExpense({ ...newExpense, value: e.target.value })}
                className="pl-8 text-right"
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Button onClick={handleAdd} disabled={isAdding} className="gap-1">
              {isAdding ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Adicionar
            </Button>
          </div>
          <CategoryMismatchAlert inputText={newExpense.name} currentCategory="despesas_fixas" />
        </div>

        {/* Shared Costs Summary (only if there are shared expenses) */}
        {hasGroup && sharedExpenses.length > 0 && (
          <div className="mt-6 p-4 bg-violet-500/5 rounded-xl border border-violet-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-violet-500" />
              <h4 className="font-semibold text-sm text-foreground">Resumo de Custos Compartilhados</h4>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Total Original</p>
                <p className="font-semibold text-foreground">R$ {formatCurrency(sharedOriginalTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Sua Parcela</p>
                <p className="font-semibold text-violet-600 dark:text-violet-400">R$ {formatCurrency(sharedParcelaTotal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Lojas no Grupo</p>
                <p className="font-semibold text-foreground">{storeCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Tipo de Divisão</p>
                <p className="font-semibold text-foreground">Igualitária</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Confirm Share Dialog ─── */}
      <Dialog open={!!shareConfirmExpense} onOpenChange={(open) => { if (!open) { setShareConfirmExpense(null); setSelectedShareStores([]); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Dividir essa despesa?</DialogTitle>
            <DialogDescription>
              Selecione as lojas que irão compartilhar esta despesa.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-foreground">{shareConfirmExpense?.name}</p>
            <p className="text-sm text-muted-foreground">
              Valor total: R$ {formatCurrency(shareConfirmExpense?.monthly_value || 0)}
            </p>
          </div>

          {/* Store selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Lojas que irão dividir:</p>
            {stores.map((store) => {
              const isSelected = selectedShareStores.includes(store.id);
              const isCurrentStore = store.id === activeStore?.id;
              return (
                <div
                  key={store.id}
                  onClick={() => toggleStoreSelection(store.id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors border ${
                    isSelected 
                      ? "bg-violet-500/10 border-violet-500/30" 
                      : "bg-muted/30 border-transparent hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                      isSelected ? "bg-violet-600 border-violet-600" : "border-muted-foreground/30"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-sm text-foreground">{store.name}</span>
                    {isCurrentStore && (
                      <Badge variant="secondary" className="text-[10px]">Atual</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedShareStores.length >= 2 && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs text-muted-foreground">
                <strong>Divisão igualitária:</strong> R$ {formatCurrency(shareConfirmExpense?.monthly_value || 0)} ÷ {selectedShareStores.length} lojas = <strong className="text-foreground">R$ {formatCurrency((shareConfirmExpense?.monthly_value || 0) / selectedShareStores.length)}/loja</strong>
              </p>
            </div>
          )}

          {selectedShareStores.length < 2 && (
            <p className="text-xs text-amber-600">Selecione pelo menos 2 lojas para compartilhar.</p>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setShareConfirmExpense(null); setSelectedShareStores([]); }} disabled={isToggling}>
              Cancelar
            </Button>
            <Button onClick={confirmShare} disabled={isToggling || selectedShareStores.length < 2} className="gap-2 bg-violet-600 hover:bg-violet-700">
              {isToggling && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Confirmar divisão ({selectedShareStores.length} lojas)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Unshare Dialog ─── */}
      <Dialog open={!!unshareConfirmExpense} onOpenChange={(open) => !open && setUnshareConfirmExpense(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Tornar exclusiva?
            </DialogTitle>
            <DialogDescription>
              Deseja tornar essa despesa exclusiva desta loja? As demais lojas deixarão de assumir parcela desse custo.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-foreground">{unshareConfirmExpense?.name}</p>
            <p className="text-sm text-muted-foreground">
              Valor total: R$ {formatCurrency(unshareConfirmExpense?.monthly_value || 0)} — será 100% desta loja
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUnshareConfirmExpense(null)} disabled={isToggling}>
              Cancelar
            </Button>
            <Button onClick={confirmUnshare} disabled={isToggling} variant="destructive" className="gap-2">
              {isToggling && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Sim, tornar exclusiva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail (Ver Divisão) Dialog ─── */}
      <Dialog open={!!detailExpense} onOpenChange={(open) => !open && setDetailExpense(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Divisão — {detailExpense?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="font-display text-2xl font-bold text-foreground">
                R$ {formatCurrency(detailExpense?.monthly_value || 0)}
              </p>
            </div>
            {groupStores.map((gs) => {
              const parcela = (detailExpense?.monthly_value || 0) / Math.max(storeCount, 1);
              const pct = storeCount > 0 ? (100 / storeCount) : 0;
              const storeName = stores.find(s => s.id === gs.store_id)?.name || "Loja";
              const isCurrentStore = gs.store_id === activeStore?.id;
              return (
                <div
                  key={gs.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isCurrentStore ? "bg-violet-500/10 border border-violet-500/20" : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-foreground">{storeName}</span>
                    {isCurrentStore && (
                      <Badge variant="secondary" className="text-[10px]">Atual</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-violet-600 dark:text-violet-400">
                      R$ {formatCurrency(parcela)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({pct.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground text-center">
              Divisão igualitária entre {storeCount} lojas
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Delete Shared Expense Dialog ─── */}
      <Dialog open={!!deleteSharedConfirm} onOpenChange={(open) => !open && setDeleteSharedConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {isPrimaryStore ? "Excluir despesa compartilhada?" : "Remover compartilhamento?"}
            </DialogTitle>
            <DialogDescription>
              {isPrimaryStore
                ? "Esta despesa será excluída permanentemente de TODAS as lojas do grupo. Esta ação não pode ser desfeita facilmente."
                : "Ao remover, esta loja deixará de compartilhar esta despesa. As demais lojas continuarão dividindo o valor entre si."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium text-foreground">{deleteSharedConfirm?.name}</p>
            <p className="text-sm text-muted-foreground">
              Valor total: R$ {formatCurrency(deleteSharedConfirm?.monthly_value || 0)}
            </p>
          </div>
          {!isPrimaryStore && (() => {
            const sharedCount = deleteSharedConfirm?.shared_store_ids?.length || storeCount;
            const remainingCount = sharedCount - 1;
            return (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <p className="text-xs text-foreground">
                  <strong>O que vai acontecer:</strong>
                </p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc pl-4">
                  <li>Esta loja será removida do compartilhamento desta despesa</li>
                  {remainingCount >= 2 ? (
                    <li>A despesa continuará dividida entre as {remainingCount} lojas restantes (R$ {formatCurrency((deleteSharedConfirm?.monthly_value || 0) / Math.max(remainingCount, 1))}/loja)</li>
                  ) : (
                    <li>Como restará apenas 1 loja, a despesa voltará a ser exclusiva dela</li>
                  )}
                  <li>Para reativar, acesse a loja principal e compartilhe novamente</li>
                </ul>
              </div>
            );
          })()}
          {isPrimaryStore && (
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-xs text-foreground">
                <strong>Atenção:</strong> Como esta é a loja principal, a despesa será movida para a lixeira e removida de todas as {storeCount} lojas do grupo.
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteSharedConfirm(null)} disabled={isDeletingShared}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmDeleteShared} disabled={isDeletingShared} variant="destructive" className="gap-2">
              {isDeletingShared && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {isPrimaryStore ? "Excluir de todas as lojas" : "Remover desta loja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
