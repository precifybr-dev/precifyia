import { ShieldCheck, Calculator, Eye, BarChart3 } from "lucide-react";
import { FeaturePageLayout } from "@/components/landing/features/FeaturePageLayout";

export default function PrecificacaoIfood() {
  return (
    <FeaturePageLayout
      seoTitle="Precificação para iFood: calcule o preço certo e proteja sua margem"
      seoDescription="Descubra como calcular o preço ideal no iFood considerando taxa, embalagem, CMV, desperdício e margem real do seu delivery."
      h1="Precificação para iFood sem chute e sem prejuízo"
      subtitle="Calcule o preço ideal dos seus produtos considerando taxa do iFood, embalagem, custos da receita e margem de lucro real."
      ctaId="feat_precificacao_ifood"
      pains={[
        { text: "Monta preço no achismo e não sabe se está lucrando ou perdendo." },
        { text: "Esquece de incluir taxas do marketplace na formação do preço." },
        { text: "Vende bem no iFood, mas não entende quanto realmente sobra." },
        { text: "Coloca preço baixo demais para competir e corrói a margem." },
        { text: "Perde margem sem perceber porque não mede o impacto real das taxas." },
      ]}
      howItWorks={[
        { step: "1", title: "Cadastre seus custos", description: "Registre ingredientes, embalagens e custos variáveis de cada produto." },
        { step: "2", title: "Considere as taxas", description: "O sistema aplica as taxas do iFood e outros custos sobre o preço de venda." },
        { step: "3", title: "Decida com segurança", description: "Visualize margem real, custo total e preço mínimo antes de publicar." },
      ]}
      benefits={[
        { icon: <Calculator className="w-5 h-5" />, title: "Cálculo mais seguro", description: "Preço de venda calculado com base em custo real, não em achismo." },
        { icon: <Eye className="w-5 h-5" />, title: "Visão clara das taxas", description: "Entenda exatamente quanto as taxas do iFood impactam cada produto." },
        { icon: <ShieldCheck className="w-5 h-5" />, title: "Proteção de margem", description: "Saiba o preço mínimo por produto para não vender no prejuízo." },
        { icon: <BarChart3 className="w-5 h-5" />, title: "Decisões mais inteligentes", description: "Apoio para ajustar cardápio com base em dados e não em feeling." },
      ]}
      faq={[
        { question: "Como calcular o preço certo no iFood?", answer: "Você precisa considerar custo dos ingredientes, embalagem, taxas do marketplace e a margem de lucro desejada. O Precify faz esse cálculo automaticamente." },
        { question: "A taxa do iFood precisa entrar na precificação?", answer: "Sim. Ignorar as taxas do iFood é um dos erros mais comuns e pode transformar um produto aparentemente lucrativo em prejuízo real." },
        { question: "Como saber se estou vendendo com lucro?", answer: "O sistema mostra a margem real de cada produto, já descontando todos os custos e taxas envolvidos na venda." },
        { question: "Qual erro mais comum ao precificar no delivery?", answer: "Formar preço sem considerar todos os custos: taxas, embalagem, desperdício e custos fixos diluídos. Isso gera uma margem fictícia." },
      ]}
      ctaFinal="Pare de definir preço no escuro. Entenda o que realmente entra, o que realmente sai e quanto precisa sobrar em cada venda."
      relatedLinks={[
        { label: "Simulação de taxas e custos", href: "/funcionalidades/simulacao-de-taxas-e-custos" },
        { label: "Controle real de lucro", href: "/funcionalidades/controle-real-de-lucro" },
        { label: "Ficha técnica automática", href: "/funcionalidades/ficha-tecnica-automatica" },
      ]}
    />
  );
}
