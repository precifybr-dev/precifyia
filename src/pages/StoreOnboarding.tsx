import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { 
  Store, 
  Package, 
  FileSpreadsheet, 
  Settings, 
  DollarSign, 
  Check, 
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/ui/Logo";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";

interface OnboardingStep {
  id: string;
  icon: typeof Package;
  title: string;
  description: string;
  path: string;
  isCompleted: boolean;
}

export default function StoreOnboarding() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { stores, activeStore, setActiveStore } = useStore();
  
  const [currentStore, setCurrentStore] = useState<typeof activeStore>(null);
  const [ingredientsCount, setIngredientsCount] = useState(0);
  const [recipesCount, setRecipesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStoreData = async () => {
      if (!storeId) {
        navigate("/app");
        return;
      }

      // Find the store
      const store = stores.find(s => s.id === storeId);
      if (!store) {
        navigate("/app");
        return;
      }

      setCurrentStore(store);
      
      // Set as active store
      if (activeStore?.id !== storeId) {
        setActiveStore(store);
      }

      // Fetch counts for this store
      const { count: ingCount } = await supabase
        .from("ingredients")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId);

      const { count: recCount } = await supabase
        .from("recipes")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeId);

      setIngredientsCount(ingCount || 0);
      setRecipesCount(recCount || 0);
      setIsLoading(false);
    };

    if (stores.length > 0) {
      loadStoreData();
    }
  }, [storeId, stores, activeStore, setActiveStore, navigate]);

  const steps: OnboardingStep[] = [
    {
      id: "ingredients",
      icon: Package,
      title: "Cadastrar Insumos",
      description: ingredientsCount > 0 
        ? `${ingredientsCount} insumo${ingredientsCount > 1 ? "s" : ""} cadastrado${ingredientsCount > 1 ? "s" : ""}` 
        : "Adicione os ingredientes que você usa nas receitas",
      path: "/ingredients",
      isCompleted: ingredientsCount >= 3,
    },
    {
      id: "recipes",
      icon: FileSpreadsheet,
      title: "Criar Fichas Técnicas",
      description: recipesCount > 0 
        ? `${recipesCount} ficha${recipesCount > 1 ? "s" : ""} técnica${recipesCount > 1 ? "s" : ""}` 
        : "Monte as receitas dos seus produtos",
      path: "/recipes",
      isCompleted: recipesCount >= 1,
    },
    {
      id: "business",
      icon: Settings,
      title: "Configurar Taxas",
      description: "Configure taxas do iFood, delivery e cardápio digital",
      path: "/business",
      isCompleted: false,
    },
    {
      id: "pricing",
      icon: DollarSign,
      title: "Precificar Produtos",
      description: "Defina os preços de venda com base nos custos",
      path: "/recipes",
      isCompleted: false,
    },
  ];

  // Sequential unlock: step is locked if previous step is not completed
  const stepsWithLock = steps.map((step, index) => ({
    ...step,
    isLocked: index > 0 && !steps[index - 1].isCompleted,
  }));

  const completedSteps = steps.filter(s => s.isCompleted).length;
  const progressPercentage = Math.round((completedSteps / steps.length) * 100);

  const handleStepClick = (path: string, isLocked: boolean) => {
    if (isLocked) return;
    navigate(path);
  };

  const handleSkipOnboarding = () => {
    navigate("/app");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/app">
              <Logo size="lg" showText />
            </Link>

            <Button variant="ghost" size="sm" onClick={handleSkipOnboarding}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Store Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
            <Store className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            {currentStore?.name} 🎉
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Sua nova loja foi criada! Complete os passos abaixo para configurar 
            tudo e começar a precificar com precisão.
          </p>
        </div>

        {/* Progress Card */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-card mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Progresso da Configuração
              </h3>
              <p className="text-sm text-muted-foreground">
                {completedSteps === steps.length 
                  ? "Tudo pronto! Sua loja está configurada 🎉" 
                  : `${completedSteps} de ${steps.length} etapas concluídas`}
              </p>
            </div>
            <div className="text-2xl font-bold text-primary">
              {progressPercentage}%
            </div>
          </div>
          
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Steps List */}
        <div className="space-y-3">
          {stepsWithLock.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                step.isLocked
                  ? "border-border opacity-50 cursor-not-allowed"
                  : step.isCompleted 
                    ? "border-success/30 bg-success/5 cursor-pointer hover:bg-muted/50" 
                    : "border-border hover:border-primary/30 cursor-pointer hover:bg-muted/50"
              }`}
              onClick={() => handleStepClick(step.path, step.isLocked)}
            >
              {/* Step Number / Status */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                step.isCompleted 
                  ? "bg-success text-success-foreground" 
                  : step.isLocked
                    ? "bg-muted text-muted-foreground"
                    : "bg-muted text-muted-foreground"
              }`}>
                {step.isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : step.isLocked ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <span className="font-semibold">{index + 1}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <step.icon className={`w-4 h-4 ${step.isCompleted ? "text-success" : step.isLocked ? "text-muted-foreground" : "text-primary"}`} />
                  <h4 className={`font-medium ${step.isCompleted ? "text-success" : step.isLocked ? "text-muted-foreground" : "text-foreground"}`}>
                    {step.title}
                  </h4>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {step.isLocked ? "Complete o passo anterior para desbloquear" : step.description}
                </p>
              </div>

              {/* Action Button */}
              <Button
                variant={step.isCompleted ? "outline" : "default"}
                size="sm"
                className="shrink-0"
                disabled={step.isLocked}
                onClick={(e) => {
                  e.stopPropagation();
                  handleStepClick(step.path, step.isLocked);
                }}
              >
                {step.isLocked ? (
                  <><Lock className="w-4 h-4 mr-1" /> Bloqueado</>
                ) : step.isCompleted ? (
                  <>Ver <ChevronRight className="w-4 h-4 ml-1" /></>
                ) : (
                  <>Iniciar <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Skip Button */}
        <div className="mt-8 text-center">
          <Button
            variant="ghost"
            onClick={handleSkipOnboarding}
            className="text-muted-foreground hover:text-foreground"
          >
            Pular configuração e ir ao Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}
