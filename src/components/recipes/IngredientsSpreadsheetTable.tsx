import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IngredientSelector, type IngredientData } from "@/components/recipes/IngredientSelector";
import { ColorDot } from "@/components/ui/color-picker";
import { Plus, Trash2 } from "lucide-react";

interface RecipeIngredient {
  id: string;
  ingredientId: string | null;
  ingredientCode: number | null;
  name: string;
  quantity: string;
  unit: string;
  unitPrice: number;
  baseUnit: string;
  cost: number;
  color: string | null;
  correctionFactor?: number | null;
}

interface IngredientsSpreadsheetTableProps {
  ingredients: IngredientData[];
  recipeIngredients: RecipeIngredient[];
  onSelectIngredient: (index: number, ingredient: IngredientData) => void;
  onQuantityChange: (index: number, value: string) => void;
  onUnitChange: (index: number, unit: string) => void;
  onAddRow: () => void;
  onRemoveRow: (index: number) => void;
}

const units = [
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "L" },
  { value: "un", label: "un" },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function IngredientsSpreadsheetTable({
  ingredients,
  recipeIngredients,
  onSelectIngredient,
  onQuantityChange,
  onUnitChange,
  onAddRow,
  onRemoveRow,
}: IngredientsSpreadsheetTableProps) {
  return (
    <div className="space-y-2">
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary dark:bg-primary hover:bg-primary dark:hover:bg-primary">
                <TableHead className="text-primary-foreground font-medium text-xs w-16">Código</TableHead>
                <TableHead className="text-primary-foreground font-medium text-xs min-w-[160px]">INGREDIENTES</TableHead>
                <TableHead className="text-primary-foreground font-medium text-xs w-20 text-center">QTD LIQ</TableHead>
                <TableHead className="text-primary-foreground font-medium text-xs w-16 text-center">UND</TableHead>
                <TableHead className="text-primary-foreground font-medium text-xs w-16 text-center">FAT.C</TableHead>
                <TableHead className="text-primary-foreground font-medium text-xs w-24 text-right">CUSTO UN</TableHead>
                <TableHead className="text-primary-foreground font-medium text-xs w-20 text-right">CUSTO</TableHead>
                <TableHead className="w-8"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipeIngredients.map((ing, index) => (
                <TableRow 
                  key={ing.id}
                  className={index % 2 === 0 ? "bg-card hover:bg-muted/50" : "bg-muted/30 hover:bg-muted/50"}
                >
                  {/* Código com cor */}
                  <TableCell className="font-mono">
                    {ing.ingredientCode ? (
                      <div className="flex items-center gap-1.5">
                        <ColorDot color={ing.color} size="sm" />
                        <span className="font-semibold">{ing.ingredientCode}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-muted" />
                        <span className="text-muted-foreground">—</span>
                      </div>
                    )}
                  </TableCell>

                  {/* Seletor de ingrediente */}
                  <TableCell className="p-1">
                    <IngredientSelector
                      ingredients={ingredients}
                      onSelect={(selected) => onSelectIngredient(index, selected)}
                      selectedId={ing.ingredientId || undefined}
                      placeholder="Buscar..."
                    />
                  </TableCell>

                  {/* Quantidade */}
                  <TableCell className="p-1">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={ing.quantity}
                      onChange={(e) => onQuantityChange(index, e.target.value)}
                      className="h-7 text-center font-mono text-xs"
                    />
                  </TableCell>

                  {/* Unidade */}
                  <TableCell className="p-1">
                    <Select
                      value={ing.unit}
                      onValueChange={(value) => onUnitChange(index, value)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {u.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Fator de Correção */}
                  <TableCell className="text-center font-mono text-sm text-muted-foreground">
                    {ing.correctionFactor?.toFixed(2) || "1.00"}
                  </TableCell>

                  {/* Custo Unitário */}
                  <TableCell className="text-right font-mono text-sm text-muted-foreground">
                    {ing.unitPrice > 0 ? `${formatCurrency(ing.unitPrice)}/${ing.baseUnit}` : "—"}
                  </TableCell>

                  {/* Custo Total */}
                  <TableCell className="text-right font-mono font-semibold text-sm">
                    <span className={ing.cost > 0 ? "text-primary" : "text-muted-foreground"}>
                      {formatCurrency(ing.cost)}
                    </span>
                  </TableCell>

                  {/* Botão de remover */}
                  <TableCell className="p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onRemoveRow(index)}
                      disabled={recipeIngredients.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-dashed w-full"
        onClick={onAddRow}
      >
        <Plus className="w-4 h-4 mr-2" />
        Adicionar ingrediente
      </Button>
    </div>
  );
}
