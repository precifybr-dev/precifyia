import { useImpersonation } from "@/hooks/useImpersonation";
import { Button } from "@/components/ui/button";
import { Shield, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ImpersonationBanner() {
  const { 
    isImpersonating, 
    impersonatedUser, 
    sessionStartedAt,
    endImpersonation 
  } = useImpersonation();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  const sessionDuration = sessionStartedAt 
    ? formatDistanceToNow(new Date(sessionStartedAt), { locale: ptBR })
    : null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-warning text-warning-foreground py-3 px-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-bold">Modo suporte ativo</span>
            <span className="hidden sm:inline">–</span>
            <span>você está acessando como administrador</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end text-xs">
            <span>Visualizando: <strong>{impersonatedUser.email}</strong></span>
            {sessionDuration && (
              <span className="opacity-75">Sessão iniciada há {sessionDuration}</span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={endImpersonation}
            className="bg-background hover:bg-muted text-foreground border gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Sair do Modo Suporte</span>
            <span className="sm:hidden">Sair</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
