import { Link } from "react-router-dom";
import { ArrowLeft, Cookie } from "lucide-react";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Cookie className="w-5 h-5 text-primary" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">Política de Cookies</h1>
        </div>

        <p className="text-muted-foreground text-sm mb-8">Última atualização: 15 de fevereiro de 2026</p>

        <div className="prose prose-sm max-w-none space-y-6 text-foreground/90">
          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">1. O que são Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cookies são pequenos arquivos de texto armazenados no seu dispositivo (computador, tablet ou celular) quando você visita um site. 
              Eles são amplamente utilizados para fazer os sites funcionarem de maneira mais eficiente, bem como para fornecer informações aos proprietários do site.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">2. Como Utilizamos os Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">A plataforma Precify utiliza cookies para os seguintes fins:</p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Cookies essenciais:</strong> Necessários para o funcionamento básico do site, como autenticação, segurança e preferências de sessão. Sem eles, o site não funciona corretamente.</li>
              <li><strong className="text-foreground">Cookies de desempenho:</strong> Coletam informações sobre como os visitantes utilizam o site (páginas mais visitadas, erros encontrados), ajudando-nos a melhorar a experiência.</li>
              <li><strong className="text-foreground">Cookies de funcionalidade:</strong> Permitem que o site lembre suas escolhas (como tema claro/escuro, loja selecionada) para oferecer uma experiência personalizada.</li>
              <li><strong className="text-foreground">Cookies de análise:</strong> Utilizamos ferramentas como Google Analytics para entender o comportamento dos usuários e otimizar nossos serviços.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">3. Quais Cookies Utilizamos?</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-3 font-semibold text-foreground">Cookie</th>
                    <th className="text-left p-3 font-semibold text-foreground">Tipo</th>
                    <th className="text-left p-3 font-semibold text-foreground">Finalidade</th>
                    <th className="text-left p-3 font-semibold text-foreground">Duração</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t border-border">
                    <td className="p-3">sb-*-auth-token</td>
                    <td className="p-3">Essencial</td>
                    <td className="p-3">Autenticação do usuário</td>
                    <td className="p-3">Sessão</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">theme</td>
                    <td className="p-3">Funcionalidade</td>
                    <td className="p-3">Preferência de tema (claro/escuro)</td>
                    <td className="p-3">Persistente</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">cookie-consent</td>
                    <td className="p-3">Essencial</td>
                    <td className="p-3">Registro do consentimento de cookies</td>
                    <td className="p-3">Persistente</td>
                  </tr>
                  <tr className="border-t border-border">
                    <td className="p-3">_ga / _gid</td>
                    <td className="p-3">Análise</td>
                    <td className="p-3">Google Analytics</td>
                    <td className="p-3">2 anos / 24h</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">4. Como Gerenciar Cookies?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Você pode controlar e/ou excluir cookies conforme desejar. A maioria dos navegadores permite que você:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li>Veja quais cookies estão armazenados e os exclua individualmente</li>
              <li>Bloqueie cookies de terceiros</li>
              <li>Bloqueie cookies de sites específicos</li>
              <li>Bloqueie todos os cookies</li>
              <li>Exclua todos os cookies ao fechar o navegador</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-2">
              <strong className="text-foreground">Atenção:</strong> Ao desativar cookies essenciais, algumas funcionalidades do Precify podem não funcionar corretamente, incluindo login e salvamento de preferências.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">5. Cookies de Terceiros</h2>
            <p className="text-muted-foreground leading-relaxed">
              Alguns cookies são colocados por serviços de terceiros que aparecem em nossas páginas. Não controlamos esses cookies. 
              Os principais terceiros que podem instalar cookies através do nosso site são:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Google Analytics:</strong> Para análise de tráfego e comportamento</li>
              <li><strong className="text-foreground">Cloudflare Turnstile:</strong> Para proteção contra bots e spam</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">6. Base Legal (LGPD)</h2>
            <p className="text-muted-foreground leading-relaxed">
              Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o uso de cookies essenciais 
              é fundamentado no legítimo interesse para garantir o funcionamento do site. Para cookies de análise e 
              marketing, solicitamos seu consentimento explícito através do banner de cookies exibido em sua primeira visita.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">7. Alterações nesta Política</h2>
            <p className="text-muted-foreground leading-relaxed">
              Podemos atualizar esta Política de Cookies periodicamente. Recomendamos que você revise esta página 
              regularmente para se manter informado sobre como utilizamos cookies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold text-foreground">8. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Se tiver dúvidas sobre nossa Política de Cookies, entre em contato conosco através do{" "}
              <a href="https://wa.me/5547996887776" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                WhatsApp
              </a>.
            </p>
            <p className="text-muted-foreground text-sm mt-4">
              TA ON - Precify Tecnologia LTDA<br />
              CNPJ: 48.245.923/0001-30
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
