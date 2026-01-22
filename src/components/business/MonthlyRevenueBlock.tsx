import { useState, useEffect } from "react";
import { Wallet, TrendingUp, Calculator, Calendar, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MonthlyRevenue {
  id?: string;
  month: number;
  year: number;
  value: number;
}

interface MonthlyRevenueBlockProps {
  userId: string;
  onAverageChange?: (average: number) => void;
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const MONTH_ABBREVIATIONS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export default function MonthlyRevenueBlock({ userId, onAverageChange }: MonthlyRevenueBlockProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [revenues, setRevenues] = useState<MonthlyRevenue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [manualAverage, setManualAverage] = useState<number | null>(null);
  const [isEditingManualAverage, setIsEditingManualAverage] = useState(false);
  const [manualAverageInput, setManualAverageInput] = useState("");
  const { toast } = useToast();

  const fetchRevenues = async () => {
    const { data, error } = await supabase
      .from("monthly_revenues")
      .select("*")
      .eq("user_id", userId)
      .eq("year", selectedYear)
      .order("month", { ascending: true });

    if (error) {
      toast({ title: "Erro", description: "Não foi possível carregar os faturamentos", variant: "destructive" });
    } else {
      setRevenues(data || []);
    }
    setIsLoading(false);
  };

  const fetchManualAverage = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("monthly_revenue")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (data?.monthly_revenue) {
      setManualAverage(Number(data.monthly_revenue));
    }
  };

  useEffect(() => {
    if (userId) {
      fetchRevenues();
      fetchManualAverage();
    }
  }, [userId, selectedYear]);

  // Calculate totals
  const filledMonths = revenues.filter(r => r.value > 0);
  const totalAnnual = revenues.reduce((sum, r) => sum + Number(r.value), 0);
  const calculatedAverage = filledMonths.length > 0 ? totalAnnual / filledMonths.length : null;
  
  // Use calculated average if available, otherwise use manual average
  const effectiveAverage = calculatedAverage !== null ? calculatedAverage : manualAverage;

  useEffect(() => {
    if (effectiveAverage !== null) {
      onAverageChange?.(effectiveAverage);
    }
  }, [effectiveAverage, onAverageChange]);

  const getRevenueForMonth = (month: number): MonthlyRevenue | undefined => {
    return revenues.find(r => r.month === month);
  };

  const handleSaveMonth = async (month: number) => {
    const value = parseFloat(editValue) || 0;
    if (value < 0) {
      toast({ title: "Erro", description: "Valor não pode ser negativo", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const existingRevenue = getRevenueForMonth(month);

    if (existingRevenue?.id) {
      // Update existing
      const { error } = await supabase
        .from("monthly_revenues")
        .update({ value })
        .eq("id", existingRevenue.id);

      if (error) {
        toast({ title: "Erro", description: "Não foi possível atualizar", variant: "destructive" });
      } else {
        setRevenues(revenues.map(r => r.month === month ? { ...r, value } : r));
        toast({ title: "Sucesso!", description: `${MONTH_NAMES[month - 1]} atualizado` });
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from("monthly_revenues")
        .insert({
          user_id: userId,
          year: selectedYear,
          month,
          value,
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Erro", description: "Não foi possível salvar", variant: "destructive" });
      } else {
        setRevenues([...revenues, data]);
        toast({ title: "Sucesso!", description: `${MONTH_NAMES[month - 1]} registrado` });
      }
    }

    setEditingMonth(null);
    setEditValue("");
    setIsSaving(false);
  };

  const handleSaveManualAverage = async () => {
    const value = parseFloat(manualAverageInput) || 0;
    if (value < 0) {
      toast({ title: "Erro", description: "Valor não pode ser negativo", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ monthly_revenue: value })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Erro", description: "Não foi possível salvar", variant: "destructive" });
    } else {
      setManualAverage(value);
      setIsEditingManualAverage(false);
      toast({ title: "Sucesso!", description: "Média manual atualizada" });
    }
  };

  const startEditMonth = (month: number) => {
    const revenue = getRevenueForMonth(month);
    setEditingMonth(month);
    setEditValue(revenue?.value?.toString() || "");
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
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-lg text-foreground">Faturamento Mensal</h3>
            <p className="text-sm text-muted-foreground">Registre o faturamento de cada mês para calcular a média</p>
          </div>
        </div>
        
        {/* Year selector */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setSelectedYear(selectedYear - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-display font-semibold text-lg min-w-[60px] text-center">{selectedYear}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setSelectedYear(selectedYear + 1)}
            disabled={selectedYear >= currentYear}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Total Anual</span>
          </div>
          <p className="font-display text-xl font-bold text-foreground">
            R$ {formatCurrency(totalAnnual)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {filledMonths.length} meses registrados
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 rounded-lg p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Calculator className="w-4 h-4 text-emerald-500" />
            <span className="text-xs text-muted-foreground">Média Mensal</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Calculada automaticamente com base nos meses preenchidos</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="font-display text-xl font-bold text-emerald-600">
            {effectiveAverage !== null ? `R$ ${formatCurrency(effectiveAverage)}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {calculatedAverage !== null ? "calculada" : "manual"}
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Projeção Anual</span>
          </div>
          <p className="font-display text-xl font-bold text-foreground">
            {effectiveAverage !== null ? `R$ ${formatCurrency(effectiveAverage * 12)}` : "—"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">com base na média</p>
        </div>
      </div>

      {/* Manual Average Input (when no history) */}
      {filledMonths.length === 0 && (
        <div className="mb-6 p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-foreground">Sem histórico de faturamento</span>
          </div>
          {isEditingManualAverage ? (
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualAverageInput}
                  onChange={(e) => setManualAverageInput(e.target.value)}
                  placeholder="0,00"
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveManualAverage()}
                />
              </div>
              <Button size="sm" onClick={handleSaveManualAverage}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditingManualAverage(false)}>Cancelar</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Informe a média mensal estimada ou preencha os meses abaixo
              </p>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setManualAverageInput(manualAverage?.toString() || "");
                  setIsEditingManualAverage(true);
                }}
              >
                {manualAverage ? `R$ ${formatCurrency(manualAverage)}` : "Informar média"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Monthly Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
          const revenue = getRevenueForMonth(month);
          const hasValue = revenue && revenue.value > 0;
          const isEditing = editingMonth === month;
          const isPastMonth = selectedYear < currentYear || 
            (selectedYear === currentYear && month <= new Date().getMonth() + 1);

          return (
            <div
              key={month}
              className={`rounded-lg p-3 border transition-all ${
                isEditing 
                  ? "border-primary bg-primary/5" 
                  : hasValue 
                    ? "border-emerald-500/30 bg-emerald-500/5" 
                    : "border-border bg-muted/30 hover:bg-muted/50"
              } ${!isPastMonth ? "opacity-50" : "cursor-pointer"}`}
              onClick={() => isPastMonth && !isEditing && startEditMonth(month)}
            >
              <div className="text-xs text-muted-foreground mb-1 font-medium">
                {MONTH_ABBREVIATIONS[month - 1]}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="h-8 pl-7 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveMonth(month);
                        if (e.key === "Escape") setEditingMonth(null);
                      }}
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      className="h-6 text-xs flex-1"
                      onClick={() => handleSaveMonth(month)}
                      disabled={isSaving}
                    >
                      OK
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 text-xs px-2"
                      onClick={() => setEditingMonth(null)}
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              ) : (
                <p className={`font-medium text-sm truncate ${hasValue ? "text-emerald-600" : "text-muted-foreground"}`}>
                  {hasValue ? `R$ ${formatCurrency(revenue.value)}` : "—"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Clique em um mês para registrar ou editar o faturamento
      </p>
    </div>
  );
}
