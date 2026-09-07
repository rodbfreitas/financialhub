import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Target,
  TrendingUp,
  Upload,
  Plug,
  Settings,
  CalendarRange,
  ShieldCheck,
  CircleHelp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Ajuda — Financial Hub Familiar" };

type TocItem = { id: string; label: string };

const TOC: TocItem[] = [
  { id: "visao-geral", label: "Visão Geral" },
  { id: "movimentacoes", label: "Movimentações" },
  { id: "planejamento", label: "Planejamento" },
  { id: "analises", label: "Análises" },
  { id: "documentos", label: "Documentos" },
  { id: "integracoes", label: "Integrações" },
  { id: "configuracoes", label: "Configurações" },
  { id: "perfil-e-periodo", label: "Filtros de perfil e período" },
  { id: "sua-conta", label: "Sua conta e segurança" },
  { id: "faq", label: "Perguntas frequentes" },
];

function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon className="size-4.5" />
        </span>
        <CardTitle className="text-base font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm text-foreground [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </CardContent>
    </Card>
  );
}

function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-3 first:border-t-0 first:pt-0">
      <p className="mb-1.5 text-sm font-medium text-foreground">{title}</p>
      <div className="flex flex-col gap-2 text-sm text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}

function EmDesenvolvimento() {
  return (
    <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
      Em desenvolvimento
    </span>
  );
}

function Faq({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="group rounded-md border border-border p-3 open:bg-secondary/40">
      <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:content-none">
        <span className="mr-2 inline-block text-muted-foreground transition-transform group-open:rotate-90">
          ›
        </span>
        {question}
      </summary>
      <div className="mt-2 pl-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}

/**
 * Central de Ajuda (manual + FAQ) — pedido explícito do usuário em 07/09/2026: hoje o
 * uso é pessoal, mas pode deixar de ser (outros membros da família usando por conta
 * própria), então o app precisa de uma explicação própria de cada menu, sem depender
 * de eu explicar por fora. Conteúdo estático (sem consulta ao banco) — só documentação.
 * Reflete o estado real de cada tela (algumas seções de Configurações ainda não têm
 * funcionalidade implementada — marcadas "Em desenvolvimento" — nunca finge que já
 * funcionam, mesmo princípio de honestidade usado no resto do produto).
 */
export default function AjudaPage() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Central de Ajuda</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Um guia rápido de cada tela do Financial Hub Familiar e as perguntas mais comuns. Se
          algo aqui não bater com o que você está vendo na tela, é mais provável que a tela
          esteja certa — avise quem cuida do app pra este guia ser corrigido.
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <nav aria-label="Sumário" className="flex flex-wrap gap-2">
            {TOC.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Section id="visao-geral" icon={LayoutDashboard} title="Visão Geral">
          <p>
            É a primeira tela depois do login — um resumo do período selecionado no topo (por
            padrão, o mês atual): receitas, despesas, saldo, taxa de poupança e uma projeção de
            saldo para os próximos 30 dias, além de gráficos de evolução mensal de
            receitas/despesas e do saldo ao longo do tempo.
          </p>
          <p>
            Os valores aqui mudam de acordo com os filtros de <strong>período</strong> e{" "}
            <strong>perfil</strong> no canto superior direito — veja a seção{" "}
            <a href="#perfil-e-periodo" className="text-primary hover:underline">
              Filtros de perfil e período
            </a>{" "}
            mais abaixo.
          </p>
        </Section>

        <Section id="movimentacoes" icon={ArrowLeftRight} title="Movimentações">
          <SubSection title="Transações">
            <p>
              A lista completa de lançamentos (receitas e despesas) do período. Dá pra criar um
              lançamento manual, editar ou excluir um existente, marcar uma compra como
              parcelada (o sistema gera as parcelas futuras automaticamente), registrar uma
              transferência entre duas contas suas, ou dividir uma única compra em mais de uma
              categoria (ex.: uma nota de mercado com itens de categorias diferentes).
            </p>
          </SubSection>
          <SubSection title="Contas">
            <p>
              Suas contas bancárias e carteiras (dinheiro em espécie, poupança, conta corrente
              etc.), com o saldo de cada uma. É o destino das transações que não são de cartão de
              crédito.
            </p>
          </SubSection>
          <SubSection title="Cartões">
            <p>
              Seus cartões de crédito, com dia de fechamento e vencimento da fatura — usados para
              agrupar corretamente as compras de cada fatura e os parcelamentos.
            </p>
          </SubSection>
          <SubSection title="Assinaturas">
            <p>
              Cobranças recorrentes (streaming, academia, softwares etc.) para acompanhar quanto
              elas somam por mês e não serem confundidas com uma compra avulsa.
            </p>
          </SubSection>
        </Section>

        <Section id="planejamento" icon={Target} title="Planejamento">
          <SubSection title="Orçamento">
            <p>
              Defina um limite de gasto por categoria a cada mês e acompanhe, ao longo do
              período, quanto já foi gasto perto desse limite.
            </p>
          </SubSection>
          <SubSection title="Metas">
            <p>
              Metas de economia com um valor alvo e, opcionalmente, uma data (ex.: reserva de
              emergência, uma viagem) — acompanhe o progresso conforme você guarda dinheiro para
              elas.
            </p>
          </SubSection>
        </Section>

        <Section id="analises" icon={TrendingUp} title="Análises">
          <SubSection title="Relatórios">
            <p>
              Gráficos e tabelas de receitas e despesas por categoria e por período, para
              entender para onde o dinheiro está indo além do resumo da Visão Geral.
            </p>
          </SubSection>
          <SubSection title="Patrimônio">
            <p>
              Seus bens (ativos: imóveis, veículos, investimentos etc.) e dívidas (passivos),
              para acompanhar o patrimônio líquido da família ao longo do tempo — separado do
              fluxo de caixa do dia a dia em Movimentações.
            </p>
          </SubSection>
        </Section>

        <Section id="documentos" icon={Upload} title="Documentos">
          <p>
            Em vez de digitar cada lançamento à mão, dá para enviar o próprio arquivo e deixar o
            sistema tentar ler por você — sempre com uma etapa de revisão sua antes de qualquer
            coisa virar transação de verdade. Documento enviado nunca é a mesma coisa que
            transação confirmada.
          </p>
          <SubSection title="Enviar documentos">
            <p>Aceita PDF, JPG ou PNG de faturas de cartão, extratos bancários, boletos e comprovantes (PIX, transferência, pagamento). O fluxo é sempre o mesmo:</p>
            <ul>
              <li>Enviar o arquivo em Documentos → Enviar documentos.</li>
              <li>Aguardar o processamento automático (alguns segundos).</li>
              <li>
                Se algo foi identificado, abrir <strong>Revisar</strong> e, um por um, aceitar,
                editar ou rejeitar cada lançamento sugerido.
              </li>
              <li>
                Cada evento aceito vira uma linha de importação — se o sistema não conseguir
                adivinhar sozinho a conta ou cartão de destino, ele pergunta antes de confirmar.
              </li>
              <li>Confirmar a importação para as transações aparecerem em Movimentações.</li>
            </ul>
            <p>
              Se o arquivo não tiver texto reconhecível (por exemplo, uma foto tirada de longe),
              o sistema avisa honestamente em vez de inventar um valor — nesse caso, é só lançar
              manualmente em Transações.
            </p>
          </SubSection>
          <SubSection title="Importações (CSV/XLSX/OFX)">
            <p>
              Para quem já tem um arquivo exportado do banco nesses formatos: envia o arquivo,
              confere o mapeamento de colunas (data, descrição, valor) e revisa a mesma tela de
              importação antes de confirmar. Duplicatas (uma linha que já existe como transação)
              vêm desmarcadas por padrão.
            </p>
          </SubSection>
        </Section>

        <Section id="integracoes" icon={Plug} title="Integrações">
          <p>
            Conexão automática com bancos (Open Finance/Open Banking), sem precisar enviar
            documento nem importar arquivo manualmente.
            <EmDesenvolvimento />
          </p>
          <p>Por enquanto, o caminho para trazer dados do banco é Documentos ou Importações.</p>
        </Section>

        <Section id="configuracoes" icon={Settings} title="Configurações">
          <SubSection title="Conta">
            <p>Seus dados de login (nome, e-mail) — mesma tela aberta pelo menu do seu usuário no canto superior direito.</p>
          </SubSection>
          <SubSection title="Segurança">
            <p>
              Alterar senha e ativar a verificação em duas etapas (MFA) com um aplicativo
              autenticador (Google Authenticator, Authy etc.) — recomendado para reforçar a
              proteção da conta.
            </p>
          </SubSection>
          <SubSection title="Household">
            <p>
              Nome da família e gestão de quem mais tem acesso a este household.
              <EmDesenvolvimento />
            </p>
          </SubSection>
          <SubSection title="Perfis">
            <p>
              Os perfis financeiros do household (um por pessoa, mais um perfil “Compartilhado”
              para despesas da casa) — são esses perfis que aparecem no filtro “Perfil” no topo
              de várias telas.
            </p>
          </SubSection>
          <SubSection title="Categorias">
            <p>Categorias e subcategorias usadas para classificar receitas e despesas — dá para criar, renomear e organizar as suas.</p>
          </SubSection>
          <SubSection title="Preferências">
            <p>
              Idioma, moeda e formato de exibição de valores e datas.
              <EmDesenvolvimento />
            </p>
          </SubSection>
          <SubSection title="Dados e privacidade">
            <p>
              Exportação e exclusão dos seus dados, conforme a LGPD.
              <EmDesenvolvimento />
            </p>
          </SubSection>
        </Section>

        <Section id="perfil-e-periodo" icon={CalendarRange} title="Filtros de perfil e período">
          <p>
            No canto superior direito, presentes na maioria das telas, dois filtros valem para a
            tela inteira até você trocar de novo:
          </p>
          <ul>
            <li>
              <strong>Período</strong> — o mês (ou intervalo) que está sendo mostrado; use as
              setas ao lado para navegar entre meses.
            </li>
            <li>
              <strong>Perfil</strong> — “Todos” mostra os lançamentos do household inteiro;
              escolher uma pessoa (ou o perfil “Compartilhado”) filtra só o que é dela. Enquanto
              nenhum perfil estiver cadastrado em Configurações → Perfis, só a opção “Todos”
              aparece aqui.
            </li>
          </ul>
        </Section>

        <Section id="sua-conta" icon={ShieldCheck} title="Sua conta e segurança">
          <p>
            Clicando no seu nome no canto superior direito (ou no seu avatar, no rodapé da barra
            lateral) abre um menu com seu nome, e-mail, acesso a{" "}
            <strong>Configurações da conta</strong> e a opção <strong>Sair</strong>.
          </p>
          <p>
            Seus dados ficam isolados por household: ninguém de outra família cadastrada no
            sistema consegue ver os seus lançamentos, contas ou documentos — essa separação é
            garantida pelo banco de dados, não só pela interface. Ative a verificação em duas
            etapas em Configurações → Segurança para uma camada extra de proteção.
          </p>
        </Section>

        <Section id="faq" icon={CircleHelp} title="Perguntas frequentes">
          <div className="flex flex-col gap-2">
            <Faq question="Isso substitui o aplicativo do meu banco?">
              Não. O Financial Hub é um painel que reúne, num só lugar, o que você lança
              manualmente, importa de arquivos ou envia como documento — ele não se conecta
              automaticamente à sua conta bancária (isso é a Integrações, que ainda está em
              desenvolvimento).
            </Faq>
            <Faq question="Se eu enviar um extrato ou fatura, ele cria as transações sozinho?">
              Não diretamente. Todo documento enviado passa por uma etapa de revisão sua antes de
              qualquer lançamento virar transação de verdade — o sistema sugere, você decide.
            </Faq>
            <Faq question="Posso usar com o resto da família?">
              Sim. Cada household pode ter vários perfis (um por pessoa, mais um compartilhado) e
              o filtro “Perfil” no topo permite ver os lançamentos de todo mundo ou só de uma
              pessoa. Cadastre os perfis em Configurações → Perfis.
            </Faq>
            <Faq question="Meus dados financeiros estão seguros?">
              Cada família só enxerga os próprios dados — essa separação é garantida no nível do
              banco de dados, não só escondida na tela. Recomendamos ativar a verificação em duas
              etapas (MFA) em Configurações → Segurança.
            </Faq>
            <Faq question="Por que a primeira tela às vezes demora mais para carregar?">
              Depois de um período longo sem ninguém usar o app, o banco de dados do plano atual
              entra em modo de espera para economizar recursos e leva alguns instantes extras
              para “acordar” no primeiro acesso. É esperado e não indica um problema — as próximas
              telas carregam normalmente.
            </Faq>
            <Faq question="Como envio a fatura do meu cartão de crédito?">
              Em Documentos → Enviar documentos, envie o PDF da fatura. Depois de processada,
              revise os lançamentos identificados e confirme a importação.
            </Faq>
            <Faq question="O que é o filtro “Perfil: Todos” que aparece em várias telas?">
              Um jeito rápido de olhar só os lançamentos de uma pessoa da família (ou de todo
              mundo, com “Todos”) sem precisar filtrar manualmente em cada relatório.
            </Faq>
            <Faq question="Esqueci minha senha — e agora?">
              Na tela de login, use o link “Esqueci minha senha” para receber um e-mail de
              redefinição.
            </Faq>
            <Faq question="Como eu saio da minha conta?">
              Clique no seu nome no canto superior direito (ou no rodapé da barra lateral) e
              escolha “Sair”.
            </Faq>
            <Faq question="Posso excluir meus dados do sistema?">
              A tela de exportação/exclusão de dados (Configurações → Dados e privacidade) ainda
              está em desenvolvimento. Por enquanto, fale diretamente com quem administra o
              projeto.
            </Faq>
          </div>
        </Section>
      </div>
    </div>
  );
}
