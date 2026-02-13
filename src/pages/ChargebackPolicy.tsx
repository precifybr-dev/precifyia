import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const LAST_UPDATED = "13 de fevereiro de 2026";

export default function ChargebackPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <article className="bg-card border rounded-lg p-6 sm:p-10 space-y-8 text-foreground">
          <header className="border-b pb-6 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Política de Chargeback</h1>
            <div className="text-sm text-muted-foreground space-y-0.5 mt-4">
              <p><strong>Empresa:</strong> TA ON - Precify Tecnologia LTDA</p>
              <p><strong>CNPJ:</strong> 48.245.923/0001-30</p>
              <p><strong>Última atualização:</strong> {LAST_UPDATED}</p>
            </div>
          </header>

          <div className="space-y-6 text-sm leading-relaxed">
            <Section n={1} title="Definição de Chargeback">
              <p>
                Chargeback é o processo de contestação de uma transação financeira iniciado pelo titular do cartão junto
                à operadora ou banco emissor. A Plataforma trata <strong>todo chargeback como potencial indício de fraude</strong> até
                que se prove o contrário.
              </p>
            </Section>

            <Section n={2} title="Consequências Imediatas do Chargeback">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Suspensão imediata</strong> da conta do Usuário vinculado à transação contestada.</li>
                <li><strong>Bloqueio preventivo</strong> de todos os valores pendentes de liberação.</li>
                <li>Abertura automática de processo de investigação interna.</li>
                <li>Registro de alerta no sistema antifraude para monitoramento contínuo.</li>
              </ul>
            </Section>

            <Section n={3} title="Processo de Investigação">
              <ul className="list-disc pl-5 space-y-1">
                <li>Toda contestação será analisada pela equipe de segurança em até 5 (cinco) dias úteis.</li>
                <li>O Usuário será notificado por e-mail e terá até 10 (dez) dias úteis para apresentar documentação comprobatória.</li>
                <li>Documentos aceitos: comprovante de identidade, comprovante de titularidade do cartão, print de confirmação de compra.</li>
                <li>A ausência de resposta dentro do prazo será interpretada como desistência, e as medidas de segurança serão mantidas.</li>
              </ul>
            </Section>

            <Section n={4} title="Retenção de Valores">
              <ul className="list-disc pl-5 space-y-1">
                <li>A Plataforma poderá <strong>reter valores por até 180 (cento e oitenta) dias</strong> a partir da data do chargeback, conforme necessidade de investigação.</li>
                <li>Valores retidos serão liberados apenas após a conclusão favorável da análise.</li>
                <li>Em caso de fraude comprovada, os valores serão definitivamente confiscados e a conta permanentemente banida.</li>
              </ul>
            </Section>

            <Section n={5} title="Multas e Penalidades">
              <ul className="list-disc pl-5 space-y-1">
                <li>Chargebacks fraudulentos sujeitarão o Usuário a multa equivalente a <strong>10 (dez) vezes</strong> o valor da transação contestada.</li>
                <li>A Plataforma reserva-se o direito de cobrar custos administrativos e judiciais decorrentes da contestação indevida.</li>
                <li>Reincidência de chargebacks (2 ou mais em 6 meses) resultará em banimento definitivo.</li>
              </ul>
            </Section>

            <Section n={6} title="Chargebacks Legítimos">
              <ul className="list-disc pl-5 space-y-1">
                <li>Caso o chargeback seja considerado legítimo (ex: cobrança duplicada, erro de processamento), a Plataforma reembolsará integralmente o valor.</li>
                <li>A conta será reativada em até 2 (dois) dias úteis após a conclusão favorável.</li>
                <li>Nenhuma penalidade será aplicada em caso de chargeback legítimo comprovado.</li>
              </ul>
            </Section>

            <Section n={7} title="Prevenção de Chargebacks">
              <p>Para evitar chargebacks, recomendamos ao Usuário:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Utilizar exclusivamente cartões de sua titularidade.</li>
                <li>Verificar a descrição da cobrança na fatura do cartão (identificador: PRECIFY).</li>
                <li>Em caso de dúvidas sobre cobranças, contatar nosso suporte antes de acionar o banco.</li>
                <li>Manter seus dados cadastrais sempre atualizados.</li>
              </ul>
            </Section>

            <Section n={8} title="Comunicação às Autoridades">
              <p>
                A Plataforma poderá comunicar às autoridades competentes (Polícia Civil, Ministério Público, PROCON)
                qualquer caso de chargeback fraudulento comprovado, fornecendo todos os registros e evidências
                necessários para a investigação criminal.
              </p>
            </Section>

            <Section n={9} title="Foro">
              <p>
                Fica eleito o Foro da Comarca de São Paulo, Estado de São Paulo, como competente para dirimir quaisquer
                controvérsias oriundas desta Política, com renúncia expressa a qualquer outro.
              </p>
            </Section>
          </div>

          <div className="border-t pt-6 text-sm text-muted-foreground space-y-2">
            <p>Documentos complementares:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link></li>
              <li><Link to="/politica-antifraude" className="text-primary hover:underline">Política Antifraude</Link></li>
              <li><Link to="/cancelamento" className="text-primary hover:underline">Política de Cancelamento e Reembolso</Link></li>
            </ul>
          </div>
        </article>
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold mb-2">{n}. {title}</h2>
      <div className="text-muted-foreground">{children}</div>
    </section>
  );
}
