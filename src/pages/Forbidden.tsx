import { Link } from "react-router-dom";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <ShieldX className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">403</h1>
          <h2 className="text-xl font-semibold text-foreground mb-4">Acesso Negado</h2>
          <p className="text-muted-foreground mb-8">
            Você não tem permissão para acessar esta área. 
            Esta tentativa foi registrada por motivos de segurança.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link to="/" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar ao início
            </Link>
          </Button>
          <Button asChild>
            <Link to="/app" className="gap-2">
              <Home className="w-4 h-4" />
              Ir para o app
            </Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          Se você acredita que deveria ter acesso, entre em contato com o administrador.
        </p>
      </div>
    </div>
  );
}
