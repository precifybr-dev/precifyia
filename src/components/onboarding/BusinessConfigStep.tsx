import { useState } from "react";
import { Building2, Info, AlertTriangle } from "lucide-react";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import type { Profile } from "@/hooks/useOnboarding";

interface BusinessConfigStepProps {
  profile: Profile;
  onUpdate: (updates: Partial<Profile>) => Promise<Profile | null>;
  onAdvance: () => Promise<void>;
}

const businessTypes = [
  { value: "restaurant", label: "Restaurante" },
  { value: "bakery", label: "Padaria / Confeitaria" },
  { value: "snack_bar", label: "Lanchonete" },
  { value: "food_truck", label: "Food Truck" },
  { value: "pizzeria", label: "Pizzaria" },
  { value: "cafe", label: "Cafeteria" },
  { value: "bar", label: "Bar" },
  { value: "other", label: "Outro" },
];

const taxRegimes = [
  { value: "simples", label: "Simples Nacional" },
  { value: "lucro_presumido", label: "Lucro Presumido" },
  { value: "lucro_real", label: "Lucro Real" },
  { value: "mei", label: "MEI" },
  { value: "not_sure", label: "Não sei / Prefiro não informar" },
];

export function BusinessConfigStep({
  profile,
  onUpdate,
  onAdvance,
}: BusinessConfigStepProps) {
  const [businessName, setBusinessName] = useState(profile.business_name || "");
  const [businessType, setBusinessType] = useState(profile.business_type || "");
  const [taxRegime, setTaxRegime] = useState(profile.tax_regime || "");
  const [profitMargin, setProfitMargin] = useState(
    profile.default_profit_margin?.toString() || "30"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!businessName.trim()) {
      newErrors.businessName = "Nome do negócio é obrigatório";
    }

    if (!businessType) {
      newErrors.businessType = "Selecione o tipo de negócio";
    }

    const margin = parseFloat(profitMargin);
    if (isNaN(margin) || margin < 0 || margin > 100) {
      newErrors.profitMargin = "Margem deve ser entre 0 e 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    try {
      await onUpdate({
        business_name: businessName.trim(),
        business_type: businessType,
        tax_regime: taxRegime || null,
        default_profit_margin: parseFloat(profitMargin),
      });

      toast({
        title: "Negócio configurado! ✓",
        description: "Dados salvos com sucesso. Avançando para o próximo passo.",
      });

      await onAdvance();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os dados. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Configurar Negócio
          </h2>
          <p className="text-sm text-muted-foreground">
            Preencha as informações básicas do seu negócio
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Name */}
        <div className="space-y-2">
          <Label htmlFor="businessName" className="flex items-center gap-2">
            Nome do Negócio <span className="text-destructive">*</span>
          </Label>
          <Input
            id="businessName"
            placeholder="Ex: Restaurante Sabor Caseiro"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={errors.businessName ? "border-destructive" : ""}
          />
          {errors.businessName && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {errors.businessName}
            </p>
          )}
        </div>

        {/* Business Type */}
        <div className="space-y-2">
          <Label htmlFor="businessType" className="flex items-center gap-2">
            Tipo de Negócio <span className="text-destructive">*</span>
          </Label>
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger
              className={errors.businessType ? "border-destructive" : ""}
            >
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {businessTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.businessType && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {errors.businessType}
            </p>
          )}
        </div>

        {/* Tax Regime */}
        <div className="space-y-2">
          <Label htmlFor="taxRegime" className="flex items-center gap-2">
            Regime Tributário
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  O regime tributário afeta o cálculo de impostos nos preços.
                  Se não souber, selecione "Não sei" - você pode alterar depois.
                </p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <Select value={taxRegime} onValueChange={setTaxRegime}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione (opcional)" />
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

        {/* Profit Margin */}
        <div className="space-y-2">
          <Label htmlFor="profitMargin" className="flex items-center gap-2">
            Margem de Lucro Padrão (%)
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Margem de lucro que será aplicada por padrão nas fichas
                  técnicas. Você pode ajustar individualmente depois.
                </p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <div className="relative">
            <Input
              id="profitMargin"
              type="number"
              min="0"
              max="100"
              step="1"
              value={profitMargin}
              onChange={(e) => setProfitMargin(e.target.value)}
              className={`pr-8 ${errors.profitMargin ? "border-destructive" : ""}`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              %
            </span>
          </div>
          {errors.profitMargin && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {errors.profitMargin}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="hero"
          size="lg"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Salvando..." : "Salvar e Continuar"}
        </Button>
      </form>
    </div>
  );
}
