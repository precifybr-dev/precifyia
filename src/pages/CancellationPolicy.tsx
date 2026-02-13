import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const LAST_UPDATED = "13 de fevereiro de 2026";

export default function CancellationPolicy() {
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Política de Cancelamento e Reembolso</h1>
            <div className="text-sm text-muted-foreground space-y-0.5 mt-4">
              <p><strong>Empresa:</strong> TA ON - Precify Tecnologia LTDA</p>
              <p><strong>CNPJ:</strong> 48.245.923/0001-30</p>
              <p><strong>Última atualização:</strong> {LAST_UPDATED}</p>
            </div>
          </header>

          <div className="space-y-6 text-sm leading-relaxed">
            <Section n={1} title="Direito de Cancelamento">
              <ul className="list-disc pl-5 space-y-1">
                <li>O Usuário poderá solicitar o cancelamento de sua assinatura a qualquer momento diretamente na Plataforma ou via e-mail.</li>
                <li>O acesso aos serviços permanecerá ativo até o final do período de faturamento já pago.</li>
                <li>Após o cancelamento, os dados do Usuário serão mantidos por 30 (trinta) dias para possível reativação, após os quais serão definitivamente excluídos.</li>
              </ul>
            </Section>

            <Section n={2} title="Direito de Arrependimento (Art. 49, CDC)">
              <ul className="list-disc pl-5 space-y-1">
                <li>O Usuário poderá exercer o direito de arrependimento em até 7 (sete) dias corridos após a contratação, sem necessidade de justificativa.</li>
                <li>O reembolso integral será processado em até 10 (dez) dias úteis.</li>
                <li>Após o prazo de 7 dias, aplicam-se as regras de reembolso proporcional descritas abaixo.</li>
              </ul>
            </Section>

            <Section n={3} title="Reembolso Proporcional">
              <ul className="list-disc pl-5 space-y-1">
                <li>Reembolsos após o prazo de arrependimento serão calculados proporcionalmente ao período não utilizado.</li>
                <li>O processamento ocorrerá em até 15 (quinze) dias úteis após a solicitação formal.</li>
                <li>Valores serão devolvidos pelo mesmo meio de pagamento utilizado na contratação.</li>
              </ul>
            </Section>

            <Section n={4} title="Situações sem Direito a Reembolso">
              <ul className="list-disc pl-5 space-y-1">
                <li>Uso comprovado de funcionalidades premium durante o período.</li>
                <li>Cancelamento motivado por violação dos Termos de Uso pelo Usuário.</li>
                <li>Conta suspensa ou banida por fraude, uso indevido ou conduta irregular.</li>
                <li>Consumo de créditos de funcionalidades com uso limitado (ex: importações, gerações por IA).</li>
              </ul>
            </Section>

            <Section n={5} title="Retenção de Valores">
              <ul className="list-disc pl-5 space-y-1">
                <li>A Plataforma reserva-se o direito de <strong>reter valores por até 180 (cento e oitenta) dias</strong> em caso de investigação de fraude ou disputas de pagamento.</li>
                <li>Valores retidos serão liberados após a conclusão da investigação, caso nenhuma irregularidade seja comprovada.</li>
                <li>Em caso de fraude comprovada, os valores retidos serão definitivamente confiscados.</li>
              </ul>
            </Section>

            <Section n={6} title="Cancelamento pela Plataforma">
              <ul className="list-disc pl-5 space-y-1">
                <li>A Plataforma poderá cancelar unilateralmente a conta do Usuário em caso de violação dos Termos de Uso, Política Antifraude ou qualquer documento legal vigente.</li>
                <li>A Plataforma poderá cancelar contas inativas por mais de 12 (doze) meses consecutivos, mediante notificação prévia de 30 (trinta) dias.</li>
                <li>Nenhum reembolso será devido em caso de cancelamento motivado por conduta irregular do Usuário.</li>
              </ul>
            </Section>

            <Section n={7} title="Procedimento de Solicitação">
              <p>
                Para solicitar cancelamento ou reembolso, o Usuário deverá entrar em contato via WhatsApp informando:
                nome completo, e-mail cadastrado, motivo da solicitação e, se aplicável, comprovante de pagamento.
                A equipe responderá em até 3 (três) dias úteis.
              </p>
            </Section>

            <Section n={8} title="Foro">
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
              <li><Link to="/contrato" className="text-primary hover:underline">Contrato de Prestação de Serviços</Link></li>
              <li><Link to="/chargeback" className="text-primary hover:underline">Política de Chargeback</Link></li>
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
