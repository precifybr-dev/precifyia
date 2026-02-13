import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CONTRACT_VERSION = "1.0.0";
const LAST_UPDATED = "13 de fevereiro de 2026";

export default function ServiceContract() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAccept = async () => {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Você precisa estar logado para aceitar o contrato.");
        return;
      }

      // Try to get IP
      let ip = "unknown";
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const json = await res.json();
        ip = json.ip;
      } catch {}

      const { error } = await supabase.from("contract_acceptances").insert({
        user_id: session.user.id,
        contract_version: CONTRACT_VERSION,
        ip_address: ip,
        user_agent: navigator.userAgent,
        metadata: { accepted_at_url: window.location.href },
      });

      if (error) throw error;
      toast.success("Contrato aceito com sucesso!");
      navigate(-1);
    } catch (err: any) {
      toast.error("Erro ao registrar aceite: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>

        <article className="bg-card border rounded-lg p-6 sm:p-10 space-y-8 text-foreground">
          {/* Header */}
          <header className="border-b pb-6 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Contrato de Prestação de Serviços
            </h1>
            <div className="text-sm text-muted-foreground space-y-0.5 mt-4">
              <p><strong>Empresa:</strong> TA ON - Precify Tecnologia LTDA</p>
              <p><strong>CNPJ:</strong> 48.245.923/0001-30</p>
              <p><strong>Última atualização:</strong> {LAST_UPDATED}</p>
              <p><strong>Versão:</strong> {CONTRACT_VERSION}</p>
            </div>
          </header>

          {/* Clauses */}
          <div className="space-y-6 text-sm leading-relaxed">
            <Section n={1} title="Objeto do Contrato">
              <p>
                A <strong>Precify Tecnologia LTDA</strong> ("Plataforma") atua como intermediadora tecnológica entre o
                cliente ("Usuário") e parceiros/profissionais cadastrados, fornecendo ferramentas para gestão de custos,
                precificação e controle operacional de estabelecimentos alimentícios. A Plataforma não se responsabiliza
                pela execução direta dos serviços prestados por terceiros.
              </p>
            </Section>

            <Section n={2} title="Cadastro e Responsabilidade do Usuário">
              <ul className="list-disc pl-5 space-y-1">
                <li>O Usuário declara, sob pena de responsabilidade civil e criminal, que todas as informações fornecidas no cadastro são verdadeiras, completas e atualizadas.</li>
                <li>É proibido manter cadastros duplicados. A identificação de duplicidade poderá resultar na suspensão ou cancelamento imediato da conta.</li>
                <li>A Plataforma reserva-se o direito de suspender ou cancelar contas que apresentem indícios de fraude, uso indevido ou violação dos presentes termos.</li>
              </ul>
            </Section>

            <Section n={3} title="Pagamentos">
              <ul className="list-disc pl-5 space-y-1">
                <li>Todos os pagamentos são processados por gateways de pagamento homologados, garantindo criptografia e segurança dos dados financeiros.</li>
                <li>Taxas administrativas e de processamento poderão ser retidas conforme a modalidade do plano contratado.</li>
                <li>A Plataforma reserva-se o direito de bloquear valores sob suspeita de fraude, estorno indevido ou atividade irregular, até conclusão de análise interna.</li>
              </ul>
            </Section>

            <Section n={4} title="Cancelamentos e Reembolsos">
              <ul className="list-disc pl-5 space-y-1">
                <li>O Usuário poderá solicitar o cancelamento de sua assinatura a qualquer momento, sendo que o acesso permanecerá ativo até o final do período já pago.</li>
                <li>Reembolsos serão processados em até 15 (quinze) dias úteis após a solicitação formal, limitados ao valor proporcional do período não utilizado.</li>
                <li>Não haverá devolução em caso de: (a) uso comprovado do serviço no período; (b) cancelamento após consumo de funcionalidades premium; (c) violação dos termos deste contrato.</li>
              </ul>
            </Section>

            <Section n={5} title="Política Antifraude">
              <ul className="list-disc pl-5 space-y-1">
                <li>Todas as transações realizadas na Plataforma poderão ser submetidas a análise antifraude automatizada e/ou manual.</li>
                <li>A conta do Usuário poderá ser bloqueada preventivamente em caso de comportamento atípico, incluindo, mas não se limitando a: múltiplas tentativas de pagamento, uso de dados de terceiros ou acesso de localidades incomuns.</li>
                <li>A Plataforma poderá solicitar documentos comprobatórios de identidade e titularidade dos meios de pagamento para liberação de serviços ou valores retidos.</li>
              </ul>
            </Section>

            <Section n={6} title="Responsabilidades da Plataforma">
              <ul className="list-disc pl-5 space-y-1">
                <li>A Plataforma não se responsabiliza por atos, omissões ou condutas de terceiros, incluindo parceiros, fornecedores e prestadores de serviços.</li>
                <li>A Plataforma atua exclusivamente como intermediadora tecnológica, fornecendo ferramentas de cálculo e gestão, sem garantir resultados financeiros específicos.</li>
                <li>Em nenhuma hipótese a Plataforma será responsável por danos indiretos, lucros cessantes ou perdas decorrentes do uso ou da impossibilidade de uso dos serviços.</li>
              </ul>
            </Section>

            <Section n={7} title="Multas e Penalidades">
              <ul className="list-disc pl-5 space-y-1">
                <li>O uso indevido da Plataforma, incluindo tentativas de burlar limites do plano, compartilhamento de credenciais ou engenharia reversa, sujeitará o Usuário à multa equivalente a 10 (dez) vezes o valor do último plano contratado, sem prejuízo de outras medidas legais cabíveis.</li>
                <li>Condutas fraudulentas comprovadas resultarão no bloqueio definitivo da conta, com perda imediata de acesso a todos os dados e funcionalidades, além da comunicação às autoridades competentes.</li>
              </ul>
            </Section>

            <Section n={8} title="Foro">
              <p>
                Fica eleito o Foro da Comarca de São Paulo, Estado de São Paulo, como competente para dirimir quaisquer
                controvérsias oriundas do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </p>
            </Section>
          </div>

          {/* Acceptance */}
          <div className="border-t pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="contract-accept"
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
              />
              <Label htmlFor="contract-accept" className="text-sm leading-relaxed cursor-pointer">
                Li e aceito o <strong>Contrato de Prestação de Serviços</strong> em sua versão {CONTRACT_VERSION}.
              </Label>
            </div>
            <Button
              onClick={handleAccept}
              disabled={!accepted || saving}
              className="w-full sm:w-auto"
            >
              {saving ? "Registrando aceite..." : "Confirmar Aceite"}
            </Button>
          </div>
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
      <div className="text-muted-foreground">{children}</div>
    </section>
  );
}
