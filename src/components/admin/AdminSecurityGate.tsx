import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, AlertTriangle, Clock, Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSecurity } from "@/hooks/useAdminSecurity";

interface AdminSecurityGateProps {
  children: React.ReactNode;
}

export function AdminSecurityGate({ children }: AdminSecurityGateProps) {
  const navigate = useNavigate();
  const {
    isVerified,
    requiresMfa,
    role,
    isLoading,
    requestMfaCode,
    verifyMfaCode,
    logAdminAccess,
  } = useAdminSecurity();

  const [step, setStep] = useState<"initial" | "sending" | "verify">("initial");
  const [mfaCode, setMfaCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  useEffect(() => {
    const getEmail = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setUserEmail(session.user.email);
      }
    };
    getEmail();
  }, []);

  useEffect(() => {
    if (step === "verify" && remainingTime === null) {
      setRemainingTime(600);
    }
  }, [step, remainingTime]);

  useEffect(() => {
    if (remainingTime !== null && remainingTime > 0) {
      const timer = setInterval(() => {
        setRemainingTime((prev) => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
    } else if (remainingTime === 0) {
      setStep("initial");
      setMfaCode("");
      setDevCode(null);
      setRemainingTime(null);
    }
  }, [remainingTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendCode = async () => {
    if (!userEmail) return;

    setStep("sending");
    setIsSubmitting(true);

    await logAdminAccess("admin_mfa_requested", true, { role });

    const result = await requestMfaCode(userEmail);

    setIsSubmitting(false);

    if (result.success) {
      if (result.devCode) {
        setDevCode(result.devCode);
      }
      setStep("verify");
    } else {
      setStep("initial");
    }
  };

  const handleVerifyCode = async () => {
    if (mfaCode.length !== 6) return;

    setIsSubmitting(true);
    const success = await verifyMfaCode(mfaCode);
    setIsSubmitting(false);

    if (!success) {
      setMfaCode("");
    }
  };

  const handleGoBack = () => {
    navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Verificando segurança...</p>
        </div>
      </div>
    );
  }

  if (!requiresMfa || isVerified) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="flex items-center justify-center gap-2">
            <Fingerprint className="w-5 h-5" />
            Verificação de Segurança
          </CardTitle>
          <CardDescription>
            {step === "initial" && "Acesso ao painel administrativo requer verificação em duas etapas."}
            {step === "sending" && "Enviando código de verificação..."}
            {step === "verify" && "Digite o código enviado para seu email."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Acesso Restrito</p>
                <p className="text-muted-foreground mt-1">
                  Usuários com papel <Badge variant="outline">{role}</Badge> precisam verificar sua identidade a cada acesso ao painel administrativo.
                </p>
              </div>
            </div>
          </div>

          {step === "initial" && (
            <div className="space-y-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <Mail className="w-6 h-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Enviaremos um código para:
                </p>
                <p className="font-medium">{userEmail}</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleSendCode} className="w-full" disabled={isSubmitting}>
                  Enviar Código de Verificação
                </Button>
                <Button variant="outline" onClick={handleGoBack} className="w-full">
                  Voltar ao Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/login");
                  }} 
                  className="w-full text-destructive hover:text-destructive"
                >
                  Sair da conta
                </Button>
              </div>
            </div>
          )}

          {step === "sending" && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Enviando código...</p>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              {remainingTime !== null && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Código expira em {formatTime(remainingTime)}</span>
                </div>
              )}

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={mfaCode}
                  onChange={setMfaCode}
                  disabled={isSubmitting}
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
                  <p className="text-lg font-mono font-bold text-warning">{devCode}</p>
                </div>
              )}

              <Button
                onClick={handleVerifyCode}
                className="w-full"
                disabled={isSubmitting || mfaCode.length !== 6}
              >
                {isSubmitting ? "Verificando..." : "Verificar Código"}
              </Button>

              <div className="flex flex-col gap-2">
                <Button
                  variant="ghost"
                  onClick={handleSendCode}
                  className="w-full text-sm"
                  disabled={isSubmitting}
                >
                  Reenviar código
                </Button>
                <Button variant="outline" onClick={handleGoBack} className="w-full">
                  Voltar ao Dashboard
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={async () => {
                    await supabase.auth.signOut();
                    navigate("/login");
                  }} 
                  className="w-full text-destructive hover:text-destructive"
                >
                  Sair da conta
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
