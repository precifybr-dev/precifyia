import { Eye, TrendingUp, BarChart3, Brain } from "lucide-react";
import { FeaturePageLayout } from "@/components/landing/features/FeaturePageLayout";

export default function AnaliseInteligenteCardapio() {
  return (
    <FeaturePageLayout
      seoTitle="Análise inteligente de cardápio para melhorar margem e decisão"
      seoDescription="Entenda melhor o impacto dos preços, custos e margens do seu cardápio e tome decisões mais estratégicas no delivery."
      h1="Análise inteligente de cardápio para decidir com mais segurança"
      subtitle="Veja o cardápio com mais clareza, entenda impacto de custo e margem e evite decisões tomadas apenas no feeling."
      ctaId="feat_analise_cardapio"
      pains={[
        { text: "Não sabe quais itens estão pressionando a margem do negócio." },
        { text: "Dificuldade para revisar preços sem perder competitividade." },
        { text: "Cardápio montado sem critério claro de custo e rentabilidade." },
        { text: "Decisões baseadas apenas em percepção e não em dados concretos." },
        { text: "Dificuldade para enxergar oportunidades de ajuste no cardápio." },
      ]}
      howItWorks={[
        { step: "1", title: "Cadastre seus produtos", description: "Com custos e preços já definidos no sistema." },
        { step: "2", title: "Visualize o impacto", description: "Veja margem, custo e rentabilidade de cada item do cardápio." },
        { step: "3", title: "Decida com clareza", description: "Identifique o que precisa de ajuste e o que já está bem posicionado." },
      ]}
      benefits={[
        { icon: <Eye className="w-5 h-5" />, title: "Clareza para revisar preços", description: "Veja quais produtos merecem atenção antes que o prejuízo se acumule." },
        { icon: <BarChart3 className="w-5 h-5" />, title: "Visão estratégica", description: "Entenda o cardápio como ferramenta de resultado, não como lista de itens." },
        { icon: <TrendingUp className="w-5 h-5" />, title: "Margem e custo visíveis", description: "Dados claros para apoiar cada decisão sobre preço e cardápio." },
        { icon: <Brain className="w-5 h-5" />, title: "Menos impulsividade", description: "Decisões racionais com base em números, não em achismo." },
      ]}
      faq={[
        { question: "Como analisar se meu cardápio está saudável?", answer: "Avaliando a margem de contribuição de cada produto e identificando itens que podem estar vendendo bem mas gerando pouca ou nenhuma margem." },
        { question: "Como saber quais produtos precisam de ajuste?", answer: "Produtos com custo alto e margem baixa são candidatos naturais a revisão de preço ou composição de receita." },
        { question: "Cardápio lucrativo depende só de vender mais?", answer: "Não. Depende de vender os itens certos, com a margem certa. Volume sem margem é só movimento, não resultado." },
        { question: "Como revisar o cardápio sem perder competitividade?", answer: "Ajustando preços com base em dados reais de custo e margem, e não apenas copiando a concorrência." },
      ]}
      ctaFinal="Não trate seu cardápio como uma lista de produtos. Trate como uma ferramenta de decisão e lucratividade."
      relatedLinks={[
        { label: "Precificação para iFood", href: "/funcionalidades/precificacao-ifood" },
        { label: "Simulador de combos", href: "/funcionalidades/simulador-de-combos" },
        { label: "Controle real de lucro", href: "/funcionalidades/controle-real-de-lucro" },
      ]}
    />
  );
}
