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
                <Link 
                  to="/ajuda"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Central de Ajuda
                </Link>
              </li>
              <li>
                <a 
                  href="https://wa.me/5547996887776" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Falar no WhatsApp
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">Redes Sociais</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href="https://www.instagram.com/precifyia/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                  @precifyia
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>© {new Date().getFullYear()} TA ON - Precify Tecnologia LTDA. Todos os direitos reservados.</p>
            <p>CNPJ: 48.245.923/0001-30</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link to="/termos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Privacidade
            </Link>
            <Link to="/politica-antifraude" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Antifraude
            </Link>
            <Link to="/cancelamento" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancelamento
            </Link>
            <Link to="/chargeback" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Chargeback
            </Link>
            <Link to="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
