import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      // Change to blue logo when scrolled past the gradient area (approximately 200px)
      setIsScrolled(window.scrollY > 200);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#funcionalidades", label: "Funcionalidades" },
    { href: "#precos", label: "Preços" },
    { href: "#como-funciona", label: "Como funciona" },
  ];

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setIsOpen(false);
    
    // Get the section id from href
    const sectionId = href.replace("#", "");
    const element = document.getElementById(sectionId);
    
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleLogin = () => {
    setIsOpen(false);
    navigate("/login");
  };

  const handleRegister = () => {
    setIsOpen(false);
    navigate("/register");
  };

  // Determine colors based on scroll position
  const headerBg = isScrolled 
    ? "bg-background/95 backdrop-blur-md border-b border-border" 
    : "bg-transparent";
  const textColor = isScrolled ? "text-muted-foreground" : "text-white/90";
  const textHoverColor = isScrolled ? "hover:text-foreground" : "hover:text-white";
  const menuIconColor = isScrolled ? "text-foreground" : "text-white";

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`}>
      <div className="container px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/">
            <Logo size="sm" showText variant={isScrolled ? "blue" : "white"} />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`text-sm font-medium ${textColor} ${textHoverColor} transition-colors cursor-pointer`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`${textColor} ${textHoverColor}`}
              onClick={handleLogin}
            >
              Acessar minha conta
            </Button>
            <Button 
              size="sm" 
              className="bg-success hover:bg-success/90 text-success-foreground"
              onClick={handleRegister}
            >
              Testar grátis por 7 dias
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className={`md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? (
              <X className={`w-5 h-5 ${menuIconColor}`} />
            ) : (
              <Menu className={`w-5 h-5 ${menuIconColor}`} />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-white/20 bg-primary/95 backdrop-blur-md animate-fade-in -mx-4 px-4">
            <nav className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-white/90 hover:text-white transition-colors px-2 py-2"
                  onClick={(e) => handleNavClick(e, link.href)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/20">
                <Button 
                  variant="ghost" 
                  className="w-full justify-center text-white/90 hover:text-white hover:bg-white/10"
                  onClick={handleLogin}
                >
                  Acessar minha conta
                </Button>
                <Button 
                  className="w-full bg-success hover:bg-success/90 text-success-foreground"
                  onClick={handleRegister}
                >
                  Testar grátis por 7 dias
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
