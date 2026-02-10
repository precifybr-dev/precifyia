import { useState, useEffect, useCallback } from "react";
import { 
  Receipt, 
  Plus, 
  Trash2, 
  CreditCard,
  Percent,
  HelpCircle,
  Building2,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/contexts/StoreContext";

interface BusinessTax {
  id: string;
  user_id: string;
  store_id: string | null;
  tax_regime: string;
  tax_percentage: number;
  notes: string | null;
}

interface CardFee {
  id: string;
  user_id: string;
  store_id: string | null;
  payment_type: string;
  fee_percentage: number;
  notes: string | null;
}

const taxRegimes = [
  { value: "simples", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
];

const paymentTypes = [
  { value: "debit", label: "Débito" },
  { value: "credit", label: "Crédito à vista" },
  { value: "credit_installment", label: "Crédito parcelado" },
];

interface Props {
  userId: string | undefined;
  taxPercentage?: number | null;
  averageCardFee?: number | null;
  totalDeductions?: number | null;
  onDataChanged?: () => void;
}

export default function TaxesAndFeesBlock({ userId, taxPercentage: backendTaxPercentage, averageCardFee: backendAverageCardFee, totalDeductions: backendTotalDeductions, onDataChanged }: Props) {
  const { activeStore } = useStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Tax state
  const [businessTax, setBusinessTax] = useState<BusinessTax | null>(null);
  const [taxRegime, setTaxRegime] = useState("simples");
  const [taxPercentage, setTaxPercentage] = useState("");
  const [taxNotes, setTaxNotes] = useState("");

  // Card fees state
  const [cardFees, setCardFees] = useState<CardFee[]>([]);
  const [newPaymentType, setNewPaymentType] = useState("debit");
  const [newFeePercentage, setNewFeePercentage] = useState("");
  const [newFeeNotes, setNewFeeNotes] = useState("");

  const storeId = activeStore?.id || null;

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);

    try {
      let taxQuery = supabase
        .from("business_taxes")
        .select("*")
        .eq("user_id", userId);

      if (storeId) {
        taxQuery = taxQuery.eq("store_id", storeId);
      } else {
        taxQuery = taxQuery.is("store_id", null);
      }

      const { data: taxData } = await taxQuery.maybeSingle();

      if (taxData) {
        setBusinessTax(taxData as BusinessTax);
        setTaxRegime(taxData.tax_regime);
        setTaxPercentage(taxData.tax_percentage?.toString() || "");
        setTaxNotes(taxData.notes || "");
      } else {
        setBusinessTax(null);
        setTaxRegime("simples");
        setTaxPercentage("");
        setTaxNotes("");
      }

      let feesQuery = supabase
        .from("card_fees")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (storeId) {
        feesQuery = feesQuery.eq("store_id", storeId);
      } else {
        feesQuery = feesQuery.is("store_id", null);
      }

      const { data: feesData } = await feesQuery;
      setCardFees((feesData || []) as CardFee[]);
    } catch (error) {
      console.error("Error fetching taxes and fees:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, storeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveTax = async () => {
    if (!userId) return;
    setIsSaving(true);

    const taxValue = parseFloat(taxPercentage) || 0;

    try {
      if (businessTax) {
        const { error } = await supabase
          .from("business_taxes")
          .update({
            tax_regime: taxRegime,
            tax_percentage: taxValue,
            notes: taxNotes || null,
          })
          .eq("id", businessTax.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_taxes")
          .insert({
            user_id: userId,
            store_id: storeId,
            tax_regime: taxRegime,
            tax_percentage: taxValue,
            notes: taxNotes || null,
          });

        if (error) throw error;
      }

      toast({ title: "Sucesso!", description: "Configuração de impostos salva" });
      fetchData();
      onDataChanged?.();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCardFee = async () => {
    if (!userId || !newFeePercentage) return;

    const feeValue = parseFloat(newFeePercentage);
    if (isNaN(feeValue) || feeValue < 0) {
      toast({ title: "Erro", description: "Percentual inválido", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("card_fees")
        .insert({
          user_id: userId,
          store_id: storeId,
          payment_type: newPaymentType,
          fee_percentage: feeValue,
          notes: newFeeNotes || null,
        });

      if (error) throw error;

      toast({ title: "Sucesso!", description: "Taxa adicionada" });
      setNewPaymentType("debit");
      setNewFeePercentage("");
      setNewFeeNotes("");
      fetchData();
      onDataChanged?.();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCardFee = async (id: string) => {
    try {
      const { error } = await supabase
        .from("card_fees")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Taxa removida" });
      fetchData();
      onDataChanged?.();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const getPaymentTypeLabel = (value: string) => {
    return paymentTypes.find(t => t.value === value)?.label || value;
  };

  // Use backend values for summary display
  const displayTax = backendTaxPercentage ?? (parseFloat(taxPercentage) || 0);
  const displayAvgFee = backendAverageCardFee ?? 0;
  const displayTotal = backendTotalDeductions ?? (displayTax + displayAvgFee);

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-card">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
          <Receipt className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-display font-semibold text-lg text-foreground">
            Impostos e Taxas Financeiras
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure para saber quanto você realmente recebe em cada venda
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p>
                Esses valores <strong>não alteram</strong> o preço de venda. 
                Servem para calcular quanto você realmente recebe líquido após 
                descontar impostos e taxas de cartão.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Tax Configuration Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-foreground">Impostos sobre Faturamento</h4>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Regime Tributário</Label>
            <Select value={taxRegime} onValueChange={setTaxRegime}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {taxRegimes.map((regime) => (
                  <SelectItem key={regime.value} value={regime.value}>
                    {regime.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Percent className="w-3 h-3" />
              Percentual de Impostos
            </Label>
            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxPercentage}
                onChange={(e) => setTaxPercentage(e.target.value)}
                placeholder="Ex: 6"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Informe a média real de impostos pagos sobre o faturamento
            </p>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Input
              value={taxNotes}
              onChange={(e) => setTaxNotes(e.target.value)}
              placeholder="Ex: DAS mensal"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={handleSaveTax} disabled={isSaving} size="sm" className="gap-2">
            <Save className="w-4 h-4" />
            Salvar Impostos
          </Button>
        </div>
      </div>

      {/* Card Fees Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-medium text-foreground">Taxas de Cartão de Crédito e Débito</h4>
        </div>

        {cardFees.length > 0 && (
          <div className="space-y-2 mb-4">
            {cardFees.map((fee) => (
              <div
                key={fee.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium text-foreground">
                      {getPaymentTypeLabel(fee.payment_type)}
                    </span>
                    <span className="text-muted-foreground mx-2">—</span>
                    <span className="text-primary font-semibold">
                      {fee.fee_percentage.toFixed(2)}%
                    </span>
                    {fee.notes && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({fee.notes})
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteCardFee(fee.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add new fee form */}
        <div className="p-4 border border-dashed border-border rounded-lg bg-muted/30">
          <p className="text-sm text-muted-foreground mb-3">Adicionar nova taxa</p>
          <div className="grid sm:grid-cols-4 gap-3">
            <Select value={newPaymentType} onValueChange={setNewPaymentType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {paymentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={newFeePercentage}
                onChange={(e) => setNewFeePercentage(e.target.value)}
                placeholder="Taxa %"
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>

            <Input
              value={newFeeNotes}
              onChange={(e) => setNewFeeNotes(e.target.value)}
              placeholder="Observação (opcional)"
            />

            <Button 
              onClick={handleAddCardFee} 
              disabled={isSaving || !newFeePercentage}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* Summary - using backend-calculated values */}
      {(displayTax > 0 || displayAvgFee > 0) && (
        <div className="mt-6 p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Impostos</p>
              <p className="font-display text-xl font-bold text-foreground">
                {displayTax}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Taxa média cartão</p>
              <p className="font-display text-xl font-bold text-foreground">
                {displayAvgFee.toFixed(2)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Dedução total</p>
              <p className="font-display text-xl font-bold text-amber-600">
                {displayTotal.toFixed(2)}%
              </p>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-3">
            A cada R$ 100 vendidos, você recebe aproximadamente R$ {(100 - displayTotal).toFixed(2)} líquidos
          </p>
        </div>
      )}
    </div>
  );
}
