import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useEffect } from "react";

const faqs = [
  {
    question: "É difícil usar?",
    answer:
      "Não. O Precify foi feito para ser simples. Você cadastra seus insumos, monta as receitas e o sistema faz todo o cálculo automaticamente. Se sabe preencher um formulário, sabe usar o Precify.",
  },
  {
    question: "Preciso entender de finanças?",
    answer:
      "Não precisa. O sistema explica tudo de forma simples e calcula automaticamente impostos, taxas e custos. Você só precisa informar os dados do seu restaurante.",
  },
  {
    question: "Funciona para qualquer restaurante?",
    answer:
      "Sim. Hamburguerias, pizzarias, marmitarias, dark kitchens, padarias, confeitarias — qualquer negócio que venda comida e precise saber o lucro real.",
  },
  {
    question: "Em quanto tempo vejo resultado?",
    answer:
      "Em minutos. Assim que cadastrar seus primeiros produtos, você já vê o lucro real de cada um e pode ajustar os preços imediatamente.",
  },
  {
    question: "Meus dados estão seguros?",
    answer:
      "Sim. Seus dados ficam protegidos com backup automático, criptografia e acesso seguro. Só você tem acesso às suas informações.",
  },
  {
    question: "Posso usar com mais de uma loja?",
    answer:
      "Sim, no plano Pro. Você gerencia cada unidade separadamente, com dados isolados e controle individual de custos e preços.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer:
      "Sim, sem burocracia. Você pode cancelar a qualquer momento direto pelo sistema, sem multa e sem precisar falar com ninguém.",
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
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-semibold text-foreground hover:no-underline py-5">
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
