import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  const { toast } = useToast();

  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePlaceholderLink = (e: React.MouseEvent<HTMLAnchorElement>, label: string) => {
    e.preventDefault();
    toast({
      title: label,
      description: "Esta página estará disponível em breve.",
    });
  };

  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container px-4 mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="mb-4 inline-block">
              <Logo size="sm" showText />
            </Link>
            <p className="text-muted-foreground max-w-md leading-relaxed mb-4">
              Saiba exatamente quanto você lucra em cada venda no iFood e no balcão.
            </p>
            <a 
              href="https://wa.me/5547996887776?text=Oi!%20Preciso%20de%20ajuda%20com%20o%20Precify" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors font-medium text-sm"
            >
              💬 Precisa de ajuda? Chama no Zap
            </a>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">Produto</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="#funcionalidades" 
                  onClick={(e) => handleSmoothScroll(e, "funcionalidades")}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Funcionalidades
                </a>
              </li>
              <li>
                <a 
                  href="#precos" 
                  onClick={(e) => handleSmoothScroll(e, "precos")}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Planos
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">Suporte</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="#" 
                  onClick={(e) => handlePlaceholderLink(e, "Central de Ajuda")}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Central de Ajuda
                </a>
              </li>
              <li>
                <a 
                  href="mailto:precify.br@gmail.com" 
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  precify.br@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PRECIFY. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6">
            <a 
              href="#" 
              onClick={(e) => handlePlaceholderLink(e, "Termos de Uso")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Termos de Uso
            </a>
            <a 
              href="#" 
              onClick={(e) => handlePlaceholderLink(e, "Política de Privacidade")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Política de Privacidade
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
