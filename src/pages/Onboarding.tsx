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
    toast({ title: "Logout realizado", description: "Até logo!" });
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

  const isBusiness = currentStep === "business";

  return (
    <div className="min-h-screen bg-background">
      {/* Header - minimal during business wizard */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link to="/">
              <Logo size="lg" showText />
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground hidden sm:inline max-w-[120px] truncate">
                {user?.email}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Only show macro stepper for non-business steps */}
        {!isBusiness && (
          <>
            <div className="text-center mb-6">
              <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                Continue a configuração 🚀
              </h1>
              <p className="text-sm text-muted-foreground">Falta pouco para começar!</p>
            </div>
            <div className="mb-8">
              <OnboardingStepper currentStep={currentStep} />
            </div>
          </>
        )}

        <div className="animate-in fade-in duration-300">
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
