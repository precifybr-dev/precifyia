import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface SupportConsentButtonProps {
  ticketId?: string;
  onConsentGranted?: () => void;
}

export function SupportConsentButton({ ticketId, onConsentGranted }: SupportConsentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);

  const handleGrantConsent = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("support_consent").insert({
        user_id: user.id,
        ticket_id: ticketId || null,
        granted_ip: null, // Will be filled by edge function if needed
        user_agent: navigator.userAgent,
        metadata: {
          grantedFrom: window.location.pathname,
          browserInfo: {
            language: navigator.language,
            platform: navigator.platform,
          }
        }
      });

      if (error) throw error;

      setHasConsent(true);
      setIsOpen(false);
      
      toast({
        title: "Consentimento concedido",
        description: "A equipe de suporte pode agora acessar sua conta em modo somente leitura por 24 horas.",
      });

      onConsentGranted?.();
    } catch (error: any) {
      console.error("Error granting consent:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao conceder consentimento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeConsent = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("support_consent")
        .update({ 
          is_active: false, 
          revoked_at: new Date().toISOString() 
        })
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (error) throw error;

      setHasConsent(false);
      
      toast({
        title: "Consentimento revogado",
        description: "A equipe de suporte não pode mais acessar sua conta.",
      });
    } catch (error: any) {
      console.error("Error revoking consent:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao revogar consentimento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (hasConsent) {
    return (
      <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
        <Check className="h-4 w-4 text-success" />
        <span className="text-sm text-success font-medium">Acesso de suporte autorizado</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRevokeConsent}
          disabled={isLoading}
          className="ml-auto text-muted-foreground hover:text-destructive"
        >
          Revogar
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <Shield className="h-4 w-4" />
        Autorizar acesso de suporte
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Autorizar Acesso de Suporte
            </DialogTitle>
            <DialogDescription>
              Ao autorizar, você permite que nossa equipe de suporte acesse sua conta em modo <strong>somente leitura</strong> para ajudar a resolver seu problema.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">O que o suporte pode fazer:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Visualizar suas configurações e dados</li>
                  <li>• Navegar pela sua conta para diagnóstico</li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-success/5 border border-success/20 rounded-lg">
              <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Proteções ativas:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Nenhuma alteração pode ser feita</li>
                  <li>• Todas as ações são registradas</li>
                  <li>• Acesso expira em 24 horas</li>
                  <li>• Você pode revogar a qualquer momento</li>
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGrantConsent} disabled={isLoading}>
              {isLoading ? "Autorizando..." : "Autorizar Acesso"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
