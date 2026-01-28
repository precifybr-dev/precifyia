import { useState, useEffect } from "react";
import { useImpersonation } from "@/hooks/useImpersonation";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Clock, AlertTriangle, Eye, Timer } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function ImpersonationBanner() {
  const { 
    isImpersonating, 
    impersonatedUser, 
    adminInfo,
    endImpersonation, 
    getSessionDuration,
    getRemainingTime,
    isLoading,
    actionsLog,
  } = useImpersonation();
  
  const [duration, setDuration] = useState(0);
  const [remaining, setRemaining] = useState(30);

  // Update duration every minute
  useEffect(() => {
    if (!isImpersonating) return;
    
    setDuration(getSessionDuration());
    setRemaining(getRemainingTime());
    
    const interval = setInterval(() => {
      setDuration(getSessionDuration());
      setRemaining(getRemainingTime());
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [isImpersonating, getSessionDuration, getRemainingTime]);

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  const handleExit = () => {
    endImpersonation(false, 'manual');
  };

  const progressPercent = Math.max(0, (remaining / 30) * 100);
  const isLowTime = remaining <= 5;
  const blockedActionsCount = actionsLog.filter(a => a.blocked).length;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg">
      <div className="container mx-auto px-4 py-2">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Warning icon and main message */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
              <Eye className="h-4 w-4" />
              <span className="font-bold text-sm uppercase tracking-wide">
                Somente Leitura
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" />
              <span>
                Alterações desativadas
              </span>
            </div>
          </div>

          {/* User info and controls */}
          <div className="flex items-center gap-4">
            {/* Session info */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="opacity-75">Conta:</span>
                <span className="font-semibold">{impersonatedUser.email}</span>
              </div>
              
              <div className="hidden sm:flex items-center gap-2">
                <Timer className={`h-3.5 w-3.5 ${isLowTime ? 'animate-pulse' : ''}`} />
                <span className={isLowTime ? 'text-red-100 font-bold' : ''}>
                  {Math.floor(remaining)} min restantes
                </span>
              </div>

              {blockedActionsCount > 0 && (
                <div className="hidden lg:flex items-center gap-1.5 bg-white/20 px-2 py-0.5 rounded">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-xs">{blockedActionsCount} ações bloqueadas</span>
                </div>
              )}
            </div>

            {/* Exit button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleExit}
              disabled={isLoading}
              className="bg-white/90 hover:bg-white text-orange-700 border-white hover:border-white font-semibold"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sair do modo suporte
            </Button>
          </div>
        </div>

        {/* Progress bar for remaining time */}
        <div className="mt-2">
          <Progress 
            value={progressPercent} 
            className={`h-1 bg-white/30 ${isLowTime ? '[&>div]:bg-red-300' : '[&>div]:bg-white/80'}`}
          />
        </div>

        {/* Mobile: show additional info */}
        <div className="md:hidden text-xs text-center mt-1 opacity-90">
          Admin: {adminInfo?.email} | {duration} min de sessão
        </div>
      </div>
    </div>
  );
}
