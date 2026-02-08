import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { detectCategoryMismatch } from "@/lib/cost-category-hints";

interface CategoryMismatchAlertProps {
  inputText: string;
  currentCategory: "despesas_fixas" | "despesas_variaveis" | "custos_fixos_producao" | "custos_variaveis_producao";
}

export default function CategoryMismatchAlert({ inputText, currentCategory }: CategoryMismatchAlertProps) {
  const mismatch = detectCategoryMismatch(inputText, currentCategory);

  if (!mismatch) return null;

  return (
    <Alert className="border-amber-500/50 bg-amber-500/10 text-foreground mt-2">
      <AlertTriangle className="h-4 w-4 !text-amber-500" />
      <AlertDescription className="text-sm">
        <strong className="text-amber-600">Atenção:</strong> {mismatch.message}
      </AlertDescription>
    </Alert>
  );
}
