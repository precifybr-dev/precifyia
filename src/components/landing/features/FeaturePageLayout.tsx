import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";
import { useFunnelTracking } from "@/hooks/useFunnelTracking";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

interface BenefitItem {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface PainItem {
  text: string;
}

interface HowItWorksStep {
  step: string;
  title: string;
  description: string;
}

interface RelatedLink {
  label: string;
  href: string;
}

interface FeaturePageProps {
  seoTitle: string;
  seoDescription: string;
  h1: string;
  subtitle: string;
  ctaId: string;
  pains: PainItem[];
  howItWorks: HowItWorksStep[];
  benefits: BenefitItem[];
  faq: FAQItem[];
  ctaFinal: string;
  relatedLinks: RelatedLink[];
}

export function FeaturePageLayout({
  seoTitle,
  seoDescription,
  h1,
  subtitle,
  ctaId,
  pains,
  howItWorks,
  benefits,
  faq,
  ctaFinal,
  relatedLinks,
}: FeaturePageProps) {
  const { trackEvent } = useFunnelTracking();

  useEffect(() => {
    document.title = seoTitle;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", seoDescription);
    else {
      const meta = document.createElement("meta");
      meta.name = "description";
      meta.content = seoDescription;
      document.head.appendChild(meta);
    }
    document.documentElement.classList.remove("dark");
    window.scrollTo(0, 0);
    return () => {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark") document.documentElement.classList.add("dark");
    };
  }, [seoTitle, seoDescription]);

  // FAQ Schema
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    };
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [faq]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="pt-28 pb-16 lg:pt-36 lg:pb-24 bg-primary">
        <div className="container px-4 mx-auto text-center max-w-3xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-primary-foreground leading-tight mb-6">
            {h1}
          </h1>
          <p className="text-lg sm:text-xl text-primary-foreground/80 mb-8 leading-relaxed">
            {subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register" onClick={() => trackEvent("cta_click", ctaId)}>
              <Button
                size="lg"
                data-cta-id={ctaId}
                className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group text-base px-8"
              >
                Teste grátis por 7 dias
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <Link to="/">
              <Button
                variant="ghost"
                size="lg"
                className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                Voltar à home
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Dores */}
      <section className="py-16 lg:py-20 bg-background">
        <div className="container px-4 mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground text-center mb-4">
            Isso parece familiar?
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-xl mx-auto">
            Se você se identifica com algum desses cenários, está na hora de mudar.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {pains.map((pain, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card"
              >
                <span className="mt-0.5 w-6 h-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                </span>
                <p className="text-sm text-foreground leading-relaxed">{pain.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-16 lg:py-20 bg-muted/50">
        <div className="container px-4 mx-auto max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground text-center mb-12">
            Como o Precify te ajuda
          </h2>
          <div className="grid gap-8 md:grid-cols-3">
            {howItWorks.map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-lg font-bold font-display">
                  {step.step}
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="py-16 lg:py-20 bg-background">
        <div className="container px-4 mx-auto max-w-4xl">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground text-center mb-12">
            O que você ganha com isso
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {benefits.map((b, i) => (
              <div key={i} className="p-6 rounded-xl border border-border bg-card hover:shadow-card-hover transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4 text-accent-foreground">
                  {b.icon}
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-20 bg-muted/50">
        <div className="container px-4 mx-auto max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground text-center mb-10">
            Perguntas frequentes
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faq.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-lg bg-card px-4">
                <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 lg:py-24 bg-primary">
        <div className="container px-4 mx-auto max-w-2xl text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-primary-foreground mb-6 leading-tight">
            {ctaFinal}
          </h2>
          <Link to="/register" onClick={() => trackEvent("cta_click", `${ctaId}_final`)}>
            <Button
              size="lg"
              className="bg-success hover:bg-success/90 text-success-foreground shadow-lg shadow-success/25 group text-base px-10"
            >
              Teste grátis por 7 dias
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <p className="text-primary-foreground/60 text-sm mt-4">Leva menos de 1 minuto.</p>
        </div>
      </section>

      {/* Related links */}
      <section className="py-12 bg-background border-t border-border">
        <div className="container px-4 mx-auto max-w-3xl">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
            Funcionalidades relacionadas
          </h3>
          <div className="flex flex-wrap justify-center gap-3">
            {relatedLinks.map((link, i) => (
              <Link
                key={i}
                to={link.href}
                className="px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <WhatsAppButton />
    </div>
  );
}
