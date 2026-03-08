import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";
import { supabase } from "@/integrations/supabase/client";

const featureLinks = [
  { href: "/funcionalidades/precificacao-ifood", label: "Precificação para iFood" },
  { href: "/funcionalidades/ficha-tecnica-automatica", label: "Ficha técnica automática" },
  { href: "/funcionalidades/analise-inteligente-cardapio", label: "Análise inteligente de cardápio" },
  { href: "/funcionalidades/simulador-de-combos", label: "Simulador de combos" },
  { href: "/funcionalidades/controle-real-de-lucro", label: "Controle real de lucro" },
  { href: "/funcionalidades/simulacao-de-taxas-e-custos", label: "Simulação de taxas e custos" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [mobileFeatures, setMobileFeatures] = useState(false);
  const navigate = useNavigate();
  const { trackEvent } = useFunnelTracking();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setFeaturesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    const sectionId = href.replace("#", "");
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Navigate to home with hash so the section scrolls into view
      navigate("/" + href);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary">
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to={isLoggedIn ? "/app" : "/"}>
            <Logo size="sm" showText variant="white" />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {/* Funcionalidades dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setFeaturesOpen(!featuresOpen)}
                className="flex items-center gap-1 text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors cursor-pointer"
              >
                Funcionalidades
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${featuresOpen ? "rotate-180" : ""}`} />
              </button>
              {featuresOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-card rounded-xl border border-border shadow-xl animate-fade-in py-2">
                  {featureLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setFeaturesOpen(false)}
                      className="block px-4 py-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

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
            <nav className="flex flex-col gap-2">
              {/* Mobile Funcionalidades */}
              <button
                onClick={() => setMobileFeatures(!mobileFeatures)}
                className="flex items-center justify-between text-sm font-medium text-primary-foreground/80 hover:text-primary-foreground transition-colors px-2 py-2"
              >
                Funcionalidades
                <ChevronDown className={`w-4 h-4 transition-transform ${mobileFeatures ? "rotate-180" : ""}`} />
              </button>
              {mobileFeatures && (
                <div className="pl-4 flex flex-col gap-1 animate-fade-in">
                  {featureLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => { setIsOpen(false); setMobileFeatures(false); }}
                      className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors px-2 py-2"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}

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
