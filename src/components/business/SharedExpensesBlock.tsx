import { useState } from "react";
import { Plus, Trash2, Users, Share2, DollarSign, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSharingGroup } from "@/hooks/useSharingGroup";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";

interface SharedExpensesBlockProps {
  onTotalChange?: (total: number) => void;
}

export default function SharedExpensesBlock({ onTotalChange }: SharedExpensesBlockProps) {
  const {
    group,
    groupStores,
    sharedExpenses,
    allocations,
    sharedTotal,
    isLoading,
    hasGroup,
    storeCount,
    addSharedExpense,
    updateSharedExpense,
    deleteSharedExpense,
  } = useSharingGroup();

  const { toast } = useToast();
  const { stores } = useStore();
  const [newExpense, setNewExpense] = useState({ name: "", value: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState({ name: "", value: "" });
  const [detailExpenseId, setDetailExpenseId] = useState<string | null>(null);

  // Notify parent of total changes
  const notifyTotal = (total: number) => {
    onTotalChange?.(total);
  };

  // Keep parent in sync
  if (sharedTotal !== undefined) {
    // Use effect-like pattern via key comparison is avoided; parent reads via prop callback
  }

  if (!hasGroup || stores.length <= 1) return null;

  const formatCurrency = (value: number) =>
    value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleAdd = async () => {
    if (!newExpense.name.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    const value = parseFloat(newExpense.value) || 0;
    if (value < 0) {
      toast({ title: "Erro", description: "Valor não pode ser negativo", variant: "destructive" });
      return;
    }
    setIsAdding(true);
    const success = await addSharedExpense(newExpense.name.trim(), value);
    if (success) {
      setNewExpense({ name: "", value: "" });
    }
    setIsAdding(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editValue.name.trim()) return;
    const value = parseFloat(editValue.value) || 0;
    await updateSharedExpense(id, editValue.name.trim(), value);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteSharedExpense(id);
  };

  const startEdit = (expense: { id: string; name: string; monthly_value: number }) => {
    setEditingId(expense.id);
    setEditValue({ name: expense.name, value: expense.monthly_value.toString() });
  };

  // Detail modal data
  const detailExpense = sharedExpenses.find((e) => e.id === detailExpenseId);
  const detailAllocations = detailExpense
    ? groupStores.map((gs) => {
        const alloc = allocations.find((a) => a.expense_id === detailExpense.id);
        const allocAmount = detailExpense.monthly_value / storeCount;
        return {
          storeName: gs.store_name || "Loja",
          amount: allocAmount,
        };
      })
    : [];

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
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Share2 className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg text-foreground">
                Despesas Compartilhadas
              </h3>
              <p className="text-sm text-muted-foreground">
                Custos divididos entre as lojas do grupo
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Users className="w-3 h-3" />
            {storeCount} lojas
          </Badge>
        </div>

        {/* Group info */}
        <div className="mb-4 p-3 bg-violet-500/5 rounded-lg border border-violet-500/20">
          <p className="text-sm text-muted-foreground">
            <strong>Grupo:</strong> {group?.name} · Divisão{" "}
            {group?.division_type === "equal" ? "igualitária" : "manual"}
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 rounded-lg p-3 border border-violet-500/20">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-violet-500" />
              <span className="text-xs text-muted-foreground">Sua Parcela</span>
            </div>
            <p className="font-display text-xl font-bold text-foreground">
              R$ {formatCurrency(sharedTotal)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Original</span>
            </div>
            <p className="font-display text-xl font-bold text-foreground">
              R$ {formatCurrency(sharedExpenses.reduce((sum, e) => sum + Number(e.monthly_value), 0))}
            </p>
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-2 mb-4">
          {sharedExpenses.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Share2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma despesa compartilhada cadastrada</p>
            </div>
          ) : (
            sharedExpenses.map((expense) => {
              const parcela = expense.monthly_value / storeCount;
              return (
                <div
                  key={expense.id}
                  className="p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  {editingId === expense.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue.name}
                        onChange={(e) => setEditValue({ ...editValue, name: e.target.value })}
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
                        <span
                          className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                          onClick={() => startEdit(expense)}
                        >
                          {expense.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100"
                            onClick={() => setDetailExpenseId(expense.id)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(expense.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>Total: R$ {formatCurrency(expense.monthly_value)}</span>
                        <span>÷ {storeCount} lojas</span>
                        <span className="font-medium text-violet-600 dark:text-violet-400">
                          Sua parcela: R$ {formatCurrency(parcela)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Add new */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Ex: Aluguel, Água, Luz"
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
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detailExpenseId} onOpenChange={(open) => !open && setDetailExpenseId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Divisão Completa — {detailExpense?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 bg-muted/50 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="font-display text-2xl font-bold text-foreground">
                R$ {formatCurrency(detailExpense?.monthly_value || 0)}
              </p>
            </div>
            {detailAllocations.map((alloc, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-foreground">{alloc.storeName}</span>
                <span className="font-medium text-violet-600 dark:text-violet-400">
                  R$ {formatCurrency(alloc.amount)}
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center">
              Divisão {group?.division_type === "equal" ? "igualitária" : "manual"} entre {storeCount} lojas
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
