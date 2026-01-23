import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Por que o preço do marketplace é maior que o do balcão?",
    answer:
      "Porque marketplaces como iFood, Rappi e 99Food cobram taxas de comissão (geralmente entre 12% e 27%). Para você manter a mesma margem de lucro, o preço precisa ser maior. O sistema calcula automaticamente quanto cobrar em cada canal para que seu lucro seja o mesmo.",
  },
  {
    question: "O que é CMV e por que ele é importante?",
    answer:
      "CMV significa Custo de Mercadoria Vendida. É o percentual do preço de venda que vai para pagar os ingredientes e custos diretos do produto. Por exemplo, se você vende um hambúrguer por R$ 40 e gasta R$ 12 em ingredientes, seu CMV é 30%. O ideal para food service é manter o CMV entre 28% e 35%.",
  },
  {
    question: "Posso usar o mesmo preço no balcão e no iFood?",
    answer:
      "Pode, mas você vai lucrar menos (ou até ter prejuízo) nas vendas pelo marketplace. As taxas do iFood, por exemplo, podem chegar a 27%. Se você não ajustar o preço, essa taxa sai direto da sua margem. O sistema mostra exatamente quanto você perde em cada cenário.",
  },
  {
    question: "O que é Fator de Correção (F.C.)?",
    answer:
      "É um multiplicador que considera as perdas durante o preparo. Por exemplo, se você compra 1kg de carne mas só aproveita 800g após limpeza, o F.C. é 1,25 (1000 ÷ 800). O sistema usa esse fator para calcular o custo real dos seus insumos.",
  },
  {
    question: "Preciso cadastrar todos os meus produtos?",
    answer:
      "Não necessariamente. Comece pelos produtos mais vendidos ou pelos que você suspeita que podem estar dando prejuízo. Muitos usuários descobrem problemas de precificação logo nos primeiros 3 a 5 produtos cadastrados.",
  },
  {
    question: "O sistema funciona para quem não usa iFood?",
    answer:
      "Sim! O sistema calcula o preço ideal para venda direta (balcão, WhatsApp, delivery próprio) considerando seus custos e a margem desejada. A calculadora de marketplace é opcional — você só usa se vender por apps de delivery.",
  },
];

export function FAQSection() {
  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-primary uppercase tracking-wide mb-2">
            Tire suas dúvidas
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Perguntas Frequentes
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Entenda como funciona a precificação e por que cada canal precisa de um preço diferente
          </p>
        </div>

        {/* FAQ Accordion */}
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

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Ainda tem dúvidas? Experimente o sistema gratuitamente.
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
          >
            Começar agora — é grátis por 7 dias
            <span>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
