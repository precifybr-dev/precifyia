import { DollarSign, Eye, TrendingDown, BarChart3 } from "lucide-react";
import { FeaturePageLayout } from "@/components/landing/features/FeaturePageLayout";

export default function ControleRealLucro() {
  return (
    <FeaturePageLayout
      seoTitle="Controle real de lucro para delivery e restaurante"
      seoDescription="Entenda a diferença entre faturamento e lucro real e veja quanto realmente sobra após taxas, custos e despesas da operação."
      h1="Faturar não é lucrar: veja o lucro real do seu delivery"
      subtitle="Entenda o que realmente sobra depois de custos, taxas e despesas e pare de confundir movimento com resultado."
      ctaId="feat_controle_lucro"
      pains={[
        { text: "Fatura, mas não sente sobra real no caixa no fim do mês." },
        { text: "Não sabe quanto realmente ganha por pedido entregue." },
        { text: "Confunde faturamento com lucro e toma decisões erradas." },
        { text: "Ignora custos invisíveis que corroem a margem silenciosamente." },
        { text: "Tem operação girando, mas sem clareza financeira real." },
      ]}
      howItWorks={[
        { step: "1", title: "Registre custos e despesas", description: "Cadastre custos fixos, variáveis e taxas que impactam sua operação." },
        { step: "2", title: "Veja a margem real", description: "O sistema mostra quanto realmente sobra por produto e por operação." },
        { step: "3", title: "Corrija o que corrói lucro", description: "Identifique onde está perdendo margem e ajuste com base em dados." },
      ]}
      benefits={[
        { icon: <Eye className="w-5 h-5" />, title: "Visão realista", description: "Veja quanto realmente sobra, não quanto parece que sobra." },
        { icon: <BarChart3 className="w-5 h-5" />, title: "Clareza financeira", description: "Entenda margem por produto, por canal e por operação." },
        { icon: <TrendingDown className="w-5 h-5" />, title: "Corrija vazamentos", description: "Identifique decisões que parecem boas mas corroem margem." },
        { icon: <DollarSign className="w-5 h-5" />, title: "Menos ilusão", description: "Pare de confundir faturamento alto com resultado positivo." },
      ]}
      faq={[
        { question: "Qual a diferença entre faturamento e lucro?", answer: "Faturamento é tudo que entra. Lucro é o que sobra depois de pagar todos os custos, taxas e despesas da operação." },
        { question: "Como saber quanto realmente sobra por pedido?", answer: "Calculando o custo total do pedido (ingredientes, embalagem, taxas, custos fixos diluídos) e subtraindo do preço de venda." },
        { question: "Por que vender muito nem sempre significa lucrar?", answer: "Porque se a margem por produto for baixa ou negativa, vender mais só aumenta o volume de prejuízo." },
        { question: "Como enxergar melhor o resultado do delivery?", answer: "Organizando todos os custos e taxas no sistema e acompanhando a margem real, não apenas o faturamento bruto." },
      ]}
      ctaFinal="Seu negócio não vive de faturamento bonito. Vive do que sobra com consistência no fim da conta."
      relatedLinks={[
        { label: "Precificação para iFood", href: "/funcionalidades/precificacao-ifood" },
        { label: "Simulação de taxas e custos", href: "/funcionalidades/simulacao-de-taxas-e-custos" },
        { label: "Análise inteligente de cardápio", href: "/funcionalidades/analise-inteligente-cardapio" },
      ]}
    />
  );
}
