import { useState, useEffect } from "react";
import { Plus, Trash2, Layers, DollarSign } from "lucide-react";
import CategoryMismatchAlert from "@/components/business/CategoryMismatchAlert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDataProtection } from "@/hooks/useDataProtection";

interface VariableCost {
  id: string;
  name: string;
  value_per_item: number;
}

interface VariableCostsBlockProps {
  userId: string;
  storeId?: string | null;
  onTotalChange?: (total: number) => void;
}

export default function VariableCostsBlock({ userId, storeId, onTotalChange }: VariableCostsBlockProps) {
  const [costs, setCosts] = useState<VariableCost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCost, setNewCost] = useState({ name: "", value: "" });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState({ name: "", value: "" });
  const { toast } = useToast();
  const { softDelete } = useDataProtection();

  const fetchCosts = async () => {
    let query = supabase
      .from("variable_costs")
      .select("*")
      .eq("user_id", userId);
    if (storeId) query = query.eq("store_id", storeId);
    else query = query.is("store_id", null);
    const { data, error } = await query.order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível carregar os custos variáveis", variant: "destructive" });
    } else {
      const costsList = data || [];
      setCosts(costsList);
      const total = costsList.reduce((sum, cost) => sum + Number(cost.value_per_item), 0);
      onTotalChange?.(total);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (userId) {
      fetchCosts();
    }
  }, [userId, storeId]);

  const totalCosts = costs.reduce((sum, cost) => sum + Number(cost.value_per_item), 0);

  const handleAdd = async () => {
    if (!newCost.name.trim()) {
      toast({ title: "Erro", description: "Nome do custo é obrigatório", variant: "destructive" });
      return;
    }

    const value = parseFloat(newCost.value) || 0;
    if (value < 0) {
      toast({ title: "Erro", description: "Valor não pode ser negativo", variant: "destructive" });
      return;
    }

    setIsAdding(true);

    const { data, error } = await supabase
      .from("variable_costs")
      .insert({
        user_id: userId,
        store_id: storeId || null,
        name: newCost.name.trim(),
        value_per_item: value,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: "Não foi possível adicionar o custo", variant: "destructive" });
    } else {
      const newCosts = [...costs, data];
      setCosts(newCosts);
      setNewCost({ name: "", value: "" });
      toast({ title: "Sucesso!", description: "Custo variável adicionado" });
      const total = newCosts.reduce((sum, cost) => sum + Number(cost.value_per_item), 0);
      onTotalChange?.(total);
    }

    setIsAdding(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editValue.name.trim()) {
      toast({ title: "Erro", description: "Nome do custo é obrigatório", variant: "destructive" });
      return;
    }

    const value = parseFloat(editValue.value) || 0;

    const { error } = await supabase
      .from("variable_costs")
      .update({
        name: editValue.name.trim(),
        value_per_item: value,
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível atualizar o custo", variant: "destructive" });
    } else {
      const updatedCosts = costs.map(cost => 
        cost.id === id ? { ...cost, name: editValue.name.trim(), value_per_item: value } : cost
      );
      setCosts(updatedCosts);
      setEditingId(null);
      toast({ title: "Sucesso!", description: "Custo atualizado" });
      const total = updatedCosts.reduce((sum, cost) => sum + Number(cost.value_per_item), 0);
      onTotalChange?.(total);
    }
  };

  const handleDelete = async (id: string) => {
    const { data: record } = await supabase.from("variable_costs").select("*").eq("id", id).single();
    if (!record) {
      toast({ title: "Erro", description: "Não foi possível encontrar o custo", variant: "destructive" });
      return;
    }
    const success = await softDelete({ table: "variable_costs", id, data: record, storeId: storeId || null });
    if (success) {
      const filteredCosts = costs.filter(cost => cost.id !== id);
      setCosts(filteredCosts);
      const total = filteredCosts.reduce((sum, cost) => sum + Number(cost.value_per_item), 0);
      onTotalChange?.(total);
    }
  };

  const startEdit = (cost: VariableCost) => {
    setEditingId(cost.id);
    setEditValue({ name: cost.name, value: cost.value_per_item.toString() });
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <Layers className="w-5 h-5 text-cyan-500" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">Custos Variáveis de Produção</h3>
            <p className="text-sm text-muted-foreground">Custos diretos que variam conforme quantidade produzida</p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="mb-6">
        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 rounded-lg p-4 border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-cyan-500" />
            <span className="text-xs text-muted-foreground">Total por Item</span>
          </div>
          <p className="font-display text-2xl font-bold text-foreground">
            R$ {formatCurrency(totalCosts)}
          </p>
        </div>
      </div>

      {/* Costs List */}
      <div className="space-y-2 mb-4">
        {costs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum custo variável cadastrado</p>
          </div>
        ) : (
          costs.map((cost) => (
            <div
              key={cost.id}
              className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              {editingId === cost.id ? (
                <>
                  <Input
                    value={editValue.name}
                    onChange={(e) => setEditValue({ ...editValue, name: e.target.value })}
                    placeholder="Nome do custo"
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
                  <Button size="sm" onClick={() => handleUpdate(cost.id)}>Salvar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                </>
              ) : (
                <>
                  <span 
                    className="flex-1 text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => startEdit(cost)}
                  >
                    {cost.name}
                  </span>
                  <span 
                    className="font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={() => startEdit(cost)}
                  >
                    R$ {formatCurrency(cost.value_per_item)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(cost.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add new cost */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ex: Embalagem, Perda estimada, Taxa por item"
            value={newCost.name}
            onChange={(e) => setNewCost({ ...newCost, name: e.target.value })}
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
            value={newCost.value}
            onChange={(e) => setNewCost({ ...newCost, value: e.target.value })}
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
        <CategoryMismatchAlert inputText={newCost.name} currentCategory="custos_variaveis_producao" />
      </div>
    </div>
  );
}
