import React, { useState } from "react";
import { ChevronDown, ChevronRight, BookOpen, Users, Settings, GitBranch, BarChart2, FileText, Database, Shield, Zap, Clock, CheckCircle2, AlertTriangle, Info } from "lucide-react";

const Section = ({ title, icon, color, children, defaultOpen = false }) => {
  const Icon = icon;
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`border rounded-xl overflow-hidden mb-4`} style={{ borderColor: color + "40" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50"
        style={{ backgroundColor: color + "08" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
            {Icon && <Icon className="w-4 h-4" style={{ color }} />}
          </div>
          <span className="font-semibold text-slate-800 text-base">{title}</span>
        </div>
        {open ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
      </button>
      {open && <div className="px-5 py-4 border-t" style={{ borderColor: color + "20" }}>{children}</div>}
    </div>
  );
};

const SubSection = ({ title, children }) => (
  <div className="mb-5">
    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
      <span className="w-1 h-4 rounded bg-blue-400 inline-block" />
      {title}
    </h4>
    <div className="pl-3">{children}</div>
  </div>
);

const Tag = ({ color, children }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    purple: "bg-purple-100 text-purple-700",
    orange: "bg-orange-100 text-orange-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${colors[color] || colors.slate}`}>{children}</span>;
};

const Li = ({ children }) => (
  <li className="flex items-start gap-2 text-sm text-slate-600 mb-1.5">
    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
    <span>{children}</span>
  </li>
);

const Flow = ({ steps }) => (
  <div className="flex flex-wrap items-center gap-2 my-3">
    {steps.map((step, i) => (
      <React.Fragment key={i}>
        <span className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200">{step}</span>
        {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-slate-400" />}
      </React.Fragment>
    ))}
  </div>
);

const InfoBox = ({ type = "info", children }) => {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    tip: "bg-green-50 border-green-200 text-green-800",
  };
  const icons = {
    info: <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />,
    tip: <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />,
  };
  return (
    <div className={`flex items-start gap-2.5 border rounded-lg px-4 py-3 text-sm my-3 ${styles[type]}`}>
      {icons[type]}
      <span>{children}</span>
    </div>
  );
};

const TableRow = ({ cells }) => (
  <tr className="border-b border-slate-100 last:border-0">
    {cells.map((cell, i) => (
      <td key={i} className={`py-2 px-3 text-sm ${i === 0 ? "font-semibold text-slate-700" : "text-slate-600"}`}>{cell}</td>
    ))}
  </tr>
);

export default function Documentacao() {
  const [activeTab, setActiveTab] = useState("usuario");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-blue-900 rounded-2xl px-8 py-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-7 h-7 text-blue-300" />
          <h1 className="text-2xl font-bold">Portal CRM — Documentação do Sistema</h1>
        </div>
        <p className="text-slate-300 text-sm max-w-2xl">
          Documentação completa do sistema de gestão de cancelamentos e retenção de assinaturas.
          Versão atual: <strong className="text-white">Ambiente Retenção</strong> · Integração Vindi Sandbox.
        </p>
        <div className="flex gap-2 mt-4 flex-wrap">
          <Tag color="blue">React + Tailwind</Tag>
          <Tag color="green">Base44 Cloud</Tag>
          <Tag color="purple">Vindi API</Tag>
          <Tag color="amber">Freshworks</Tag>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {[
          { key: "usuario", label: "👤 Manual do Usuário" },
          { key: "ti", label: "🔧 Documentação Técnica (TI)" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === tab.key
                ? "border-blue-500 text-blue-700 bg-blue-50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===================== MANUAL DO USUÁRIO ===================== */}
      {activeTab === "usuario" && (
        <div className="space-y-3">

          {/* Visão Geral */}
          <Section title="Visão Geral do Sistema" icon={Shield} color="#3b82f6" defaultOpen={true}>
            <p className="text-sm text-slate-600 mb-4">
              O <strong>Portal CRM</strong> é um sistema de gestão de processos de cancelamento, retenção e downgrade de assinaturas da <strong>D-SAAS Tecnologia</strong>. Ele centraliza o trabalho dos analistas, automatiza cálculos (multas, datas) e integra diretamente com a <strong>Vindi</strong> (plataforma de cobrança).
            </p>
            <SubSection title="Módulos Disponíveis">
              <ul className="space-y-2">
                <Li><strong>Dashboard</strong> — Painel de indicadores e análises em tempo real</Li>
                <Li><strong>Solicitações</strong> — Lista e cadastro de todos os pedidos de cancelamento/downgrade/dúvida</Li>
                <Li><strong>Workflow</strong> — Quadro de trabalho por etapas do processo</Li>
                <Li><strong>Contatos</strong> — Agenda de próximos contatos com clientes</Li>
                <Li><strong>Oficialização</strong> — Geração e envio do termo de rescisão</Li>
                <Li><strong>Relatórios</strong> — Exportação de dados para Excel</Li>
                <Li><strong>Configurações</strong> — Gestão de planos, motivos, analistas e regras</Li>
              </ul>
            </SubSection>
            <SubSection title="Tipos de Solicitação">
              <div className="flex flex-wrap gap-2">
                <Tag color="red">Cancelamento</Tag>
                <Tag color="amber">Downgrade</Tag>
                <Tag color="blue">Dúvida</Tag>
              </div>
            </SubSection>
          </Section>

          {/* Dashboard */}
          <Section title="Dashboard — Indicadores" icon={BarChart2} color="#8b5cf6">
            <SubSection title="O que você vê no Dashboard">
              <ul className="space-y-1.5">
                <Li>Total de solicitações abertas e concluídas no período</Li>
                <Li>Taxa de retenção (clientes retidos vs cancelados)</Li>
                <Li>Impacto financeiro — MRR em risco e valor de multas</Li>
                <Li>Gargalos do workflow — onde os processos estão travando</Li>
                <Li>Performance do time por analista</Li>
                <Li>Análise de motivos de cancelamento por categoria</Li>
              </ul>
            </SubSection>
            <SubSection title="Filtros Disponíveis">
              <ul className="space-y-1.5">
                <Li>Período: hoje, ontem, 7 dias, 30 dias, mês atual, mês anterior, ou intervalo personalizado</Li>
                <Li>Tipo de solicitação: todos, cancelamento, downgrade, dúvida</Li>
              </ul>
            </SubSection>
          </Section>

          {/* Solicitações */}
          <Section title="Solicitações — Cadastro e Listagem" icon={FileText} color="#f59e0b">
            <SubSection title="Como cadastrar uma nova solicitação">
              <ol className="space-y-2 text-sm text-slate-600 list-decimal pl-4">
                <li>Clique no botão <strong>"Nova Solicitação"</strong> na página Solicitações</li>
                <li>Escolha o tipo: Cancelamento, Downgrade ou Dúvida</li>
                <li>Preencha os dados do cliente: CNPJ, Razão Social, Solicitante, Telefone, E-mail</li>
                <li>Informe o ticket do Freshworks (ID do chamado)</li>
                <li>Descreva o motivo da solicitação</li>
                <li>Clique em <strong>"Confirmar"</strong></li>
              </ol>
            </SubSection>
            <InfoBox type="tip">
              O sistema verifica automaticamente se já existe uma solicitação ativa para o mesmo CNPJ e alerta sobre duplicatas.
            </InfoBox>
            <SubSection title="Estados de uma Solicitação">
              <div className="flex flex-wrap gap-2 mb-2">
                <Tag color="blue">Triagem</Tag>
                <Tag color="amber">Em Tratativa</Tag>
                <Tag color="amber">Em Retenção/Contato</Tag>
                <Tag color="amber">Aguardando Cliente</Tag>
                <Tag color="amber">Aguardando Prazo</Tag>
                <Tag color="amber">Aguardando Pagamento</Tag>
                <Tag color="purple">Em Execução</Tag>
                <Tag color="red">Processo Finalizado (Store)</Tag>
                <Tag color="orange">Retido (Oficialização)</Tag>
                <Tag color="green">Concluído</Tag>
              </div>
            </SubSection>
          </Section>

          {/* Workflow */}
          <Section title="Workflow — Etapas do Processo" icon={GitBranch} color="#ec4899">
            <p className="text-sm text-slate-600 mb-3">O Workflow é o coração do sistema. Cada solicitação passa pelas seguintes etapas:</p>

            <Flow steps={["Triagem", "Retenção", "Execução", "Store", "Oficialização", "Concluído"]} />

            <SubSection title="🔵 Triagem">
              <ul className="space-y-1.5">
                <Li>Importar dados da assinatura diretamente da Vindi (via CNPJ ou ID do cliente)</Li>
                <Li>O sistema preenche automaticamente: plano, valor, inadimplência, data de cancelamento, multa calculada</Li>
                <Li>Atribuir um analista responsável</Li>
                <Li>Definir o plano auxiliar e quantidade de funcionários</Li>
                <Li>Fazer upload do termo de adesão (se o cliente possui multa)</Li>
                <Li>Enviar observação automática para o campo de notas da Vindi</Li>
                <Li>Clicar em <strong>"Salvar e Avançar"</strong> para ir para Retenção</Li>
              </ul>
              <InfoBox type="info">
                Solicitações do tipo <strong>"Dúvida"</strong> sem analista atribuído vão direto para Execução, pulando Retenção.
              </InfoBox>
            </SubSection>

            <SubSection title="🟡 Retenção">
              <ul className="space-y-1.5">
                <Li>Registrar o canal de contato realizado (telefone, e-mail, WhatsApp, sem retorno)</Li>
                <Li>Documentar o real motivo identificado e o que foi negociado</Li>
                <Li>Definir se cobra ou não a multa (e justificativa caso não cobre)</Li>
                <Li>Agendar próximo contato com data e tipo (ativo/receptivo)</Li>
                <Li>Selecionar o resultado da retenção: Retido, Suspenso, Reativado ou Cancelado</Li>
                <Li>Quando em negociação ativa, o botão "Salvar e Avançar" fica bloqueado</Li>
              </ul>
            </SubSection>

            <SubSection title="🟣 Execução">
              <ul className="space-y-1.5">
                <Li>Para <strong>cancelamentos</strong>: executa o processo técnico (geração de multa na Vindi se aplicável, cancelamento da assinatura)</Li>
                <Li>Para <strong>dúvidas</strong>: registra a resposta e conclui o processo</Li>
                <Li>Para <strong>downgrade</strong>: acompanha a execução da troca de plano</Li>
              </ul>
            </SubSection>

            <SubSection title="🔴 Store (Ex-Assinante)">
              <ul className="space-y-1.5">
                <Li>Gerencia a migração do cliente para o status de ex-assinante na Store (sistema interno)</Li>
                <Li>Gera arquivos TXT de <strong>bloqueio</strong> (inadimplentes) e <strong>desbloqueio</strong> (adimplentes) por família de produto (Kairos / MD Comune / outros)</Li>
                <Li>Permite sincronizar dados financeiros diretamente da Vindi</Li>
                <Li>Filtros avançados: status, data de cancelamento, adimplência, CNPJ, família do produto</Li>
              </ul>
              <InfoBox type="warning">
                Os arquivos TXT gerados devem ser importados manualmente no sistema Store. O formato é: CNPJ (14 dígitos) + código de operação + data no formato DDMMAAAA.
              </InfoBox>
            </SubSection>

            <SubSection title="🟠 Oficialização">
              <ul className="space-y-1.5">
                <Li>Lista todos os cancelamentos prontos para oficializar</Li>
                <Li>Valida pré-requisitos: analista definido, motivo preenchido, data de cancelamento chegou, sem faturas em aberto, multa resolvida, cliente adimplente</Li>
                <Li>Gera o <strong>Termo de Rescisão</strong> automaticamente com os dados do cliente</Li>
                <Li>Permite copiar o termo formatado (com logo) diretamente para o Freshdesk</Li>
                <Li>Registra histórico de cancelamento nas notas da assinatura na Vindi</Li>
                <Li>Ao oficializar, o status muda para <strong>"Concluído"</strong></Li>
              </ul>
              <InfoBox type="tip">
                Use o botão <strong>"Copiar para Freshdesk"</strong> para enviar o termo formatado com logo diretamente no ticket do cliente, sem precisar editar HTML.
              </InfoBox>
            </SubSection>
          </Section>

          {/* Contatos */}
          <Section title="Contatos — Agenda de Follow-up" icon={Clock} color="#06b6d4">
            <SubSection title="Como funciona">
              <ul className="space-y-1.5">
                <Li>Exibe todos os contatos agendados nas tratativas de retenção</Li>
                <Li>Organizado em três grupos: <strong>Atrasados</strong> (vermelho), <strong>Hoje</strong> (amarelo), <strong>Próximos</strong> (azul)</Li>
                <Li>Permite selecionar múltiplos contatos e marcar como "Realizado" em lote</Li>
                <Li>Ao marcar como realizado, um novo registro de ação é criado automaticamente</Li>
              </ul>
            </SubSection>
            <InfoBox type="info">
              Os contatos aparecem aqui quando, na etapa de Retenção, é selecionado <strong>"Continuar a negociação com o cliente = Sim"</strong> e uma data de próximo contato é definida.
            </InfoBox>
          </Section>

          {/* Configurações */}
          <Section title="Configurações do Sistema" icon={Settings} color="#64748b">
            <SubSection title="Motivos de Cancelamento">
              <Li>Cadastre os motivos que os clientes alegam ao cancelar</Li>
              <Li>Cada motivo pertence a uma classificação (ex: Custo, Troca de fornecedor, Baixa utilização...)</Li>
            </SubSection>
            <SubSection title="Categorias">
              <Li>Agrupe os motivos em categorias para análise estratégica</Li>
              <Li>Exemplo: "Problema com produto" pode agrupar vários motivos específicos</Li>
            </SubSection>
            <SubSection title="Planos e Marcas (Vindi)">
              <Li>Mapeie cada nome de plano da Vindi para a <strong>marca</strong> (DIMEP ou MADIS) e a <strong>família</strong> do produto</Li>
              <Li>Configure se o plano possui <strong>multa contratual</strong></Li>
              <Li>Informe o ID do produto de multa cadastrado na Vindi</Li>
            </SubSection>
            <SubSection title="Responsáveis por Etapa">
              <Li>Defina quais analistas são responsáveis por cada etapa do workflow</Li>
              <Li>O nome reduzido do analista é usado na observação enviada para a Vindi</Li>
            </SubSection>
          </Section>

          {/* Relatórios */}
          <Section title="Relatórios — Exportação" icon={BarChart2} color="#10b981">
            <SubSection title="Tipos de Exportação">
              <ul className="space-y-1.5">
                <Li><strong>Relatório Completo:</strong> Todas as solicitações com todos os campos (status, valores, motivos, analistas, datas)</Li>
                <Li><strong>Relatório de Cancelamentos:</strong> Focado em cancelamentos concluídos com motivos e classificações</Li>
              </ul>
            </SubSection>
            <SubSection title="Filtros">
              <Li>Período customizável com data de início e fim</Li>
              <Li>Exportação em formato <strong>.xlsx</strong> (Excel)</Li>
            </SubSection>
          </Section>
        </div>
      )}

      {/* ===================== DOCUMENTAÇÃO TÉCNICA ===================== */}
      {activeTab === "ti" && (
        <div className="space-y-3">

          {/* Stack */}
          <Section title="Stack e Infraestrutura" icon={Database} color="#3b82f6" defaultOpen={true}>
            <SubSection title="Frontend">
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Tecnologia</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Uso</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow cells={["React 18", "Framework principal da UI"]} />
                    <TableRow cells={["React Router DOM", "Roteamento de páginas"]} />
                    <TableRow cells={["Tailwind CSS", "Estilização"]} />
                    <TableRow cells={["shadcn/ui + Radix UI", "Componentes de interface"]} />
                    <TableRow cells={["@tanstack/react-query", "Cache e gerenciamento de estado assíncrono"]} />
                    <TableRow cells={["date-fns", "Manipulação de datas"]} />
                    <TableRow cells={["recharts", "Gráficos do dashboard"]} />
                    <TableRow cells={["xlsx", "Exportação de relatórios Excel"]} />
                    <TableRow cells={["framer-motion", "Animações"]} />
                    <TableRow cells={["sonner", "Notificações toast"]} />
                  </tbody>
                </table>
              </div>
            </SubSection>
            <SubSection title="Backend">
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Componente</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow cells={["Base44 Platform", "BaaS (Backend as a Service) — banco de dados, autenticação, storage em nuvem"]} />
                    <TableRow cells={["Deno Deploy (serverless)", "Funções backend executadas na borda"]} />
                    <TableRow cells={["@base44/sdk v0.8.x", "SDK para comunicação frontend ↔ backend"]} />
                    <TableRow cells={["Vindi Sandbox API", "Integração de cobrança e assinaturas"]} />
                  </tbody>
                </table>
              </div>
            </SubSection>
          </Section>

          {/* Entidades */}
          <Section title="Modelo de Dados (Entidades)" icon={Database} color="#8b5cf6">
            <SubSection title="RetentionRequest (Principal)">
              <p className="text-sm text-slate-600 mb-3">Entidade central — representa cada processo de cancelamento/downgrade/dúvida.</p>
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Campo</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Tipo</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow cells={["request_type", "enum", "cancelamento | downgrade | duvidas"]} />
                    <TableRow cells={["status_processo", "enum", "triagem → em_tratativa → em_execucao → processo_finalizado → retido → concluido"]} />
                    <TableRow cells={["status_store", "enum", "ativo | ex_assinante | bloqueado | reprocessar"]} />
                    <TableRow cells={["cnpj / razao_social", "string", "Dados do cliente"]} />
                    <TableRow cells={["id_assinatura / vindi_customer_id", "string", "Referência na Vindi"]} />
                    <TableRow cells={["plano_contratado / familia / marca", "string", "Dados do plano"]} />
                    <TableRow cells={["valor_mensalidade / ciclos_faturados / ciclos_faltantes", "number", "Dados financeiros do contrato"]} />
                    <TableRow cells={["possui_multa / cobra_multa / valor_multa_calculado", "string/number", "Controle de multa contratual"]} />
                    <TableRow cells={["inadimplente", "enum", "sim | nao"]} />
                    <TableRow cells={["data_ex_assinante / data_cancelamento_efetivo", "date", "Datas de cancelamento (calculada e manual)"]} />
                    <TableRow cells={["responsavel", "string", "Analista responsável pelo processo"]} />
                    <TableRow cells={["resultado_retencao", "enum", "retido | suspenso | reativado | cancelado"]} />
                    <TableRow cells={["vindi_data", "object", "JSON completo retornado pela Vindi na importação"]} />
                    <TableRow cells={["checklist_done", "array", "IDs das etapas do checklist concluídas"]} />
                    <TableRow cells={["proximo_contato_data / proximo_contato_tipo", "datetime/enum", "Agendamento de follow-up"]} />
                  </tbody>
                </table>
              </div>
            </SubSection>

            <SubSection title="Outras Entidades">
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex gap-3 items-start border border-slate-200 rounded-lg p-3">
                  <Tag color="blue">PlanConfig</Tag>
                  <span>Mapeamento nome do plano Vindi → marca, família, regra de multa, produto_multa_id</span>
                </div>
                <div className="flex gap-3 items-start border border-slate-200 rounded-lg p-3">
                  <Tag color="purple">StepConfig</Tag>
                  <span>Analistas e grupos responsáveis por cada etapa (triagem, retencao, execucao, etc.)</span>
                </div>
                <div className="flex gap-3 items-start border border-slate-200 rounded-lg p-3">
                  <Tag color="amber">CancellationReason</Tag>
                  <span>Motivos individuais de cancelamento com classificação</span>
                </div>
                <div className="flex gap-3 items-start border border-slate-200 rounded-lg p-3">
                  <Tag color="green">ReasonCategory</Tag>
                  <span>Agrupamento de motivos em categorias estratégicas</span>
                </div>
                <div className="flex gap-3 items-start border border-slate-200 rounded-lg p-3">
                  <Tag color="red">RequestAction</Tag>
                  <span>Log de ações realizadas em cada solicitação (contatos, negociações)</span>
                </div>
                <div className="flex gap-3 items-start border border-slate-200 rounded-lg p-3">
                  <Tag color="slate">Comunicacao</Tag>
                  <span>Registro de e-mails e comunicações enviadas pelo sistema</span>
                </div>
                <div className="flex gap-3 items-start border border-slate-200 rounded-lg p-3">
                  <Tag color="slate">MigrationLog</Tag>
                  <span>Lotes de migração Store com status e responsável</span>
                </div>
                <div className="flex gap-3 items-start border border-slate-200 rounded-lg p-3">
                  <Tag color="blue">PlanoAuxiliar</Tag>
                  <span>Planos auxiliares disponíveis para seleção durante triagem</span>
                </div>
              </div>
            </SubSection>
          </Section>

          {/* Funções Backend */}
          <Section title="Funções Backend (Serverless)" icon={Zap} color="#f59e0b">
            <SubSection title="vindiIntegration">
              <p className="text-sm text-slate-600 mb-2">Função principal de integração com a API da Vindi. Recebe um parâmetro <code className="bg-slate-100 px-1 rounded">action</code> no body.</p>
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Action</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Parâmetros</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow cells={["buscar_por_cnpj", "cnpj", "Busca cliente e assinatura ativa pelo CNPJ/CPF"]} />
                    <TableRow cells={["buscar_por_customer_id", "customer_id", "Lista assinaturas de um cliente pelo ID Vindi"]} />
                    <TableRow cells={["buscar_por_id_assinatura", "subscription_id", "Retorna dados completos de uma assinatura"]} />
                    <TableRow cells={["cancelar_assinatura", "subscription_id, justificativa?", "Cancela a assinatura na Vindi (admin pode forçar em inadimplentes)"]} />
                    <TableRow cells={["faturas_em_aberto", "customer_id | cnpj", "Lista faturas pendentes/em atraso do cliente"]} />
                    <TableRow cells={["buscar_fatura_por_id", "bill_id", "Retorna dados de uma fatura específica"]} />
                    <TableRow cells={["listar_produtos", "—", "Lista produtos cadastrados na Vindi"]} />
                    <TableRow cells={["agendar_multa", "customer_id, valor_multa, product_id, due_at", "Cria cobrança avulsa de multa contratual"]} />
                    <TableRow cells={["adicionar_observacao", "subscription_id, observacao", "Adiciona nota no campo notas do cliente Vindi"]} />
                  </tbody>
                </table>
              </div>
              <InfoBox type="warning">
                A função autentica o usuário via <code className="bg-amber-100 px-1 rounded">base44.auth.me()</code> antes de executar qualquer operação. O cancelamento forçado de inadimplentes exige <code className="bg-amber-100 px-1 rounded">role === 'admin'</code>.
              </InfoBox>
            </SubSection>

            <SubSection title="Outras Funções">
              <div className="space-y-2 text-sm text-slate-600">
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1"><Tag color="amber">enviarEmailSemRetorno</Tag></div>
                  <p>Envia e-mail automático para clientes sem retorno. Usa integração de e-mail da plataforma.</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1"><Tag color="blue">generateTermoPDF</Tag></div>
                  <p>Gera o PDF do termo de rescisão com os dados do cliente. Usado na etapa de Oficialização.</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1"><Tag color="red">revalidarInadimplentes</Tag></div>
                  <p>Revalida o status de inadimplência de todos os clientes consultando a Vindi. Pode ser chamada por agendamento.</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1"><Tag color="purple">schedulerCancelamento</Tag></div>
                  <p>Função agendada que processa cancelamentos com data de execução chegando. Roda automaticamente via automação.</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1"><Tag color="green">validarPendenciasExAssinante</Tag></div>
                  <p>Verifica se um cliente está apto para avançar para Ex-Assinante (sem faturas abertas, adimplente).</p>
                </div>
              </div>
            </SubSection>
          </Section>

          {/* Secrets e Variáveis */}
          <Section title="Variáveis de Ambiente (Secrets)" icon={Shield} color="#ef4444">
            <div className="overflow-x-auto">
              <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Variável</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Onde usar</th>
                    <th className="text-left py-2 px-3 font-semibold text-slate-700">Obrigatória</th>
                  </tr>
                </thead>
                <tbody>
                  <TableRow cells={["VINDI_API_KEY", "vindiIntegration (todas as ações)", "Sim"]} />
                  <TableRow cells={["BASE44_APP_ID", "Pré-configurada automaticamente pela plataforma", "Automática"]} />
                </tbody>
              </table>
            </div>
            <InfoBox type="info">
              A chave da Vindi usada é para o <strong>ambiente Sandbox</strong>. Para produção, substituir por chave do ambiente de produção em <strong>Configurações → Variáveis de Ambiente</strong> no painel Base44.
            </InfoBox>
          </Section>

          {/* Lógica de Negócio */}
          <Section title="Regras de Negócio Importantes" icon={CheckCircle2} color="#10b981">
            <SubSection title="Cálculo de Data de Cancelamento">
              <ul className="space-y-1.5">
                <Li><strong>Com multa:</strong> data do próximo faturamento − 2 dias → arredondado para o dia padrão anterior (9, 19 ou 29)</Li>
                <Li><strong>Sem multa:</strong> próximo faturamento + 1 ciclo (30 dias) → mesmo arredondamento</Li>
                <Li>O analista pode sobrescrever a data manualmente no campo "Data Opcional para Cancelamento"</Li>
              </ul>
            </SubSection>
            <SubSection title="Cálculo de Multa">
              <ul className="space-y-1.5">
                <Li>Multa = <code className="bg-slate-100 px-1 rounded">ciclos_faltantes × valor_mensalidade × 0,5</code></Li>
                <Li>Ciclos faltantes são calculados pela diferença entre <code className="bg-slate-100 px-1 rounded">end_at</code> da assinatura e a data atual</Li>
                <Li>Apenas planos com <code className="bg-slate-100 px-1 rounded">multa = SIM</code> nas configurações geram multa</Li>
              </ul>
            </SubSection>
            <SubSection title="Geração de Arquivos TXT para Store">
              <ul className="space-y-1.5">
                <Li>Formato de cada linha: <code className="bg-slate-100 px-1 rounded">CNPJ(14) + "1" + código(8) + data(8)</code></Li>
                <Li>Código fixo atual: <code className="bg-slate-100 px-1 rounded">17049999</code> para bloqueio e desbloqueio</Li>
                <Li>Gerado separadamente por família: Kairos, MD Comune, Outros</Li>
              </ul>
            </SubSection>
            <SubSection title="Validações para Oficialização">
              <ul className="space-y-1.5">
                <Li>Analista responsável definido</Li>
                <Li>Motivo de cancelamento selecionado</Li>
                <Li>Data de cancelamento preenchida <strong>e já chegou</strong></Li>
                <Li>Nenhuma fatura em aberto na Vindi</Li>
                <Li>Situação da multa resolvida (cobrada ou justificativa para não cobrar)</Li>
                <Li>Cliente adimplente</Li>
              </ul>
              <InfoBox type="warning">
                Clientes com pendências ainda podem ser oficializados de forma "forçada" — eles aparecem destacados em vermelho com a lista de pendências visível.
              </InfoBox>
            </SubSection>
          </Section>

          {/* Autenticação */}
          <Section title="Autenticação e Controle de Acesso" icon={Users} color="#64748b">
            <SubSection title="Roles (Perfis)">
              <div className="overflow-x-auto">
                <table className="w-full border border-slate-200 rounded-lg overflow-hidden text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Role</th>
                      <th className="text-left py-2 px-3 font-semibold text-slate-700">Permissões</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TableRow cells={["admin", "Acesso total + cancelamento forçado de inadimplentes + gerenciamento de usuários"]} />
                    <TableRow cells={["user", "Operação normal do workflow (sem cancelamento forçado)"]} />
                  </tbody>
                </table>
              </div>
            </SubSection>
            <SubSection title="Autenticação">
              <ul className="space-y-1.5">
                <Li>Gerenciada pela plataforma Base44 (tokens JWT)</Li>
                <Li>Usuários são convidados via e-mail pelo painel administrativo</Li>
                <Li>Sem tela de login customizada — redirecionamento automático para o login da plataforma</Li>
              </ul>
            </SubSection>
          </Section>

          {/* Manutenção */}
          <Section title="Manutenção e Pontos de Atenção" icon={AlertTriangle} color="#f97316">
            <SubSection title="Vindi — Ambiente Sandbox vs Produção">
              <InfoBox type="warning">
                O sistema atualmente usa a URL <strong>sandbox-app.vindi.com.br</strong>. Para ir para produção, alterar a variável <code className="bg-amber-100 px-1 rounded">VINDI_BASE</code> na função <code className="bg-amber-100 px-1 rounded">vindiIntegration</code> para <code className="bg-amber-100 px-1 rounded">https://app.vindi.com.br/api/v1</code> e atualizar a chave de API.
              </InfoBox>
            </SubSection>
            <SubSection title="Limites Conhecidos">
              <ul className="space-y-1.5">
                <Li>A busca por CNPJ na Vindi percorre até 10 páginas (500 clientes). Bases muito grandes podem exigir busca pelo ID do cliente.</Li>
                <Li>O sistema carrega até 500 RetentionRequests por vez nas listagens principais.</Li>
                <Li>Arquivos .db locais não são suportados — todo armazenamento é na nuvem Base44.</Li>
              </ul>
            </SubSection>
            <SubSection title="Estrutura de Pastas do Código">
              <div className="bg-slate-50 rounded-lg p-4 font-mono text-xs text-slate-700 space-y-1">
                <p>📁 <strong>pages/</strong> — Telas principais (Dashboard, Requests, Actions, Settings, Relatorios)</p>
                <p>📁 <strong>components/retention/</strong> — Componentes do workflow (WorkflowBoard, EnvioDoTermo, ExAssinantePanel, ...)</p>
                <p>📁 <strong>components/dashboard/</strong> — Blocos de análise do dashboard</p>
                <p>📁 <strong>components/settings/</strong> — Painéis de configuração</p>
                <p>📁 <strong>functions/</strong> — Funções backend serverless (Deno)</p>
                <p>📁 <strong>entities/</strong> — Schemas JSON das entidades do banco</p>
                <p>📄 <strong>App.jsx</strong> — Roteamento da aplicação</p>
                <p>📄 <strong>layout.jsx</strong> — Sidebar e estrutura base</p>
              </div>
            </SubSection>
          </Section>
        </div>
      )}

      <div className="text-center py-6 text-xs text-slate-400">
        Portal CRM — D-SAAS Tecnologia · Documentação gerada automaticamente · {new Date().toLocaleDateString("pt-BR")}
      </div>
    </div>
  );
}