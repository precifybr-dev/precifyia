import { normalizeText } from "@/lib/utils";

type CategoryKey = "despesas_fixas" | "despesas_variaveis" | "custos_fixos_producao" | "custos_variaveis_producao";

interface CategoryGroup {
  key: CategoryKey;
  label: string;
  description: string;
  keywords: string[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    key: "despesas_fixas",
    label: "Despesa Fixa do Negócio",
    description: "Despesas fixas são gastos estruturais da empresa que existem independentemente da produção.",
    keywords: [
      "aluguel", "condominio", "iptu",
      "funcionario", "funcionarios", "salario", "folha", "pro-labore", "prolabore",
      "beneficio", "beneficios", "vale transporte", "vale refeicao",
      "encargo", "encargos", "fgts", "inss", "sindicato",
      "agua", "luz", "energia", "gas fixo",
      "internet", "telefone", "celular",
      "limpeza", "seguranca", "vigilancia",
      "contador", "contabilidade", "juridico", "advogado",
      "consultoria", "despachante",
      "sistema", "software", "erp", "mensalidade sistema",
      "parcela maquina", "financiamento", "emprestimo", "leasing",
      "juros fixos", "tarifa bancaria",
    ],
  },
  {
    key: "despesas_variaveis",
    label: "Despesa Variável do Negócio",
    description: "Despesas variáveis são gastos que variam conforme o faturamento ou volume geral de operação.",
    keywords: [
      "marketing", "anuncio", "anuncios", "trafego",
      "facebook ads", "google ads", "promocao", "publicidade",
      "comissao vendedor", "comissoes",
      "taxa cartao", "taxa maquininha", "taxa banco", "taxas financeiras",
      "antecipacao",
      "imposto sobre venda", "icms", "iss", "pis", "cofins", "simples nacional",
      "taxas variaveis", "taxas operacionais",
    ],
  },
  {
    key: "custos_fixos_producao",
    label: "Custo Fixo de Produção",
    description: "Custos fixos de produção existem para produzir, mas não variam por unidade fabricada.",
    keywords: [
      "depreciacao", "desgaste equipamento",
      "maquina producao", "equipamento producao",
      "manutencao equipamento", "contrato minimo producao",
      "licenca producao", "custo fixo por item",
      "taxa fixa producao", "estrutura producao", "custo base producao",
    ],
  },
  {
    key: "custos_variaveis_producao",
    label: "Custo Variável de Produção",
    description: "Custos variáveis de produção variam diretamente conforme a quantidade produzida ou vendida.",
    keywords: [
      "embalagem", "caixa", "papel", "saco", "etiqueta",
      "perda", "desperdicio", "quebra",
      "insumo", "ingrediente", "materia-prima", "materia prima",
      "taxa ifood", "comissao ifood", "taxa por pedido",
      "taxa entrega", "motoboy",
      "cupom", "desconto", "taxa variavel por item",
    ],
  },
];

export interface MismatchResult {
  detectedGroup: CategoryKey;
  suggestedCategoryName: string;
  message: string;
}

export function detectCategoryMismatch(
  inputText: string,
  currentCategory: CategoryKey
): MismatchResult | null {
  const text = normalizeText(inputText.trim());
  if (!text || text.length < 3) return null;

  for (const group of CATEGORY_GROUPS) {
    if (group.key === currentCategory) continue;

    const matched = group.keywords.some((keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      return text.includes(normalizedKeyword) || normalizedKeyword.includes(text);
    });

    if (matched) {
      return {
        detectedGroup: group.key,
        suggestedCategoryName: group.label,
        message: `"${inputText.trim()}" é normalmente uma ${group.label}, não pertence a esta categoria. ${group.description} Você pode continuar se desejar.`,
      };
    }
  }

  return null;
}
