import { Link } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { WhatsAppButton } from "@/components/landing/WhatsAppButton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";

const faqs = [
  {
    question: "O que é o Precify?",
    answer:
      "O Precify é uma plataforma de precificação inteligente para donos de restaurantes, lanchonetes, hamburguerias e outros negócios de alimentação. Ele calcula automaticamente o custo real de cada prato e sugere o preço ideal de venda, tanto para o balcão quanto para marketplaces como o iFood.",
  },
  {
    question: "Para quem o Precify foi feito?",
    answer:
      "Para qualquer pessoa que vende comida — desde quem está começando em casa até restaurantes estabelecidos. Se você quer saber exatamente quanto lucra (ou perde) em cada venda, o Precify é para você.",
  },
  {
    question: "O que é CMV e por que ele é tão importante?",
    answer:
      "CMV significa Custo de Mercadoria Vendida. É o percentual do preço de venda que vai para cobrir os ingredientes do prato. Por exemplo, se um prato custa R$ 10 de ingredientes e você vende por R$ 40, seu CMV é 25%. Manter o CMV controlado (geralmente entre 25% e 35%) é essencial para garantir que seu negócio seja lucrativo. O Precify calcula isso automaticamente para cada receita.",
  },
  {
    question: "Como o Precify funciona na prática?",
    answer:
      "É simples: 1) Cadastre seus ingredientes com preços de compra. 2) Monte suas receitas com as quantidades usadas. 3) O sistema calcula o custo real, o CMV e sugere o preço ideal. Tudo leva em conta impostos, taxas de cartão, custos fixos e taxas do iFood, se aplicável.",
  },
  {
    question: "Qual a diferença entre preço de balcão e preço no iFood?",
    answer:
      "No balcão você paga apenas impostos e taxa de cartão. No iFood existem comissões extras (de 12% a 30% dependendo do plano), taxa de entrega e possíveis cupons. Por isso o preço no iFood geralmente precisa ser maior para manter a mesma margem de lucro. O Precify calcula os dois preços separadamente.",
  },
  {
    question: "Preciso entender de contabilidade para usar?",
    answer:
      "Não! O Precify foi criado justamente para simplificar. Você só precisa informar quanto paga nos ingredientes e o sistema faz todas as contas. Termos como CMV, margem de contribuição e DRE são explicados de forma simples dentro da plataforma.",
  },
  {
    question: "Funciona para quem não usa o iFood?",
    answer:
      "Sim! O iFood é opcional. Você pode usar o Precify apenas para precificar suas vendas no balcão, delivery próprio ou qualquer outro canal. A integração com iFood é um diferencial, mas não é obrigatória.",
  },
  {
    question: "O Precify substitui uma planilha de custos?",
    answer:
      "Sim, e vai muito além. Planilhas quebram facilmente, não atualizam preços automaticamente e exigem conhecimento de fórmulas. O Precify centraliza tudo, atualiza os cálculos em tempo real quando você muda o preço de um ingrediente, e ainda considera taxas e impostos que planilhas normalmente ignoram.",
  },
  {
    question: "Como começar a usar?",
    answer:
      "Basta criar sua conta gratuitamente. O plano gratuito já permite cadastrar ingredientes, montar receitas e ver o custo real dos seus pratos. Você pode fazer upgrade a qualquer momento para acessar recursos avançados como combos inteligentes e importação do iFood.",
  },
];

export default function PublicHelp() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    return () => {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "dark") {
        document.documentElement.classList.add("dark");
      }
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container px-4 mx-auto py-12 max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar à página inicial
        </Link>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
          Central de Ajuda
        </h1>
        <p className="text-muted-foreground mb-8">
          Tire suas dúvidas sobre o Precify, precificação e como começar.
        </p>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left text-base font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
