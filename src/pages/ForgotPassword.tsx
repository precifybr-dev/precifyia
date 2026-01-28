import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido").max(255, "Email muito longo");

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    const validation = emailSchema.safeParse(email.trim());
    if (!validation.success) {
      toast({
        title: "Email inválido",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Erro ao enviar email",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEmailSent(true);
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

  if (emailSent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-4 text-foreground">
            Email enviado!
          </h1>
          <p className="text-muted-foreground mb-8">
            Se existe uma conta com o email <strong>{email}</strong>, você receberá um link para redefinir sua senha.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Não recebeu o email? Verifique sua pasta de spam ou tente novamente em alguns minutos.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              variant="outline"
              onClick={() => setEmailSent(false)}
              className="w-full"
            >
              Tentar outro email
            </Button>
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </Link>

        <div className="mb-8">
          <Link to="/" className="mb-6 inline-block">
            <Logo size="md" showText />
          </Link>
          <h1 className="font-display text-3xl font-bold mb-2 text-foreground">
            Esqueceu sua senha?
          </h1>
          <p className="text-muted-foreground">
            Digite seu email e enviaremos um link para redefinir sua senha.
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
                autoComplete="email"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="hero"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </form>

        <p className="text-center text-muted-foreground mt-6">
          Lembrou sua senha?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
