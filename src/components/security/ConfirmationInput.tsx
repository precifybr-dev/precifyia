import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmationInputProps {
  expectedValue: string;
  label?: string;
  placeholder?: string;
  onMatch: (isMatch: boolean) => void;
  className?: string;
}

export function ConfirmationInput({
  expectedValue,
  label = "Digite para confirmar",
  placeholder,
  onMatch,
  className,
}: ConfirmationInputProps) {
  const [value, setValue] = useState("");
  const isMatch = value.toUpperCase() === expectedValue.toUpperCase();

  useEffect(() => {
    onMatch(isMatch);
  }, [isMatch, onMatch]);

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-medium flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        {label}
      </Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder || `Digite "${expectedValue}" para confirmar`}
          className={cn(
            "pr-10 transition-colors",
            isMatch && "border-green-500 focus-visible:ring-green-500"
          )}
        />
        {isMatch && (
          <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Esta ação requer confirmação manual para evitar exclusões acidentais.
      </p>
    </div>
  );
}
