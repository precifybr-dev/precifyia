import { cn } from "@/lib/utils";

const PRESET_COLORS = [
  { value: "#ef4444", label: "Vermelho" },     // Carnes
  { value: "#f97316", label: "Laranja" },      // Temperos
  { value: "#eab308", label: "Amarelo" },      // Laticínios
  { value: "#22c55e", label: "Verde" },        // Vegetais
  { value: "#06b6d4", label: "Ciano" },        // Frutos do mar
  { value: "#3b82f6", label: "Azul" },         // Bebidas
  { value: "#8b5cf6", label: "Roxo" },         // Doces
  { value: "#ec4899", label: "Rosa" },         // Sobremesas
  { value: "#78716c", label: "Cinza" },        // Outros
];

interface ColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {/* Opção "sem cor" */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(null)}
        className={cn(
          "w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center",
          "hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
          !value 
            ? "border-primary ring-2 ring-primary/20" 
            : "border-border bg-muted"
        )}
        title="Sem cor"
      >
        {!value && (
          <div className="w-2 h-2 rounded-full bg-primary" />
        )}
      </button>
      
      {PRESET_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(color.value)}
          className={cn(
            "w-6 h-6 rounded-full border-2 transition-all",
            "hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed",
            value === color.value 
              ? "border-foreground ring-2 ring-primary/20 scale-110" 
              : "border-transparent"
          )}
          style={{ backgroundColor: color.value }}
          title={color.label}
        />
      ))}
    </div>
  );
}

interface ColorDotProps {
  color: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}

export function ColorDot({ color, size = "sm", className }: ColorDotProps) {
  if (!color) return null;
  
  const sizeClasses = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
  };
  
  return (
    <span 
      className={cn(
        "rounded-full shrink-0",
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: color }}
    />
  );
}

export { PRESET_COLORS };
