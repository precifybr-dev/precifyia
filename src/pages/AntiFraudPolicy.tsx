import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const LAST_UPDATED = "13 de fevereiro de 2026";
const POLICY_VERSION = "1.0.0";

export default function AntiFraudPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <article className="bg-card border rounded-lg p-6 sm:p-10 space-y-8 text-foreground">
          {/* Header */}
          <header className="border-b pb-6 space-y-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-destructive" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Política Antifraude
              </h1>
            </div>
            <div className="text-sm text-muted-foreground space-y-0.5 mt-4">
              <p><strong>Empresa:</strong> Precify Tecnologia LTDA</p>
              <p><strong>CNPJ:</strong> 00.000.000/0001-00</p>
              <p><strong>E-mail:</strong> antifraude@precify.com.br</p>
              <p><strong>Última atualização:</strong> {LAST_UPDATED}</p>
              <p><strong>Versão:</strong> {POLICY_VERSION}</p>
            </div>
            <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
              <p className="text-sm font-medium text-destructive">
                Esta política tem caráter vinculante e sua violação acarreta sanções imediatas, incluindo
                bloqueio definitivo e medidas judiciais cabíveis.
              </p>
            </div>
          </header>

          <div className="space-y-8 text-sm leading-relaxed">
            {/* 1 — Monitoramento */}
            <Section n={1} title="Monitoramento Automático de Transações">
              <p className="mb-3 text-muted-foreground">
                A Plataforma realiza monitoramento contínuo e automatizado de todas as operações, incluindo,
                mas não se limitando a:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li><strong>Endereço IP duplicado:</strong> Detecção de múltiplas contas ou transações originadas do mesmo endereço IP em intervalos curtos, indicando possível manipulação.</li>
                <li><strong>Cartões repetidos:</strong> Identificação do uso de um mesmo cartão de crédito/débito em contas distintas ou em volume anormal de transações.</li>
                <li><strong>Múltiplas contas no mesmo dispositivo:</strong> Rastreamento por fingerprint de dispositivo (device fingerprint) para detectar criação de contas duplicadas com o objetivo de burlar limites ou regras da plataforma.</li>
                <li><strong>Padrão de compra suspeito:</strong> Análise comportamental automatizada que identifica anomalias como: compras em horários atípicos, valores discrepantes do perfil, volume incompatível com o histórico do usuário e tentativas repetidas de transação.</li>
              </ul>
            </Section>

            {/* 2 — Score de Risco */}
            <Section n={2} title="Sistema de Score de Risco">
              <p className="mb-3 text-muted-foreground">
                Cada transação e cada conta recebem uma pontuação de risco calculada automaticamente
                com base nos indicadores monitorados:
              </p>
              <div className="space-y-3">
                <ScoreLevel
                  level="Baixo"
                  color="text-green-600 dark:text-green-400"
                  bg="bg-green-500/10"
                  description="Transação aprovada automaticamente. Nenhuma ação adicional requerida."
                />
                <ScoreLevel
                  level="Médio"
                  color="text-amber-600 dark:text-amber-400"
                  bg="bg-amber-500/10"
                  description="Transação retida para análise manual. Documentação adicional poderá ser solicitada. Prazo de análise: até 48 horas úteis."
                />
                <ScoreLevel
                  level="Alto"
                  color="text-red-600 dark:text-red-400"
                  bg="bg-red-500/10"
                  description="Bloqueio automático e imediato da transação e/ou conta. O usuário será notificado e deverá apresentar documentação comprobatória para desbloqueio."
                />
              </div>
            </Section>

            {/* 3 — Bloqueio Preventivo */}
            <Section n={3} title="Bloqueio Preventivo Automático">
              <p className="mb-3 text-muted-foreground">
                O bloqueio preventivo será aplicado de forma automática e imediata nas seguintes situações:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li><strong>Chargeback (contestação de pagamento):</strong> Qualquer solicitação de estorno junto à operadora de cartão resultará no bloqueio imediato da conta até resolução completa da disputa.</li>
                <li><strong>Dados cadastrais inconsistentes:</strong> Divergência entre informações fornecidas no cadastro e dados verificados por fontes externas (bureaus de crédito, bases públicas).</li>
                <li><strong>Documento divergente:</strong> Incompatibilidade entre o documento de identificação apresentado e os dados vinculados ao meio de pagamento utilizado.</li>
              </ul>
              <div className="mt-3 p-3 rounded-md bg-muted border">
                <p className="text-xs text-muted-foreground">
                  <strong>Nota:</strong> O desbloqueio está condicionado à apresentação de documentação válida e à
                  conclusão favorável da análise de risco, podendo levar até 30 (trinta) dias úteis.
                </p>
              </div>
            </Section>

            {/* 4 — Documentação Obrigatória */}
            <Section n={4} title="Solicitação Obrigatória de Documentação">
              <p className="mb-3 text-muted-foreground">
                Em caso de score médio ou alto, ou sempre que houver indícios de irregularidade, a Plataforma
                exigirá obrigatoriamente a apresentação dos seguintes documentos:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li><strong>Documento com foto:</strong> Cópia legível de documento oficial com foto (RG, CNH ou Passaporte), em formato digital (JPG, PNG ou PDF), com resolução mínima que permita a verificação de autenticidade.</li>
                <li><strong>Selfie de validação:</strong> Foto do titular segurando o documento de identificação ao lado do rosto, para verificação biométrica de identidade (prova de vida).</li>
                <li><strong>Comprovante de pagamento:</strong> Fatura do cartão, extrato bancário ou recibo do gateway que comprove a titularidade do meio de pagamento utilizado na transação.</li>
              </ul>
              <div className="mt-3 p-3 rounded-md bg-muted border">
                <p className="text-xs text-muted-foreground">
                  <strong>Prazo:</strong> O usuário terá 5 (cinco) dias úteis para apresentar a documentação solicitada.
                  O não atendimento no prazo resultará no cancelamento da transação e possível bloqueio da conta.
                </p>
              </div>
            </Section>

            {/* 5 — Suspensão Definitiva */}
            <Section n={5} title="Suspensão Imediata e Definitiva">
              <p className="mb-3 text-muted-foreground">
                A conta do usuário será <strong>suspensa de forma imediata, permanente e irrevogável</strong> nas
                seguintes situações:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li><strong>Fraude comprovada:</strong> Qualquer ato fraudulento confirmado, incluindo falsificação de documentos, uso de identidade alheia ou declarações intencionalmente falsas.</li>
                <li><strong>Uso de cartão de terceiros:</strong> Utilização de meios de pagamento que não pertençam ao titular da conta, sem autorização formal e verificável do proprietário.</li>
                <li><strong>Tentativa de manipulação de comissão:</strong> Qualquer esquema identificado para inflar, falsificar ou manipular comissões, incluindo auto-referência, conluio entre afiliados ou criação de transações fictícias.</li>
              </ul>
              <div className="mt-3 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-xs font-medium text-destructive">
                  A suspensão definitiva implica na perda total de acesso à plataforma, cancelamento de
                  todos os benefícios e saldos pendentes, e comunicação formal às autoridades competentes
                  e órgãos de proteção ao crédito, conforme aplicável.
                </p>
              </div>
            </Section>

            {/* 6 — Retenção de Valores */}
            <Section n={6} title="Retenção de Valores em Investigação">
              <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/30">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2">
                  Cláusula de Retenção
                </p>
                <p className="text-muted-foreground">
                  "A empresa poderá reter valores por até <strong>180 (cento e oitenta) dias corridos</strong> em
                  caso de investigação de fraude, suspeita fundamentada de irregularidade ou pendência de
                  documentação comprobatória. Durante o período de retenção, o usuário não poderá solicitar
                  saque, transferência ou reembolso dos valores retidos. A liberação ocorrerá somente após
                  conclusão favorável da investigação."
                </p>
              </div>
            </Section>

            {/* 7 — Logs e Auditoria */}
            <Section n={7} title="Logs Internos e Auditoria">
              <p className="mb-3 text-muted-foreground">
                A Plataforma mantém sistema de logs internos administrativos para fins de auditoria,
                registrando de forma imutável e rastreável:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>Todas as transações financeiras realizadas, incluindo tentativas recusadas.</li>
                <li>Alterações cadastrais, de plano e de meios de pagamento.</li>
                <li>Acessos à plataforma com registro de IP, dispositivo, horário e geolocalização aproximada.</li>
                <li>Ações administrativas de bloqueio, desbloqueio e alteração de status de conta.</li>
                <li>Comunicações entre usuário e equipe de suporte/antifraude.</li>
                <li>Solicitações e envios de documentação comprobatória.</li>
              </ul>
              <div className="mt-3 p-3 rounded-md bg-muted border">
                <p className="text-xs text-muted-foreground">
                  <strong>Retenção:</strong> Os logs de auditoria são armazenados por período mínimo de 5 (cinco) anos,
                  em conformidade com a legislação brasileira vigente (Marco Civil da Internet — Lei nº 12.965/2014
                  e Lei Geral de Proteção de Dados — Lei nº 13.709/2018).
                </p>
              </div>
            </Section>

            {/* 8 — Disposições Finais */}
            <Section n={8} title="Disposições Finais">
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li>Esta Política Antifraude é parte integrante do Contrato de Prestação de Serviços e dos Termos de Uso da Plataforma.</li>
                <li>A Plataforma reserva-se o direito de atualizar esta política a qualquer momento, comunicando os usuários por e-mail ou notificação in-app.</li>
                <li>A continuidade do uso da Plataforma após a publicação de alterações constitui aceitação tácita das novas condições.</li>
                <li>Em caso de dúvidas sobre esta política, o usuário deverá entrar em contato pelo e-mail: <strong>antifraude@precify.com.br</strong>.</li>
              </ul>
            </Section>
          </div>

          {/* Footer */}
          <footer className="border-t pt-6">
            <p className="text-xs text-muted-foreground text-center">
              Política Antifraude — Versão {POLICY_VERSION} — Vigente a partir de {LAST_UPDATED}
              <br />
              Precify Tecnologia LTDA — Todos os direitos reservados.
            </p>
          </footer>
        </article>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold mb-2">
        {n}. {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function ScoreLevel({ level, color, bg, description }: { level: string; color: string; bg: string; description: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-md ${bg} border`}>
      <span className={`font-bold text-sm min-w-[60px] ${color}`}>{level}</span>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
