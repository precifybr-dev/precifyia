import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const LAST_UPDATED = "13 de fevereiro de 2026";

export default function PrivacyPolicy() {
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Política de Privacidade (LGPD)</h1>
            <div className="text-sm text-muted-foreground space-y-0.5 mt-4">
              <p><strong>Empresa:</strong> TA ON - Precify Tecnologia LTDA</p>
              <p><strong>CNPJ:</strong> 48.245.923/0001-30</p>
              <p><strong>Encarregado de Dados (DPO):</strong> privacidade@precify.com.br</p>
              <p><strong>Última atualização:</strong> {LAST_UPDATED}</p>
            </div>
          </header>

          <div className="space-y-6 text-sm leading-relaxed">
            <Section n={1} title="Introdução">
              <p>
                A <strong>Precify Tecnologia LTDA</strong> está comprometida com a proteção dos dados pessoais de seus Usuários,
                em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD). Esta Política
                descreve como coletamos, utilizamos, armazenamos e protegemos suas informações.
              </p>
            </Section>

            <Section n={2} title="Dados Coletados">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Dados de cadastro:</strong> Nome, e-mail, telefone, CNPJ/CPF, nome do estabelecimento.</li>
                <li><strong>Dados de uso:</strong> Logs de acesso, endereço IP, user-agent, geolocalização aproximada, páginas acessadas.</li>
                <li><strong>Dados financeiros:</strong> Informações de plano contratado, histórico de pagamentos (processados por gateway terceiro).</li>
                <li><strong>Dados operacionais:</strong> Ingredientes, receitas, custos e precificações inseridos pelo Usuário.</li>
                <li><strong>Cookies e tecnologias similares:</strong> Para manutenção de sessão, análise de uso e personalização.</li>
              </ul>
            </Section>

            <Section n={3} title="Finalidade do Tratamento">
              <ul className="list-disc pl-5 space-y-1">
                <li>Prestação e melhoria dos serviços da Plataforma.</li>
                <li>Autenticação e segurança da conta do Usuário.</li>
                <li>Processamento de pagamentos e gestão de assinaturas.</li>
                <li>Comunicação de atualizações, novidades e suporte.</li>
                <li>Prevenção a fraudes e cumprimento de obrigações legais.</li>
                <li>Análise estatística e desenvolvimento de novas funcionalidades.</li>
              </ul>
            </Section>

            <Section n={4} title="Base Legal para o Tratamento">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Execução de contrato:</strong> Para prestação dos serviços contratados.</li>
                <li><strong>Consentimento:</strong> Quando aplicável, obtido de forma livre, informada e inequívoca.</li>
                <li><strong>Legítimo interesse:</strong> Para melhoria dos serviços e prevenção a fraudes.</li>
                <li><strong>Obrigação legal:</strong> Para cumprimento de determinações legais e regulatórias.</li>
              </ul>
            </Section>

            <Section n={5} title="Compartilhamento de Dados">
              <ul className="list-disc pl-5 space-y-1">
                <li>Processadores de pagamento homologados para execução de transações financeiras.</li>
                <li>Provedores de infraestrutura e hospedagem em nuvem.</li>
                <li>Autoridades competentes quando exigido por lei ou ordem judicial.</li>
                <li>A Plataforma <strong>não comercializa dados pessoais</strong> de seus Usuários.</li>
              </ul>
            </Section>

            <Section n={6} title="Armazenamento e Segurança">
              <ul className="list-disc pl-5 space-y-1">
                <li>Os dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso.</li>
                <li>Acesso restrito a colaboradores autorizados, mediante autenticação multifator.</li>
                <li>Backups periódicos e monitoramento contínuo de segurança.</li>
                <li>Políticas de retenção definidas conforme a finalidade do tratamento.</li>
              </ul>
            </Section>

            <Section n={7} title="Direitos do Titular (Art. 18 da LGPD)">
              <p className="mb-2">O Usuário pode exercer os seguintes direitos a qualquer momento, mediante solicitação ao DPO:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Confirmação da existência de tratamento de dados.</li>
                <li>Acesso aos dados pessoais tratados.</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários.</li>
                <li>Portabilidade dos dados a outro fornecedor.</li>
                <li>Eliminação dos dados tratados com consentimento.</li>
                <li>Revogação do consentimento.</li>
                <li>Informação sobre compartilhamento com terceiros.</li>
              </ul>
              <p className="mt-2">
                Solicitações devem ser enviadas para: <strong>privacidade@precify.com.br</strong>. O prazo de resposta é de até
                15 (quinze) dias úteis.
              </p>
            </Section>

            <Section n={8} title="Retenção de Dados">
              <ul className="list-disc pl-5 space-y-1">
                <li>Dados de conta: Mantidos enquanto a conta estiver ativa, mais 5 (cinco) anos após encerramento.</li>
                <li>Dados financeiros: Mantidos por 5 (cinco) anos conforme legislação fiscal.</li>
                <li>Logs de acesso: Mantidos por 6 (seis) meses conforme Marco Civil da Internet.</li>
                <li>Dados de investigação de fraude: Mantidos por até 180 (cento e oitenta) dias após conclusão.</li>
              </ul>
            </Section>

            <Section n={9} title="Transferência Internacional">
              <p>
                Os dados poderão ser transferidos e armazenados em servidores localizados fora do Brasil, em países que
                ofereçam nível adequado de proteção de dados ou mediante cláusulas contratuais padrão, conforme previsto
                na LGPD.
              </p>
            </Section>

            <Section n={10} title="Alterações nesta Política">
              <p>
                Esta Política poderá ser atualizada periodicamente. Alterações significativas serão comunicadas por e-mail
                e/ou notificação na Plataforma. O uso continuado após a notificação constitui aceitação das alterações.
              </p>
            </Section>

            <Section n={11} title="Contato">
              <p>
                Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de seus dados pessoais, entre em contato
                com nosso Encarregado de Dados (DPO): <strong>privacidade@precify.com.br</strong>.
              </p>
            </Section>
          </div>

          <div className="border-t pt-6 text-sm text-muted-foreground space-y-2">
            <p>Documentos complementares:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><Link to="/termos" className="text-primary hover:underline">Termos de Uso</Link></li>
              <li><Link to="/contrato" className="text-primary hover:underline">Contrato de Prestação de Serviços</Link></li>
              <li><Link to="/politica-antifraude" className="text-primary hover:underline">Política Antifraude</Link></li>
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
