import { useState, useEffect, useRef } from "react";
import { Search, Package, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { parseIngredientCode } from "@/lib/ingredient-utils";
import { cn } from "@/lib/utils";

export interface IngredientData {
  id: string;
  code: number;
  name: string;
  unit: string;
  unit_price: number | null;
  purchase_price: number;
  purchase_quantity: number;
}

interface IngredientSelectorProps {
  ingredients: IngredientData[];
  onSelect: (ingredient: IngredientData) => void;
  placeholder?: string;
  disabled?: boolean;
  selectedId?: string;
}

export function IngredientSelector({
  ingredients,
  onSelect,
  placeholder = "Buscar por código ou nome...",
  disabled = false,
  selectedId,
}: IngredientSelectorProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtra ingredientes por código ou nome
  const filteredIngredients = ingredients.filter((ing) => {
    if (!search.trim()) return true;
    
    const searchLower = search.toLowerCase().trim();
    const codeSearch = parseIngredientCode(search);
    
    // Busca por código
    if (codeSearch !== null) {
      const codeStr = ing.code.toString();
      const searchStr = codeSearch.toString();
      if (codeStr.startsWith(searchStr) || codeStr === searchStr) {
        return true;
      }
    }
    
    // Busca por nome
    return ing.name.toLowerCase().includes(searchLower);
  });

  // Reset highlight quando a lista muda
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredIngredients.length]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < filteredIngredients.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredIngredients[highlightedIndex]) {
          handleSelect(filteredIngredients[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (ingredient: IngredientData) => {
    onSelect(ingredient);
    setSearch("");
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const formatUnitPrice = (ing: IngredientData) => {
    const unitPrice = ing.unit_price ?? (ing.purchase_price / ing.purchase_quantity);
    return `R$ ${unitPrice.toFixed(2)}/${ing.unit}`;
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className="pl-9"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-64 overflow-auto">
          {filteredIngredients.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
              {search ? "Nenhum insumo encontrado" : "Nenhum insumo cadastrado"}
            </div>
          ) : (
            <div className="py-1">
              {filteredIngredients.map((ing, index) => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => handleSelect(ing)}
                  className={cn(
                    "w-full px-3 py-2 flex items-center gap-3 text-left transition-colors",
                    "hover:bg-muted",
                    index === highlightedIndex && "bg-muted",
                    selectedId === ing.id && "bg-primary/10"
                  )}
                >
                  <span className="font-mono text-sm text-primary font-semibold min-w-[2rem]">
                    {ing.code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {ing.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatUnitPrice(ing)}
                    </p>
                  </div>
                  {selectedId === ing.id && (
                    <Check className="w-4 h-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
