import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  const handleSmoothScroll = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container px-4 mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="mb-4 inline-block">
              <Logo size="sm" showText />
            </Link>
            <p className="text-muted-foreground max-w-md leading-relaxed mb-4 text-sm">
              Precificação inteligente para food service. Calcule custos, margens e preços ideais para seu restaurante, delivery e iFood.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/precifyia/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Precify"
                className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
              </a>
              <a
                href="https://wa.me/5547996887776"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp Precify"
                className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
              </a>
            </div>
          </div>

          {/* Produto */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground text-sm">Produto</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#funcionalidades" onClick={(e) => handleSmoothScroll(e, "funcionalidades")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#calculadora" onClick={(e) => handleSmoothScroll(e, "calculadora")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Calculadora de Preços
                </a>
              </li>
              <li>
                <a href="#resultados" onClick={(e) => handleSmoothScroll(e, "resultados")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Resultados
                </a>
              </li>
              <li>
                <a href="#precos" onClick={(e) => handleSmoothScroll(e, "precos")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Planos e Preços
                </a>
              </li>
              <li>
                <a href="#faq" onClick={(e) => handleSmoothScroll(e, "faq")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Perguntas Frequentes
                </a>
              </li>
            </ul>
          </div>

          {/* Ferramentas */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground text-sm">Ferramentas</h4>
            <ul className="space-y-2.5">
              <li>
                <a href="#funcionalidades" onClick={(e) => handleSmoothScroll(e, "funcionalidades")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Raio-X iFood
                </a>
              </li>
              <li>
                <a href="#funcionalidades" onClick={(e) => handleSmoothScroll(e, "funcionalidades")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Análise de Cardápio
                </a>
              </li>
              <li>
                <a href="#funcionalidades" onClick={(e) => handleSmoothScroll(e, "funcionalidades")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Combos com IA
                </a>
              </li>
              <li>
                <a href="#funcionalidades" onClick={(e) => handleSmoothScroll(e, "funcionalidades")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  CMV Global
                </a>
              </li>
              <li>
                <a href="#funcionalidades" onClick={(e) => handleSmoothScroll(e, "funcionalidades")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  DRE Simplificado
                </a>
              </li>
            </ul>
          </div>

          {/* Suporte */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground text-sm">Suporte</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/ajuda" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Central de Ajuda
                </Link>
              </li>
              <li>
                <a href="https://wa.me/5547996887776" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Falar no WhatsApp
                </a>
              </li>
              <li>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Entrar na Conta
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Criar Conta Grátis
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground text-sm">Legal</h4>
            <ul className="space-y-2.5">
              <li>
                <Link to="/termos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Política de Cookies
                </Link>
              </li>
              <li>
                <Link to="/politica-antifraude" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Política Antifraude
                </Link>
              </li>
              <li>
                <Link to="/cancelamento" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Cancelamento
                </Link>
              </li>
              <li>
                <Link to="/chargeback" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Chargeback
                </Link>
              </li>
              <li>
                <Link to="/contrato" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contrato de Serviço
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>© {new Date().getFullYear()} TA ON - Precify Tecnologia LTDA. Todos os direitos reservados.</p>
            <p>CNPJ: 48.245.923/0001-30</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Precificação inteligente para restaurantes, delivery e iFood
          </p>
        </div>
      </div>
    </footer>
  );
}
