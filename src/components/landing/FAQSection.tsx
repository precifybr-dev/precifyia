import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useEffect } from "react";

const faqs = [
  {
    question: "É difícil de usar?",
    answer:
      "Não. O sistema foi feito para donos de restaurante, não para contadores. Você cadastra seus insumos, monta a receita e o sistema faz todo o cálculo. Sem fórmulas, sem planilhas.",
  },
  {
    question: "Preciso entender de finanças?",
    answer:
      "Não. O Precify traduz tudo em linguagem simples. Você vai ver quanto lucra em reais, não em indicadores financeiros complicados. Tudo é visual e direto ao ponto.",
  },
  {
    question: "Funciona para qualquer tipo de restaurante?",
    answer:
      "Sim. Hamburguerias, pizzarias, marmitarias, dark kitchens, confeitarias, food trucks — qualquer operação que precise precificar produtos alimentícios e venda por delivery ou balcão.",
  },
  {
    question: "Em quanto tempo vejo resultado?",
    answer:
      "A maioria dos usuários descobre problemas de precificação nos primeiros 10 minutos. Com os ajustes, o impacto na margem aparece já no primeiro mês.",
  },
  {
    question: "Meus dados estão seguros?",
    answer:
      "Sim. Seus dados ficam protegidos com criptografia, backup automático e acesso restrito. Só você e quem você autorizar podem ver suas informações.",
  },
  {
    question: "Posso usar com mais de uma loja?",
    answer:
      "Sim, no plano Pro. Cada loja tem seus insumos, receitas e relatórios separados, sem misturar os dados entre unidades.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim. Não existe fidelidade nem multa. Você pode cancelar a qualquer momento direto pelo sistema, sem burocracia.",
  },
];

const generateFAQSchema = () => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

export function FAQSection() {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(generateFAQSchema());
    script.id = "faq-schema";

    const existing = document.getElementById("faq-schema");
    if (existing) existing.remove();

    document.head.appendChild(script);

    return () => {
      const s = document.getElementById("faq-schema");
      if (s) s.remove();
    };
  }, []);

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left text-base font-medium hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
