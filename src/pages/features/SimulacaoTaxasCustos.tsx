import { Receipt, ShieldCheck, Calculator, Eye } from "lucide-react";
import { FeaturePageLayout } from "@/components/landing/features/FeaturePageLayout";

export default function SimulacaoTaxasCustos() {
  return (
    <FeaturePageLayout
      seoTitle="Simulação de taxas e custos no delivery"
      seoDescription="Entenda o impacto de taxas, embalagens, custos variáveis e anúncios na formação do preço e na margem do delivery."
      h1="Simule taxas e custos antes que eles engulam sua margem"
      subtitle="Veja com mais clareza como taxas, embalagens, custos variáveis e outros fatores afetam o preço final e o lucro do pedido."
      ctaId="feat_simulacao_taxas"
      pains={[
        { text: "Esquece custos pequenos que se acumulam e viram rombo financeiro." },
        { text: "Não mede o peso real das taxas na formação do preço." },
        { text: "Não entende por que a margem desaparece mesmo vendendo bem." },
        { text: "Forma preço sem considerar todo o cenário de custos." },
        { text: "Perde dinheiro em detalhes acumulados que passam despercebidos." },
      ]}
      howItWorks={[
        { step: "1", title: "Cadastre taxas e custos", description: "Registre taxas de cartão, iFood, embalagens e custos variáveis." },
        { step: "2", title: "Simule cenários", description: "Veja como cada custo impacta o preço final e a margem do produto." },
        { step: "3", title: "Ajuste com segurança", description: "Tome decisões sabendo exatamente o peso de cada fator no resultado." },
      ]}
      benefits={[
        { icon: <Eye className="w-5 h-5" />, title: "Visão completa do custo", description: "Enxergue todos os custos que impactam o preço, não só os óbvios." },
        { icon: <ShieldCheck className="w-5 h-5" />, title: "Mais segurança", description: "Forme preços considerando o cenário real e completo da operação." },
        { icon: <Calculator className="w-5 h-5" />, title: "Menos achismo", description: "Decisões baseadas em simulação real, não em estimativa." },
        { icon: <Receipt className="w-5 h-5" />, title: "Impacto visível", description: "Veja claramente como taxas e custos afetam cada produto." },
      ]}
      faq={[
        { question: "Quais custos entram no delivery além da receita?", answer: "Taxas de cartão, taxas do iFood, embalagens, custos fixos diluídos, desperdício e custos de entrega, entre outros." },
        { question: "Embalagem precisa entrar no cálculo?", answer: "Sim. Embalagem é um custo variável por pedido e ignorá-la distorce a margem real de cada venda." },
        { question: "Como simular o impacto das taxas no preço?", answer: "Cadastrando cada taxa no sistema e visualizando quanto ela representa no preço final e na margem do produto." },
        { question: "Vale a pena absorver certos custos ou repassar?", answer: "Depende da estratégia. O importante é saber o impacto real antes de decidir, e não absorver custos no escuro." },
      ]}
      ctaFinal="Os detalhes que parecem pequenos são justamente os que mastigam sua margem em silêncio. Traga tudo para a conta."
      relatedLinks={[
        { label: "Precificação para iFood", href: "/funcionalidades/precificacao-ifood" },
        { label: "Controle real de lucro", href: "/funcionalidades/controle-real-de-lucro" },
        { label: "Ficha técnica automática", href: "/funcionalidades/ficha-tecnica-automatica" },
      ]}
    />
  );
}
