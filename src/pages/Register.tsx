import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Turnstile } from "react-turnstile";

import { lovable } from "@/integrations/lovable";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/ui/Logo";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";

const TURNSTILE_SITE_KEY = "1x00000000000000000000AA";

export default function Register() {
  const { trackEvent } = useFunnelTracking();
  // Force light mode on public pages - dark mode only for authenticated users
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    trackEvent("signup_started");
    
    return () => {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [boundTurnstile, setBoundTurnstile] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/secure-signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            email,
            password,
            full_name: name,
            business_name: businessName,
            turnstile_token: turnstileToken,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Erro ao criar conta",
          description: data.error || "Tente novamente mais tarde.",
          variant: "destructive",
        });
      } else {
        trackEvent("signup_completed");
        toast({
          title: "Solicitação recebida!",
          description: data.message || "Verifique seu email para confirmar a conta.",
        });
        navigate("/login");
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setTurnstileToken(null);
      boundTurnstile?.reset();
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth-callback`,
      });

      if (error) {
        toast({
          title: "Erro ao criar conta com Google",
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
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-primary/5 items-center justify-center p-12 border-r border-border">
        <div className="max-w-md">
          <Logo size="xl" showText={false} className="mb-8" />
          <h2 className="font-display text-2xl font-bold mb-4 text-foreground">
            Comece seu trial grátis
          </h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            7 dias para testar todas as funcionalidades. Sem cartão de crédito.
          </p>

          <div className="space-y-4">
            {[
              "Até 35 insumos cadastrados",
              "Até 3 fichas técnicas",
              "Dashboard completo",
              "Suporte por email"
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-success font-semibold text-sm">✓</span>
                </div>
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao início
          </Link>

          <div className="mb-8">
            <Link to="/" className="mb-6 inline-block lg:hidden">
              <Logo size="md" showText />
            </Link>
            <h1 className="font-display text-3xl font-bold mb-2 text-foreground">Criar sua conta</h1>
            <p className="text-muted-foreground">
              Preencha os dados para começar seu trial de 7 dias
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder="João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Nome do negócio</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Burger House"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

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
              <Label htmlFor="password">Senha</Label>
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

            <Turnstile
              sitekey={TURNSTILE_SITE_KEY}
              onVerify={(token, bt) => { setTurnstileToken(token); setBoundTurnstile(bt); }}
              onExpire={() => setTurnstileToken(null)}
              size="invisible"
            />

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading || isGoogleLoading}>
              {isLoading ? "Criando conta..." : "Criar conta grátis"}
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
              onClick={handleGoogleSignup}
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
              {isGoogleLoading ? "Conectando..." : "Criar conta com Google"}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6">
            Já tem uma conta?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Fazer login
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Ao criar uma conta, você concorda com nossos{" "}
            <a href="#" className="text-primary hover:underline">
              Termos de Uso
            </a>{" "}
            e{" "}
            <a href="#" className="text-primary hover:underline">
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
