import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(6, "A senha deve ter no mínimo 6 caracteres")
  .max(72, "A senha deve ter no máximo 72 caracteres");

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null);
  const [resetComplete, setResetComplete] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // The user should have a session from clicking the recovery link
      if (session) {
        setIsValidSession(true);
      } else {
        // Listen for the password recovery event
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
              setIsValidSession(true);
            }
          }
        );

        // Give it a moment to process the recovery token from URL
        setTimeout(() => {
          if (isValidSession === null) {
            setIsValidSession(false);
          }
        }, 2000);

        return () => subscription.unsubscribe();
      }
    };

    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate password
    const validation = passwordSchema.safeParse(password);
    if (!validation.success) {
      toast({
        title: "Senha inválida",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      toast({
        title: "Senhas não conferem",
        description: "As senhas digitadas devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          title: "Erro ao redefinir senha",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setResetComplete(true);
        
        // Sign out to force re-login with new password
        await supabase.auth.signOut();
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground">Verificando link...</p>
        </div>
      </div>
    );
  }

  // Invalid or expired link
  if (isValidSession === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-4 text-foreground">
            Link inválido ou expirado
          </h1>
          <p className="text-muted-foreground mb-8">
            O link de recuperação de senha é inválido ou já expirou. Solicite um novo link para redefinir sua senha.
          </p>
          <div className="flex flex-col gap-3">
            <Link to="/forgot-password">
              <Button variant="hero" className="w-full">
                Solicitar novo link
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" className="w-full">
                Voltar ao login
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Password reset complete
  if (resetComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-4 text-foreground">
            Senha redefinida!
          </h1>
          <p className="text-muted-foreground mb-8">
            Sua senha foi alterada com sucesso. Agora você pode fazer login com sua nova senha.
          </p>
          <Link to="/login">
            <Button variant="hero" className="w-full">
              Fazer login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <Link to="/" className="mb-6 inline-block">
            <Logo size="md" showText />
          </Link>
          <h1 className="font-display text-3xl font-bold mb-2 text-foreground">
            Redefinir senha
          </h1>
          <p className="text-muted-foreground">
            Digite sua nova senha abaixo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-12"
                minLength={6}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Digite novamente a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10 h-12"
                minLength={6}
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Redefinindo..." : "Redefinir senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
