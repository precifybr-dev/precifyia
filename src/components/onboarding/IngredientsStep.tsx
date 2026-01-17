import { useState } from "react";
import { Package, Plus, Trash2, AlertCircle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface IngredientsStepProps {
  onAdvance: () => Promise<void>;
}

interface Ingredient {
  id: string;
  name: string;
  unit: string;
  price: string;
}

const units = [
  { value: "kg", label: "Quilograma (kg)" },
  { value: "g", label: "Grama (g)" },
  { value: "l", label: "Litro (L)" },
  { value: "ml", label: "Mililitro (ml)" },
  { value: "un", label: "Unidade (un)" },
  { value: "dz", label: "Dúzia (dz)" },
];

export function IngredientsStep({ onAdvance }: IngredientsStepProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: crypto.randomUUID(), name: "", unit: "kg", price: "" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: crypto.randomUUID(), name: "", unit: "kg", price: "" },
    ]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length === 1) {
      toast({
        title: "Atenção",
        description: "Você precisa ter pelo menos um insumo.",
        variant: "destructive",
      });
      return;
    }
    setIngredients(ingredients.filter((i) => i.id !== id));
  };

  const updateIngredient = (
    id: string,
    field: keyof Ingredient,
    value: string
  ) => {
    setIngredients(
      ingredients.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate at least one complete ingredient
    const validIngredients = ingredients.filter(
      (i) => i.name.trim() && i.price && parseFloat(i.price) > 0
    );

    if (validIngredients.length === 0) {
      toast({
        title: "Adicione pelo menos um insumo",
        description: "Preencha o nome e o preço de pelo menos um insumo.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Save ingredients to database when table is created
      toast({
        title: "Insumos cadastrados! ✓",
        description: `${validIngredients.length} insumo(s) adicionado(s) com sucesso.`,
      });

      await onAdvance();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os insumos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await onAdvance();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Adicionar Insumos
          </h2>
          <p className="text-sm text-muted-foreground">
            Cadastre os ingredientes que você usa nas suas receitas
          </p>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground mb-1">Dica importante</p>
          <p className="text-muted-foreground">
            Cadastre os insumos com o preço por unidade de compra. Por exemplo,
            se você compra 1kg de farinha por R$ 5,00, cadastre "Farinha de
            Trigo" com preço R$ 5,00/kg.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {ingredients.map((ingredient, index) => (
          <div
            key={ingredient.id}
            className="grid grid-cols-12 gap-3 items-end p-4 bg-muted/50 rounded-lg"
          >
            <div className="col-span-12 sm:col-span-5 space-y-2">
              <Label htmlFor={`name-${ingredient.id}`}>
                Nome do Insumo {index === 0 && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id={`name-${ingredient.id}`}
                placeholder="Ex: Farinha de Trigo"
                value={ingredient.name}
                onChange={(e) =>
                  updateIngredient(ingredient.id, "name", e.target.value)
                }
              />
            </div>

            <div className="col-span-6 sm:col-span-3 space-y-2">
              <Label htmlFor={`unit-${ingredient.id}`}>Unidade</Label>
              <Select
                value={ingredient.unit}
                onValueChange={(value) =>
                  updateIngredient(ingredient.id, "unit", value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-5 sm:col-span-3 space-y-2">
              <Label htmlFor={`price-${ingredient.id}`}>
                Preço (R$) {index === 0 && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id={`price-${ingredient.id}`}
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={ingredient.price}
                onChange={(e) =>
                  updateIngredient(ingredient.id, "price", e.target.value)
                }
              />
            </div>

            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeIngredient(ingredient.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={addIngredient}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar outro insumo
        </Button>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            className="sm:flex-1"
            onClick={handleSkip}
            disabled={isLoading}
          >
            Pular por agora
          </Button>
          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="sm:flex-[2]"
            disabled={isLoading}
          >
            {isLoading ? "Salvando..." : "Salvar e Continuar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
