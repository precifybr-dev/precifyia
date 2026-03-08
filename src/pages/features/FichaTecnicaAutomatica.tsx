import { ClipboardList, Scale, Layers, Calculator } from "lucide-react";
import { FeaturePageLayout } from "@/components/landing/features/FeaturePageLayout";

export default function FichaTecnicaAutomatica() {
  return (
    <FeaturePageLayout
      seoTitle="Ficha técnica automática para restaurante e delivery"
      seoDescription="Organize ingredientes, rendimento, custo por item e padronização da operação com uma ficha técnica mais prática e estratégica."
      h1="Ficha técnica automática para organizar custo, receita e produção"
      subtitle="Tenha mais controle sobre ingredientes, rendimento e custo real de cada receita sem depender de planilhas confusas."
      ctaId="feat_ficha_tecnica"
      pains={[
        { text: "Receitas sem padrão: cada funcionário faz de um jeito diferente." },
        { text: "Custo dos ingredientes completamente desorganizado." },
        { text: "Não sabe o custo real de cada lanche, prato ou sobremesa." },
        { text: "Produção inconsistente que gera desperdício e reclamação." },
        { text: "Falta de controle sobre rendimento real de cada receita." },
      ]}
      howItWorks={[
        { step: "1", title: "Cadastre ingredientes", description: "Registre seus insumos com preço de compra, unidade e fornecedor." },
        { step: "2", title: "Monte a receita", description: "Adicione cada ingrediente com a quantidade usada na receita." },
        { step: "3", title: "Veja o custo real", description: "O sistema calcula o custo unitário automaticamente e serve de base para precificação." },
      ]}
      benefits={[
        { icon: <ClipboardList className="w-5 h-5" />, title: "Mais padronização", description: "Receitas documentadas que garantem consistência na produção." },
        { icon: <Calculator className="w-5 h-5" />, title: "Custo confiável", description: "Cálculo automático do custo real de cada receita cadastrada." },
        { icon: <Layers className="w-5 h-5" />, title: "Ingredientes organizados", description: "Visão clara de tudo que entra em cada produto." },
        { icon: <Scale className="w-5 h-5" />, title: "Base para precificação", description: "Custo correto é o primeiro passo para um preço de venda seguro." },
      ]}
      faq={[
        { question: "O que é ficha técnica no delivery?", answer: "É um documento que descreve todos os ingredientes, quantidades e processos de uma receita, permitindo calcular o custo real e padronizar a produção." },
        { question: "Como saber o custo real de uma receita?", answer: "Cadastrando cada ingrediente com seu preço de compra e a quantidade utilizada na receita. O sistema calcula o custo unitário automaticamente." },
        { question: "Ficha técnica ajuda na precificação?", answer: "Sim. Sem saber o custo real, qualquer preço de venda é um chute. A ficha técnica é a base para uma precificação segura." },
        { question: "Como padronizar a produção da cozinha?", answer: "Documentando receitas com quantidades exatas, rendimento esperado e modo de preparo. Isso reduz desperdício e garante consistência." },
      ]}
      ctaFinal="Tenha uma base mais organizada para produzir melhor, precificar melhor e reduzir erros na operação."
      relatedLinks={[
        { label: "Precificação para iFood", href: "/funcionalidades/precificacao-ifood" },
        { label: "Controle real de lucro", href: "/funcionalidades/controle-real-de-lucro" },
        { label: "Simulador de combos", href: "/funcionalidades/simulador-de-combos" },
      ]}
    />
  );
}
