import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { trackEvent } = useFunnelTracking();

  const navLinks = [
    { href: "#calculadora", label: "Calculadora" },
    { href: "#resultados", label: "Resultados" },
    { href: "#precos", label: "Preços" },
  ];

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    e.preventDefault();
    setIsOpen(false);
    const el = document.getElementById(href.replace("#", ""));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/">
            <Logo size="sm" showText variant="white" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors cursor-pointer"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              onClick={() => navigate("/login")}
            >
              Entrar
            </Button>
            <Button
              size="sm"
              data-cta-id="header_cta"
              className="bg-success hover:bg-success/90 text-success-foreground group"
              onClick={() => {
                trackEvent("cta_click", "header_cta");
                navigate("/register");
              }}
            >
              Teste grátis por 7 dias
              <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </div>

          <button
            className="md:hidden p-2 hover:bg-primary-foreground/10 rounded-lg transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className="w-5 h-5 text-primary-foreground" />
            ) : (
              <Menu className="w-5 h-5 text-primary-foreground" />
            )}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden py-4 border-t border-primary-foreground/20 animate-fade-in">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors px-2 py-2"
                  onClick={(e) => handleNavClick(e, link.href)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-primary-foreground/20">
                <Button
                  variant="ghost"
                  className="w-full justify-center text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/login");
                  }}
                >
                  Entrar
                </Button>
                <Button
                  className="w-full bg-success hover:bg-success/90 text-success-foreground"
                  onClick={() => {
                    setIsOpen(false);
                    trackEvent("cta_click", "header_cta");
                    navigate("/register");
                  }}
                >
                  Teste grátis por 7 dias
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
