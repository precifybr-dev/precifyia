import { useState, useEffect } from "react";
import { useImpersonation } from "@/hooks/useImpersonation";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Clock, AlertTriangle } from "lucide-react";

export function ImpersonationBanner() {
  const { 
    isImpersonating, 
    impersonatedUser, 
    adminInfo,
    endImpersonation, 
    getSessionDuration,
    isLoading 
  } = useImpersonation();
  
  const [duration, setDuration] = useState(0);

  // Update duration every minute
  useEffect(() => {
    if (!isImpersonating) return;
    
    setDuration(getSessionDuration());
    const interval = setInterval(() => {
      setDuration(getSessionDuration());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [isImpersonating, getSessionDuration]);

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  const handleExit = () => {
    endImpersonation(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 shadow-lg">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Warning icon and main message */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-amber-600/30 px-3 py-1 rounded-full">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-bold text-sm uppercase tracking-wide">
                Modo suporte ativo
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" />
              <span>
                Você está acessando como administrador
              </span>
            </div>
          </div>

          {/* User info and controls */}
          <div className="flex items-center gap-4">
            {/* Session info */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="opacity-75">Usuário:</span>
                <span className="font-semibold">{impersonatedUser.email}</span>
              </div>
              
              <div className="hidden sm:flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>{duration} min</span>
              </div>
            </div>

            {/* Exit button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExit}
              disabled={isLoading}
              className="bg-white/90 hover:bg-white text-amber-950 border-amber-600 hover:border-amber-700 font-semibold"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sair do modo suporte
            </Button>
          </div>
        </div>

        {/* Mobile: show admin info */}
        <div className="md:hidden text-xs text-center mt-1 opacity-75">
          Admin: {adminInfo?.email} | Ações críticas bloqueadas
        </div>
      </div>
    </div>
  );
}
