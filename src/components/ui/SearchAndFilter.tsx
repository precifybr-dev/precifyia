import { useState, useEffect } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { PRESET_COLORS } from "@/components/ui/color-picker";

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortOption: string;
  onSortChange: (value: string) => void;
  selectedColor: string | null;
  onColorChange: (color: string | null) => void;
  // Optional features
  showCostSort?: boolean;
  showSellingSort?: boolean;
  showColorFilter?: boolean;
  // For beverages
  selectedCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
  showCategoryFilter?: boolean;
}

const BEVERAGE_CATEGORIES = [
  { value: "alcoolica", label: "Alcoólica" },
  { value: "refrigerante", label: "Refrigerante" },
  { value: "sucos", label: "Sucos" },
  { value: "agua", label: "Água" },
  { value: "outros", label: "Outros" },
];

export function SearchAndFilter({
  searchTerm,
  onSearchChange,
  sortOption,
  onSortChange,
  selectedColor,
  onColorChange,
  showCostSort = true,
  showSellingSort = false,
  showColorFilter = true,
  selectedCategory,
  onCategoryChange,
  showCategoryFilter = false,
}: SearchAndFilterProps) {
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [isOpen, setIsOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearchChange]);

  // Count active filters
  const activeFiltersCount = [
    sortOption !== "default",
    selectedColor !== null,
    selectedCategory !== null,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onSortChange("default");
    onColorChange(null);
    if (onCategoryChange) {
      onCategoryChange(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9 w-48 h-9 text-sm bg-background"
        />
        {localSearch && (
          <button
            onClick={() => {
              setLocalSearch("");
              onSearchChange("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Filter Button with Popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 h-9",
              activeFiltersCount > 0 && "border-primary text-primary"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            {/* Sort Options */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ordenar por
              </Label>
              <Select value={sortOption} onValueChange={onSortChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Padrão</SelectItem>
                  <SelectItem value="name-asc">Nome A-Z</SelectItem>
                  <SelectItem value="name-desc">Nome Z-A</SelectItem>
                  {showCostSort && (
                    <>
                      <SelectItem value="cost-asc">Custo: Menor → Maior</SelectItem>
                      <SelectItem value="cost-desc">Custo: Maior → Menor</SelectItem>
                    </>
                  )}
                  {showSellingSort && (
                    <>
                      <SelectItem value="selling-asc">Venda: Menor → Maior</SelectItem>
                      <SelectItem value="selling-desc">Venda: Maior → Menor</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Color Filter */}
            {showColorFilter && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Filtrar por cor
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {/* No color option */}
                  <button
                    type="button"
                    onClick={() => onColorChange(null)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center",
                      "hover:scale-110",
                      selectedColor === null
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border bg-muted"
                    )}
                    title="Todas as cores"
                  >
                    {selectedColor === null && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                  
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => onColorChange(color.value)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all",
                        "hover:scale-110",
                        selectedColor === color.value
                          ? "border-foreground ring-2 ring-primary/20 scale-110"
                          : "border-transparent"
                      )}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter (Beverages only) */}
            {showCategoryFilter && onCategoryChange && (
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Categoria
                </Label>
                <Select
                  value={selectedCategory || "all"}
                  onValueChange={(val) => onCategoryChange(val === "all" ? null : val)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {BEVERAGE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Clear Filters */}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={clearFilters}
              >
                <X className="w-4 h-4 mr-2" />
                Limpar filtros
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Export categories for use in other components
export { BEVERAGE_CATEGORIES };
