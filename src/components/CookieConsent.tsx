import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, maxAgeDays: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeDays * 86400}; path=/; SameSite=Lax`;
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookie("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    setCookie("cookie-consent", "accepted", 365);
    setVisible(false);
  };

  const handleDecline = () => {
    setCookie("cookie-consent", "declined", 365);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-xl shadow-lg p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 flex-shrink-0 mt-0.5">
            <Cookie className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-foreground text-sm sm:text-base mb-1">
              🍪 Este site usa cookies
            </h3>
            <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
              Utilizamos cookies para melhorar sua experiência, personalizar conteúdo e analisar nosso tráfego. 
              Ao clicar em "Aceitar", você concorda com o uso de cookies conforme nossa{" "}
              <Link to="/cookies" className="text-primary hover:underline font-medium">
                Política de Cookies
              </Link>.
            </p>
          </div>
          <button onClick={handleDecline} className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 mt-4 justify-end">
          <Button variant="outline" size="sm" onClick={handleDecline}>
            Recusar
          </Button>
          <Button size="sm" onClick={handleAccept}>
            Aceitar cookies
          </Button>
        </div>
      </div>
    </div>
  );
}
