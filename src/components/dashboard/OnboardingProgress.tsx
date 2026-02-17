import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, 
  Package, 
  FileSpreadsheet, 
  Check, 
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

type StepStatus = "completed" | "pending" | "action-needed";

type OnboardingStep = {
  id: string;
  icon: typeof Building2;
  title: string;
  description: string;
  status: StepStatus;
  path: string;
  actionLabel: string;
};

type OnboardingProgressProps = {
  profile: any;
  userId: string;
  storeId?: string;
  storeName?: string;
};

export default function OnboardingProgress({ profile, userId, storeId, storeName }: OnboardingProgressProps) {
  const [ingredientsCount, setIngredientsCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCounts = async () => {
      // Fetch ingredients count (filtered by store)
      let ingQuery = supabase
        .from("ingredients")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (storeId) ingQuery = ingQuery.eq("store_id", storeId);
      const { count: ingCount } = await ingQuery;

      setIngredientsCount(ingCount || 0);

      // For now, recipes don't exist yet, so count is 0
      setRecipesCount(0);
      
      setIsLoading(false);
    };

    if (userId) {
      fetchCounts();
    }
  }, [userId, storeId]);

  const getBusinessStatus = (): StepStatus => {
    if (profile?.business_name && profile?.business_type) {
      return "completed";
    }
    return "action-needed";
  };

  const getIngredientsStatus = (): StepStatus => {
    if (ingredientsCount >= 5) return "completed";
    if (ingredientsCount > 0) return "pending";
    return "action-needed";
  };

  const getRecipesStatus = (): StepStatus => {
    if (recipesCount >= 1) return "completed";
    return "pending";
  };

  const steps: OnboardingStep[] = [
    {
      id: "business",
      icon: Building2,
      title: "Configurar Negócio",
      description: getBusinessStatus() === "completed" 
        ? `${storeName || profile?.business_name} configurado` 
        : "Configure os dados do seu negócio",
      status: getBusinessStatus(),
      path: "/business",
      actionLabel: getBusinessStatus() === "completed" ? "Editar" : "Configurar",
    },
    {
      id: "ingredients",
      icon: Package,
      title: "Cadastrar Insumos",
      description: ingredientsCount > 0 
        ? `${ingredientsCount} insumo${ingredientsCount > 1 ? "s" : ""} cadastrado${ingredientsCount > 1 ? "s" : ""}` 
        : "Adicione os ingredientes das receitas",
      status: getIngredientsStatus(),
      path: "/ingredients",
      actionLabel: ingredientsCount > 0 ? "Ver insumos" : "Adicionar",
    },
    {
      id: "recipes",
      icon: FileSpreadsheet,
      title: "Criar Fichas Técnicas",
      description: recipesCount > 0 
        ? `${recipesCount} ficha${recipesCount > 1 ? "s" : ""} técnica${recipesCount > 1 ? "s" : ""}` 
        : "Monte as receitas dos seus produtos",
      status: getRecipesStatus(),
      path: "/recipes",
      actionLabel: recipesCount > 0 ? "Ver fichas" : "Criar ficha",
    },
  ];

  const completedSteps = steps.filter(s => s.status === "completed").length;
  const progressPercentage = Math.round((completedSteps / steps.length) * 100);

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return (
          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
            <Check className="w-4 h-4 text-success" />
          </div>
        );
      case "action-needed":
        return (
          <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-warning" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6 shadow-card animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4" />
        <div className="h-2 bg-muted rounded w-full mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-lg text-foreground">
            Progresso do Cadastro
          </h3>
          <p className="text-sm text-muted-foreground">
            {completedSteps === steps.length 
              ? "Parabéns! Tudo configurado 🎉" 
              : `${completedSteps} de ${steps.length} etapas concluídas`}
          </p>
        </div>
        <div className="text-2xl font-bold text-primary">
          {progressPercentage}%
        </div>
      </div>

      <Progress value={progressPercentage} className="h-2 mb-6" />

      <div className="space-y-3">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`flex items-center gap-4 p-4 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 ${
              step.status === "completed" 
                ? "border-success/30 bg-success/5" 
                : step.status === "action-needed"
                ? "border-warning/30 bg-warning/5"
                : "border-border"
            }`}
            onClick={() => navigate(step.path)}
          >
            {getStatusIcon(step.status)}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <step.icon className="w-4 h-4 text-muted-foreground" />
                <h4 className={`font-medium ${step.status === "completed" ? "text-success" : "text-foreground"}`}>
                  {step.title}
                </h4>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {step.description}
              </p>
            </div>

            <Button 
              variant={step.status === "action-needed" ? "default" : "outline"} 
              size="sm"
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                navigate(step.path);
              }}
            >
              {step.actionLabel}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
