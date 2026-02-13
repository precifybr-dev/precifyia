import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const LAST_UPDATED = "13 de fevereiro de 2026";

export default function TermsOfUse() {
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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Termos de Uso</h1>
            <div className="text-sm text-muted-foreground space-y-0.5 mt-4">
              <p><strong>Empresa:</strong> TA ON - Precify Tecnologia LTDA</p>
              <p><strong>CNPJ:</strong> 48.245.923/0001-30</p>
              <p><strong>Última atualização:</strong> {LAST_UPDATED}</p>
            </div>
          </header>

          <div className="space-y-6 text-sm leading-relaxed">
            <Section n={1} title="Aceitação dos Termos">
              <p>
                Ao acessar ou utilizar a plataforma <strong>Precify</strong>, o Usuário declara ter lido, compreendido e aceito
                integralmente os presentes Termos de Uso. Caso não concorde com qualquer disposição, o Usuário deverá
                cessar imediatamente o uso da Plataforma.
              </p>
            </Section>

            <Section n={2} title="Definições">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Plataforma:</strong> Sistema web Precify, acessível via navegador.</li>
                <li><strong>Usuário:</strong> Pessoa física ou jurídica que utiliza os serviços da Plataforma.</li>
                <li><strong>Serviços:</strong> Ferramentas de gestão de custos, precificação e controle operacional.</li>
                <li><strong>Conteúdo:</strong> Dados, textos, imagens e informações inseridos pelo Usuário.</li>
              </ul>
            </Section>

            <Section n={3} title="Elegibilidade">
              <p>
                O uso da Plataforma é restrito a pessoas com 18 (dezoito) anos completos ou mais, ou a menores de idade
                devidamente representados por seus responsáveis legais. O Usuário declara possuir capacidade civil plena
                para aceitar estes Termos.
              </p>
            </Section>

            <Section n={4} title="Cadastro e Conta do Usuário">
              <ul className="list-disc pl-5 space-y-1">
                <li>O Usuário é responsável pela veracidade de todas as informações fornecidas no cadastro.</li>
                <li>Cada Usuário poderá manter apenas uma conta ativa. Cadastros duplicados serão removidos.</li>
                <li>O Usuário é inteiramente responsável pela segurança de suas credenciais de acesso.</li>
                <li>Qualquer atividade realizada através da conta do Usuário será de sua responsabilidade.</li>
              </ul>
            </Section>

            <Section n={5} title="Limitação de Responsabilidade">
              <ul className="list-disc pl-5 space-y-1">
                <li>A Plataforma atua <strong>exclusivamente como intermediadora tecnológica</strong>, fornecendo ferramentas de cálculo e gestão.</li>
                <li>A Plataforma <strong>não se responsabiliza por atos, omissões ou condutas de terceiros</strong>, incluindo parceiros, fornecedores e prestadores de serviços.</li>
                <li>A responsabilidade da Plataforma é <strong>limitada ao valor efetivamente pago pelo Usuário</strong> nos últimos 12 (doze) meses.</li>
                <li>Em nenhuma hipótese a Plataforma será responsável por danos indiretos, lucros cessantes, perda de dados ou perdas decorrentes do uso ou impossibilidade de uso dos serviços.</li>
                <li>A Plataforma não garante resultados financeiros específicos decorrentes do uso de suas ferramentas.</li>
              </ul>
            </Section>

            <Section n={6} title="Propriedade Intelectual">
              <p>
                Todo o conteúdo da Plataforma, incluindo mas não se limitando a textos, código-fonte, logotipos, ícones,
                interfaces, algoritmos e bases de dados, é de propriedade exclusiva da Precify Tecnologia LTDA, protegido
                pelas leis de propriedade intelectual. É vedada a reprodução, cópia, distribuição ou engenharia reversa,
                total ou parcial, sem autorização prévia e expressa.
              </p>
            </Section>

            <Section n={7} title="Uso Proibido">
              <ul className="list-disc pl-5 space-y-1">
                <li>Utilizar a Plataforma para fins ilícitos ou em desacordo com a legislação vigente.</li>
                <li>Tentar acessar áreas restritas, sistemas internos ou dados de outros Usuários.</li>
                <li>Realizar engenharia reversa, descompilar ou tentar obter o código-fonte da Plataforma.</li>
                <li>Compartilhar credenciais de acesso com terceiros.</li>
                <li>Utilizar robôs, scrapers ou qualquer mecanismo automatizado sem autorização.</li>
                <li>Burlar limitações de planos ou funcionalidades da Plataforma.</li>
              </ul>
            </Section>

            <Section n={8} title="Suspensão e Encerramento Unilateral">
              <ul className="list-disc pl-5 space-y-1">
                <li>A Plataforma reserva-se o direito de <strong>suspender ou encerrar unilateralmente</strong> a conta de qualquer Usuário, sem aviso prévio, em caso de violação destes Termos.</li>
                <li>A suspensão poderá ser temporária ou definitiva, a critério exclusivo da Plataforma.</li>
                <li>Em caso de suspensão por fraude ou violação, o Usuário <strong>não terá direito a reembolso</strong> de valores pagos.</li>
                <li>A Plataforma poderá reter valores por até <strong>180 (cento e oitenta) dias</strong> em caso de investigação.</li>
              </ul>
            </Section>

            <Section n={9} title="Modificações dos Termos">
              <p>
                A Plataforma reserva-se o direito de modificar estes Termos a qualquer momento. As alterações serão
                comunicadas por e-mail e/ou notificação dentro da Plataforma. O uso continuado após a notificação
                constitui aceitação das modificações.
              </p>
            </Section>

            <Section n={10} title="Foro">
              <p>
                Fica eleito o Foro da Comarca de São Paulo, Estado de São Paulo, como competente para dirimir quaisquer
                controvérsias oriundas dos presentes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </p>
            </Section>

            <Section n={11} title="Disposições Gerais">
              <ul className="list-disc pl-5 space-y-1">
                <li>A tolerância quanto ao descumprimento de qualquer cláusula não implicará renúncia ao direito de exigir o cumprimento.</li>
                <li>Se qualquer disposição for considerada inválida, as demais permanecerão em pleno vigor.</li>
                <li>Estes Termos constituem o acordo integral entre as partes, substituindo quaisquer entendimentos anteriores.</li>
              </ul>
            </Section>
          </div>

          <div className="border-t pt-6 text-sm text-muted-foreground space-y-2">
            <p>Documentos complementares:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><Link to="/contrato" className="text-primary hover:underline">Contrato de Prestação de Serviços</Link></li>
              <li><Link to="/privacidade" className="text-primary hover:underline">Política de Privacidade (LGPD)</Link></li>
              <li><Link to="/politica-antifraude" className="text-primary hover:underline">Política Antifraude</Link></li>
              <li><Link to="/cancelamento" className="text-primary hover:underline">Política de Cancelamento e Reembolso</Link></li>
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
