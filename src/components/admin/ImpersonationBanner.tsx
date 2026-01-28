import { useImpersonation } from "@/hooks/useImpersonation";
import { Button } from "@/components/ui/button";
import { UserCog, X, ArrowLeft } from "lucide-react";

export function ImpersonationBanner() {
  const { isImpersonating, impersonatedUser, endImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-warning text-warning-foreground py-2 px-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCog className="h-5 w-5" />
          <div>
            <span className="font-semibold">Modo Suporte Ativado</span>
            <span className="mx-2">•</span>
            <span>Visualizando como: <strong>{impersonatedUser.email}</strong></span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={endImpersonation}
          className="hover:bg-warning/80 text-warning-foreground gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Sair do Modo Suporte
        </Button>
      </div>
    </div>
  );
}
