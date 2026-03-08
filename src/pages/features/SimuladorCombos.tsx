import { Puzzle, ShieldCheck, TrendingUp, BadgePercent } from "lucide-react";
import { FeaturePageLayout } from "@/components/landing/features/FeaturePageLayout";

export default function SimuladorCombos() {
  return (
    <FeaturePageLayout
      seoTitle="Simulador de combos para delivery e iFood sem prejuízo"
      seoDescription="Monte combos com itens já precificados, entenda descontos e descubra se a oferta continua lucrativa antes de publicar."
      h1="Monte combos lucrativos sem vender no prejuízo"
      subtitle="Simule combinações com produtos já cadastrados, aplique estratégia de desconto e veja com mais clareza o impacto na margem."
      ctaId="feat_simulador_combos"
      pains={[
        { text: "Monta combo no chute e só descobre o prejuízo depois." },
        { text: "Dá desconto sem saber o efeito real na margem da operação." },
        { text: "Mistura itens sem entender o custo total da combinação." },
        { text: "Quer vender mais sem destruir a margem de lucro." },
        { text: "Perde dinheiro em promoções mal calculadas repetidamente." },
      ]}
      howItWorks={[
        { step: "1", title: "Selecione os itens", description: "Escolha produtos já cadastrados com custo e preço definidos." },
        { step: "2", title: "Monte a combinação", description: "Defina quantidades e veja o custo total do combo em tempo real." },
        { step: "3", title: "Valide a oferta", description: "Veja margem, lucro estimado e se a promoção faz sentido antes de publicar." },
      ]}
      benefits={[
        { icon: <Puzzle className="w-5 h-5" />, title: "Visão do custo total", description: "Saiba exatamente quanto custa montar cada combo antes de definir o preço." },
        { icon: <ShieldCheck className="w-5 h-5" />, title: "Segurança no desconto", description: "Aplique descontos sabendo o limite mínimo para não ter prejuízo." },
        { icon: <TrendingUp className="w-5 h-5" />, title: "Promoções mais inteligentes", description: "Crie ofertas que atraem cliente e ainda protegem sua margem." },
        { icon: <BadgePercent className="w-5 h-5" />, title: "Ofertas estratégicas", description: "Construa combos com lógica de item-isca e item de sustentação de lucro." },
      ]}
      faq={[
        { question: "Como montar combo sem prejuízo?", answer: "Conhecendo o custo real de cada item e definindo o preço do combo acima desse custo, com margem de segurança." },
        { question: "Vale a pena dar desconto em combo?", answer: "Sim, desde que o desconto seja calculado e não corroa a margem. Combos bem montados aumentam ticket médio com lucro." },
        { question: "Como calcular o custo de um combo?", answer: "Somando o custo individual de cada item incluído no combo, considerando as quantidades de cada um." },
        { question: "Combo no iFood precisa de estratégia diferente?", answer: "Sim. No iFood, além do custo dos itens, é preciso considerar as taxas do marketplace no preço final do combo." },
      ]}
      ctaFinal="Monte ofertas que ajudam a vender mais sem transformar promoção em vazamento de lucro."
      relatedLinks={[
        { label: "Precificação para iFood", href: "/funcionalidades/precificacao-ifood" },
        { label: "Controle real de lucro", href: "/funcionalidades/controle-real-de-lucro" },
        { label: "Análise inteligente de cardápio", href: "/funcionalidades/analise-inteligente-cardapio" },
      ]}
    />
  );
}
