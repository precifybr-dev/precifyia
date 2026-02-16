import { useState, useEffect } from "react";
import { Plus, Trash2, Receipt, Percent, DollarSign } from "lucide-react";
import CategoryMismatchAlert from "@/components/business/CategoryMismatchAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FixedExpense {
  id: string;
  name: string;
  monthly_value: number;
}

interface FixedExpensesBlockProps {
  userId: string;
  storeId?: string | null;
  monthlyRevenue: number | null;
  onTotalChange?: (total: number) => void;
}

export default function FixedExpensesBlock({ userId, storeId, monthlyRevenue, onTotalChange }: FixedExpensesBlockProps) {
  const [expenses, setExpenses] = useState<FixedExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newExpense, setNewExpense] = useState({ name: "", value: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState({ name: "", value: "" });
  const { toast } = useToast();

  const fetchExpenses = async () => {
    let query = supabase
      .from("fixed_expenses")
      .select("*")
      .eq("user_id", userId);
    if (storeId) query = query.or(`store_id.eq.${storeId},store_id.is.null`);
    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível carregar as despesas", variant: "destructive" });
    } else {
      const expensesList = data || [];
      setExpenses(expensesList);
      const total = expensesList.reduce((sum, exp) => sum + Number(exp.monthly_value), 0);
      onTotalChange?.(total);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (userId) {
      fetchExpenses();
    }
  }, [userId, storeId]);

  const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.monthly_value), 0);
  const percentOfRevenue = monthlyRevenue && monthlyRevenue > 0 
    ? (totalExpenses / monthlyRevenue) * 100 
    : null;

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
      .insert({
        user_id: userId,
        store_id: storeId || null,
        name: newExpense.name.trim(),
        monthly_value: value,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: "Não foi possível adicionar a despesa", variant: "destructive" });
    } else {
      const newExpenses = [...expenses, data];
      setExpenses(newExpenses);
      setNewExpense({ name: "", value: "" });
      toast({ title: "Sucesso!", description: "Despesa adicionada" });
      const total = newExpenses.reduce((sum, exp) => sum + Number(exp.monthly_value), 0);
      onTotalChange?.(total);
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
      .update({
        name: editValue.name.trim(),
        monthly_value: value,
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar a despesa", variant: "destructive" });
    } else {
      const updatedExpenses = expenses.map(exp => 
        exp.id === id ? { ...exp, name: editValue.name.trim(), monthly_value: value } : exp
      );
      setExpenses(updatedExpenses);
      setEditingId(null);
      toast({ title: "Sucesso!", description: "Despesa atualizada" });
      const total = updatedExpenses.reduce((sum, exp) => sum + Number(exp.monthly_value), 0);
      onTotalChange?.(total);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("fixed_expenses")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível remover a despesa", variant: "destructive" });
    } else {
      const filteredExpenses = expenses.filter(exp => exp.id !== id);
      setExpenses(filteredExpenses);
      toast({ title: "Sucesso!", description: "Despesa removida" });
      const total = filteredExpenses.reduce((sum, exp) => sum + Number(exp.monthly_value), 0);
      onTotalChange?.(total);
    }
  };

  const startEdit = (expense: FixedExpense) => {
    setEditingId(expense.id);
    setEditValue({ name: expense.name, value: expense.monthly_value.toString() });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

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
    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
      {/* Header with summary */}
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

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 rounded-lg p-4 border border-rose-500/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-rose-500" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="font-display text-xl font-bold text-foreground">
            R$ {formatCurrency(totalExpenses)}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Do Total</span>
          </div>
          <p className="font-display text-xl font-bold text-foreground">100%</p>
        </div>
        <div className={`rounded-lg p-4 border ${percentOfRevenue !== null ? 'bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20' : 'bg-muted/50 border-border'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Do Faturamento</span>
          </div>
          <p className={`font-display text-xl font-bold ${percentOfRevenue !== null ? 'text-amber-600' : 'text-muted-foreground'}`}>
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
          expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              {editingId === expense.id ? (
                <>
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
                </>
              ) : (
                <>
                  <span 
                    className="flex-1 text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => startEdit(expense)}
                  >
                    {expense.name}
                  </span>
                  <span 
                    className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => startEdit(expense)}
                  >
                    R$ {formatCurrency(expense.monthly_value)}
                  </span>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {totalExpenses > 0 ? `${((expense.monthly_value / totalExpenses) * 100).toFixed(0)}%` : "0%"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(expense.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add new expense */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ex: Aluguel, Água, Luz, Funcionários, Sistemas, Parcelas"
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
    </div>
  );
}
