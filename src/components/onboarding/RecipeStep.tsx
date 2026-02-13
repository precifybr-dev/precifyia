import { useState } from "react";
import { FileSpreadsheet, Plus, Trash2, Calculator, AlertCircle, Link2, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface RecipeStepProps {
  onAdvance: () => Promise<void>;
}

interface RecipeIngredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  cost: string;
}

export function RecipeStep({ onAdvance }: RecipeStepProps) {
  const [recipeName, setRecipeName] = useState("");
  const [servings, setServings] = useState("1");
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([
    { id: crypto.randomUUID(), name: "", quantity: "", unit: "g", cost: "" },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const { toast } = useToast();

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: crypto.randomUUID(), name: "", quantity: "", unit: "g", cost: "" },
    ]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((i) => i.id !== id));
  };

  const updateIngredient = (
    id: string,
    field: keyof RecipeIngredient,
    value: string
  ) => {
    setIngredients(
      ingredients.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const totalCost = ingredients.reduce((sum, i) => {
    const cost = parseFloat(i.cost) || 0;
    return sum + cost;
  }, 0);

  const costPerServing = totalCost / (parseInt(servings) || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!recipeName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Preencha o nome da ficha técnica.",
        variant: "destructive",
      });
      return;
    }

    const validIngredients = ingredients.filter(
      (i) => i.name.trim() && i.quantity && parseFloat(i.cost) >= 0
    );

    if (validIngredients.length === 0) {
      toast({
        title: "Adicione ingredientes",
        description: "Preencha pelo menos um ingrediente com quantidade e custo.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Save recipe to database when table is created
      toast({
        title: "Ficha técnica criada! 🎉",
        description: "Sua primeira ficha técnica foi salva com sucesso.",
      });

      await onAdvance();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a ficha técnica.",
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
          <FileSpreadsheet className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Criar Ficha Técnica
          </h2>
          <p className="text-sm text-muted-foreground">
            Monte a receita do seu primeiro produto
          </p>
        </div>
      </div>

      {/* Import Tutorial - iFood */}
      <div className="space-y-4 mb-6">
        <div className="border-2 border-primary/20 bg-primary/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm sm:text-base">
                🍔 Vende no iFood? Importe seus produtos!
              </h3>
              <p className="text-xs text-muted-foreground">
                Puxe o cardápio do iFood automaticamente — sem digitar nada.
              </p>
            </div>
          </div>

          <div className="grid gap-2.5">
            {[
              { step: 1, emoji: "🌐", text: "Abra seu restaurante no iFood pelo navegador" },
              { step: 2, emoji: "📋", text: "Copie o link da página (ex: ifood.com.br/seu-restaurante)" },
              { step: 3, emoji: "✨", text: "Cole aqui e importamos seus produtos automaticamente" },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {item.step}
                </span>
                <span className="text-sm text-foreground">
                  <span className="mr-1">{item.emoji}</span> {item.text}
                </span>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            className="w-full gap-2 text-base"
            onClick={() => {
              window.location.href = "/app/recipes?openIfood=true";
            }}
          >
            <ExternalLink className="w-5 h-5" />
            Importar do iFood
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">ou crie manualmente</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Toggle manual form */}
        <button
          type="button"
          onClick={() => setShowManualForm(!showManualForm)}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showManualForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showManualForm ? "Ocultar formulário manual" : "Criar ficha técnica manualmente"}
        </button>
      </div>

      {showManualForm && (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-2 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-success shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Quase lá!</p>
            <p className="text-muted-foreground">
              Crie uma ficha técnica simples para começar. Você pode adicionar mais
              detalhes e receitas depois no dashboard.
            </p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="recipeName">
              Nome do Produto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="recipeName"
              placeholder="Ex: X-Bacon Especial"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="servings">Rendimento (porções)</Label>
            <Input
              id="servings"
              type="number"
              min="1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Ingredientes da Receita</Label>
          
          {ingredients.map((ingredient, index) => (
            <div
              key={ingredient.id}
              className="grid grid-cols-12 gap-2 items-end p-3 bg-muted/50 rounded-lg"
            >
              <div className="col-span-12 sm:col-span-4 space-y-1">
                <Label className="text-xs text-muted-foreground">Ingrediente</Label>
                <Input
                  placeholder="Nome"
                  value={ingredient.name}
                  onChange={(e) =>
                    updateIngredient(ingredient.id, "name", e.target.value)
                  }
                />
              </div>

              <div className="col-span-4 sm:col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Qtd</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={ingredient.quantity}
                  onChange={(e) =>
                    updateIngredient(ingredient.id, "quantity", e.target.value)
                  }
                />
              </div>

              <div className="col-span-3 sm:col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">Un</Label>
                <Input
                  placeholder="g"
                  value={ingredient.unit}
                  onChange={(e) =>
                    updateIngredient(ingredient.id, "unit", e.target.value)
                  }
                />
              </div>

              <div className="col-span-4 sm:col-span-3 space-y-1">
                <Label className="text-xs text-muted-foreground">Custo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={ingredient.cost}
                  onChange={(e) =>
                    updateIngredient(ingredient.id, "cost", e.target.value)
                  }
                />
              </div>

              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive h-9 w-9"
                  onClick={() => removeIngredient(ingredient.id)}
                  disabled={ingredients.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-dashed"
            onClick={addIngredient}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar ingrediente
          </Button>
        </div>

        {/* Cost Summary */}
        <div className="bg-primary/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <Calculator className="w-5 h-5" />
            <span className="font-medium">Resumo de Custos</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Custo Total</p>
              <p className="font-display text-2xl font-bold text-foreground">
                R$ {totalCost.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Custo por Porção</p>
              <p className="font-display text-2xl font-bold text-primary">
                R$ {costPerServing.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="submit"
            variant="success"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Finalizando..." : "Concluir Onboarding 🎉"}
          </Button>
        </div>
      </form>
      )}

      {/* Skip button always visible */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={handleSkip}
          disabled={isLoading}
        >
          Pular por agora → Ir ao Dashboard
        </Button>
      </div>
    </div>
  );
}
