import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Logo } from "@/components/ui/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useUserSecurity } from "@/hooks/useUserSecurity";
import { useToast } from "@/hooks/use-toast";

type Step = "password" | "mfa-send" | "mfa-verify" | "complete";

export default function SecurityCheck() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<Step>("password");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);

  const { security, isLoading: securityLoading, sendMfaCode, verifyMfaCode, updatePassword, logAccess } = useUserSecurity(user?.id);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
        return;
      }
      setUser(session.user);
    };
    checkUser();
  }, [navigate]);

  useEffect(() => {
    if (security && !securityLoading) {
      // Determinar etapa inicial
      if (security.mustChangePassword) {
        setStep("password");
      } else if ((security.isMaster || security.isFinanceiro) && security.mfaEnabled && !security.mfaVerified) {
        setStep("mfa-send");
      } else if (!security.mustChangePassword && ((!security.isMaster && !security.isFinanceiro) || security.mfaVerified)) {
        // Tudo OK, redirecionar
        handleComplete();
      }
    }
  }, [security, securityLoading]);

  const handlePasswordChange = async () => {
    if (newPassword.length < 8) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter no mínimo 8 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "A confirmação de senha deve ser igual à nova senha.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const success = await updatePassword(newPassword);
    setIsLoading(false);

    if (success) {
      await logAccess("password_changed", true);
      
      // Verificar se precisa de MFA
      if (security?.isMaster || security?.isFinanceiro) {
        setStep("mfa-send");
      } else {
        handleComplete();
      }
    }
  };

  const handleSendMfa = async () => {
    if (!user?.email) return;

    setIsLoading(true);
    const result = await sendMfaCode(user.email);
    setIsLoading(false);

    if (result.success) {
      if (result.devCode) {
        setDevCode(result.devCode);
      }
      setStep("mfa-verify");
    }
  };

  const handleVerifyMfa = async () => {
    if (mfaCode.length !== 6) return;

    setIsLoading(true);
    const success = await verifyMfaCode(mfaCode);
    setIsLoading(false);

    if (success) {
      await logAccess("mfa_verified", true);
      handleComplete();
    }
  };

  const handleComplete = async () => {
    await logAccess("login_complete", true);
    
    // Import function to determine redirect based on role
    const { determineLoginRedirect } = await import("@/hooks/useUserRole");
    const redirectPath = await determineLoginRedirect(user!.id);
    navigate(redirectPath);
  };

  if (securityLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText />
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Verificação de Segurança
          </CardTitle>
          <CardDescription>
            {step === "password" && "Por favor, altere sua senha para continuar."}
            {step === "mfa-send" && "Verificação em duas etapas necessária."}
            {step === "mfa-verify" && "Digite o código enviado para seu email."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === "password" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button 
                onClick={handlePasswordChange} 
                className="w-full" 
                disabled={isLoading || !newPassword || !confirmPassword}
              >
                {isLoading ? "Alterando..." : "Alterar Senha"}
              </Button>
            </div>
          )}

          {step === "mfa-send" && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Enviaremos um código de verificação para:
              </p>
              <p className="font-medium">{user?.email}</p>
              <Button onClick={handleSendMfa} className="w-full" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar Código"}
              </Button>
            </div>
          )}

          {step === "mfa-verify" && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={setMfaCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {devCode && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-center">
                  <p className="text-xs text-warning font-medium">Modo Desenvolvimento</p>
                  <p className="text-lg font-mono font-bold">{devCode}</p>
                </div>
              )}

              <Button 
                onClick={handleVerifyMfa} 
                className="w-full" 
                disabled={isLoading || mfaCode.length !== 6}
              >
                {isLoading ? "Verificando..." : "Verificar Código"}
              </Button>

              <Button
                variant="ghost"
                onClick={handleSendMfa}
                className="w-full text-sm"
                disabled={isLoading}
              >
                Reenviar código
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
