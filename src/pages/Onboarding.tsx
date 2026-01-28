import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";
import { BusinessConfigStep } from "@/components/onboarding/BusinessConfigStep";
import { IngredientsStep } from "@/components/onboarding/IngredientsStep";
import { RecipeStep } from "@/components/onboarding/RecipeStep";
import { useOnboarding } from "@/hooks/useOnboarding";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function Onboarding() {
  const { user, profile, isLoading, updateProfile, advanceToNextStep, currentStep } = useOnboarding();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/");
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">Erro ao carregar perfil</p>
          <Button onClick={() => navigate("/login")}>Voltar ao Login</Button>
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
            <Link to="/">
              <Logo size="lg" showText />
            </Link>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-semibold text-primary text-xs">
                    {user?.email?.[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="text-muted-foreground max-w-[150px] truncate">
                  {user?.email}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Welcome Message */}
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Bem-vindo ao PRECIFY! 👋
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Complete os passos abaixo para configurar seu negócio e começar a
            precificar com precisão.
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <OnboardingStepper currentStep={currentStep} />
        </div>

        {/* Current Step Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {currentStep === "business" && (
            <BusinessConfigStep
              profile={profile}
              onUpdate={updateProfile}
              onAdvance={advanceToNextStep}
            />
          )}

          {currentStep === "ingredients" && (
            <IngredientsStep onAdvance={advanceToNextStep} />
          )}

          {currentStep === "recipe" && (
            <RecipeStep onAdvance={advanceToNextStep} />
          )}
        </div>
      </main>
    </div>
  );
}
