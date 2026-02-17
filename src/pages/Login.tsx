import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/ui/Logo";
import { determineLoginRedirect } from "@/hooks/useUserRole";

export default function Login() {
  // Force light mode on public pages - dark mode only for authenticated users
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    
    return () => {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Erro ao entrar",
          description: error.message === "Invalid login credentials" 
            ? "Email ou senha incorretos" 
            : error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Verificar se precisa de verificação de segurança
      const { data: securityData } = await supabase
        .from("user_security")
        .select("must_change_password, mfa_enabled, mfa_verified")
        .eq("user_id", data.user.id)
        .maybeSingle();

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, is_protected")
        .eq("user_id", data.user.id)
        .eq("role", "master")
        .maybeSingle();

      const isMaster = roleData?.role === "master" && roleData?.is_protected;
      const needsPasswordChange = securityData?.must_change_password;
      const needsMfaVerification = isMaster && securityData?.mfa_enabled && !securityData?.mfa_verified;

      // Se precisa de verificação de segurança, redirecionar
      if (needsPasswordChange || needsMfaVerification) {
        navigate("/security-check");
        return;
      }

      // Determine redirect based on user role (master/collaborator vs end user)
      const redirectPath = await determineLoginRedirect(data.user.id);
      
      // For end users, also check onboarding status
      if (redirectPath === "/app") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_step")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (!profile || profile.onboarding_step !== "completed") {
          toast({
            title: "Login realizado!",
            description: "Complete o cadastro do seu negócio.",
          });
          navigate("/onboarding");
          return;
        }
      }

      toast({
        title: "Login realizado!",
        description: redirectPath === "/admin" 
          ? "Bem-vindo ao painel administrativo." 
          : "Bem-vindo de volta ao PRECIFY.",
      });

      navigate(redirectPath);
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

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth-callback`,
      });

      if (error) {
        toast({
          title: "Erro ao entrar com Google",
          description: error.message,
          variant: "destructive",
        });
        setIsGoogleLoading(false);
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">

      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>

          <div className="mb-8">
            <Link to="/" className="mb-6 inline-block">
              <Logo size="md" showText />
            </Link>
            <h1 className="font-display text-3xl font-bold mb-2 text-foreground">Bem-vindo de volta</h1>
            <p className="text-muted-foreground">
              Entre na sua conta para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12"
                  required
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

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-sm text-muted-foreground">
                ou
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full gap-3"
              onClick={handleGoogleLogin}
              disabled={isLoading || isGoogleLoading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isGoogleLoading ? "Conectando..." : "Continuar com Google"}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6">
            Não tem uma conta?{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              Criar conta grátis
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12 border-l border-border">
        <div className="max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <Logo size="xl" showText={false} />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">
            Precifique com precisão
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Acesse seus dados de precificação, fichas técnicas e dashboards 
            de qualquer lugar, a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
}
