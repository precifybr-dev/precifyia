import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container px-4 mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="font-logo text-primary-foreground text-sm">P</span>
              </div>
              <span className="font-logo text-xl text-foreground">PRECIFY</span>
            </Link>
            <p className="text-muted-foreground max-w-md leading-relaxed">
              A plataforma simples e profissional de precificação para pequenos negócios. 
              Calcule custos, CMV e margens com precisão.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">Produto</h4>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Planos
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold mb-4 text-foreground">Suporte</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Central de Ajuda
                </a>
              </li>
              <li>
                <a href="mailto:suporte@precify.com.br" className="text-muted-foreground hover:text-foreground transition-colors">
                  suporte@precify.com.br
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
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Termos de Uso
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Política de Privacidade
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
