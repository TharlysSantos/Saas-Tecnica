import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Loader2, Eye, EyeOff, RefreshCw, Handshake, Check } from "lucide-react";
import { toast } from "sonner";

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">{label}</p>
      <p className="text-sm text-slate-700">{value || "—"}</p>
    </div>
  );
}

function CollapsibleSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{title}</span>
        {open ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {open && <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>}
    </div>
  );
}

export default function ExecutionForm({ data, onChange, currentUser, onGoBack }) {
  // Multa já gravada no banco?
  const multaJaGravada = !!(data.multa_bill_id);
  const [emailTemplate, setEmailTemplate] = useState("retido");
  const [emailBody, setEmailBody] = useState("");
  const [linkFaturaAberta, setLinkFaturaAberta] = useState("");
  const [loadingFaturas, setLoadingFaturas] = useState(false);
  const [faturas, setFaturas] = useState([]);
  const [linkMulta, setLinkMulta] = useState(data.multa_bill_url || "");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [agendandoMulta, setAgendandoMulta] = useState(false);
  const [multaAgendada, setMultaAgendada] = useState(
    data.multa_bill_id ? { bill_id: data.multa_bill_id, url: data.multa_bill_url, due_at: data.multa_due_at } : null
  );
  const [forcarNovaMulta, setForcarNovaMulta] = useState(false);
  const [pmCode, setPmCode] = useState("online_bank_slip");
  const [produtoMultaId, setProdutoMultaId] = useState("");
  const [produtos, setProdutos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [emissaoMulta, setEmissaoMulta] = useState(() => new Date().toISOString().split('T')[0]);
  const [vencimentoMulta, setVencimentoMulta] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const fmtBRL = (v) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

  const buscarProdutos = async () => {
    setLoadingProdutos(true);
    try {
      const allConfigs = await base44.entities.PlanConfig.list('-created_date', 500);
      const planoNome = data.plano_contratado?.toLowerCase().trim();
      const planCfg = allConfigs.find(p => p.nome?.toLowerCase().trim() === planoNome);
      if (!planCfg) {
        toast.error(`Plano "${data.plano_contratado}" não encontrado em Configurações > Planos.`);
      } else if (!planCfg.produto_multa_id) {
        toast.error(`Plano "${data.plano_contratado}" encontrado, mas sem Produto de Multa configurado. Configure em Configurações > Planos.`);
      } else {
        setProdutoMultaId(String(planCfg.produto_multa_id));
      }
    } catch (e) {
      toast.error('Erro: ' + e.message);
    } finally {
      setLoadingProdutos(false);
    }
  };

  const handleAgendarMulta = async () => {
    if (!produtoMultaId) { toast.error('Selecione o produto da multa'); return; }
    if (!data.valor_multa_calculado) { toast.error('Valor da multa não calculado'); return; }
    setAgendandoMulta(true);
    try {
      // Prioriza vindi_customer_id (salvo corretamente na triagem)
      let customerId = data.vindi_customer_id
        || data.vindi_data?.customer_id
        || data.vindi_data?.customer?.id;
      if (!customerId && data.id_assinatura) {
        const subRes = await base44.functions.invoke('vindiIntegration', {
          action: 'buscar_por_id_assinatura',
          subscription_id: data.id_assinatura,
        });
        customerId = subRes.data?.customer_id || subRes.data?.subscription?.customer?.id;
      }
      if (!customerId) { toast.error('ID do cliente Vindi não encontrado. Reimporte a assinatura na triagem.'); setAgendandoMulta(false); return; }
      console.log('🔍 Agendando multa para customer_id:', customerId, '| tipo:', typeof customerId);
      const res = await base44.functions.invoke('vindiIntegration', {
        action: 'agendar_multa',
        customer_id: String(customerId),
        product_id: Number(produtoMultaId),
        valor_multa: data.valor_multa_calculado,
        payment_method_code: pmCode,
        billing_at: emissaoMulta,
        due_at: vencimentoMulta,
      });
      const resultado = res.data;
      setMultaAgendada(resultado);
      setForcarNovaMulta(false);
      if (resultado.url) setLinkMulta(resultado.url);
      await base44.entities.RetentionRequest.update(data.id, {
        multa_bill_id: String(resultado.bill_id),
        multa_bill_url: resultado.url || '',
        multa_due_at: resultado.due_at || vencimentoMulta,
      });
      onChange('multa_bill_id', String(resultado.bill_id));
      onChange('multa_bill_url', resultado.url || '');
      onChange('multa_due_at', resultado.due_at || vencimentoMulta);
      setEmailBody(buildCanceladoComMultaTemplate(faturas, resultado.url || linkMulta));
      toast.success(`Multa agendada! Vencimento: ${resultado.due_at ? new Date(resultado.due_at).toLocaleDateString('pt-BR') : '—'}`);
    } catch (e) {
      toast.error('Erro ao agendar multa: ' + e.message);
    } finally {
      setAgendandoMulta(false);
    }
  };

  const buildDuvidaTemplate = () => {
    const solicitante = data.solicitante || "Cliente";
    return `😊 Olá, ${solicitante}!\n\nObrigado por entrar em contato conosco! 🙏\n\nSegue abaixo o retorno sobre suas dúvidas em relação à sua assinatura.\n\n---\n\n📌 Dúvidas Respondidas\nEstamos à disposição para esclarecer qualquer questão e garantir que você tenha a melhor experiência possível com nossos serviços.\n\n---\n\n💬 Qualquer coisa, fico à disposição!\nNão hesite em nos contatar novamente se tiver outras dúvidas.\n\nAtenciosamente,\n🌟 Time de Sucesso do Cliente`;
  };

  const buildRetidoTemplate = () => {
    const solicitante = data.solicitante || "Cliente";
    const razaoSocial = data.razao_social || "sua empresa";
    const analista = data.responsavel || "nosso analista";
    return `😊 Olá, ${solicitante}!

Esperamos que esteja bem.

Conforme alinhado durante o atendimento realizado por ${analista}, registramos a decisão de retenção da assinatura da ${razaoSocial}.

📌 Retenção da Assinatura
A solicitação de cancelamento foi descontinuada a pedido da empresa, permanecendo:
✅ Plano atual inalterado
✅ Quantidade de licenças mantida
✅ Valores e condições contratuais vigentes
✅ Faturamento seguindo normalmente

📜 Formalização
Este e-mail formaliza a continuidade da assinatura, mantendo-se todas as cláusulas contratuais previamente acordadas.
Caso futuramente seja necessário revisar plano, licenças ou condições comerciais, permanecemos à disposição para análise.

Agradecemos pela continuidade da parceria. 🙏
Seguimos à disposição.
Atenciosamente,
Time Sucesso do Cliente`;
  };

  const buildSuspensoTemplate = (linkFatura = linkFaturaAberta, suspensaoDe = data.suspensao_de, suspensaoAte = data.suspensao_ate) => {
    const solicitante = data.solicitante || "Cliente";
    const razaoSocial = data.razao_social || "sua empresa";
    const analista = data.responsavel || "nosso analista";
    const avisoFatura = linkFatura
      ? `\n⚠️ Ressalto que existe boleto em aberto, segue fatura para pagamento sem juros:\n🔗 ${linkFatura}\n`
      : "";
    const dataInicio = suspensaoDe
      ? new Date(suspensaoDe + 'T00:00:00').toLocaleDateString('pt-BR')
      : data.data_reagendamento_suspensao
        ? new Date(data.data_reagendamento_suspensao + 'T00:00:00').toLocaleDateString('pt-BR')
        : "[DATA_INICIO]";
    const dataTermino = suspensaoAte
      ? new Date(suspensaoAte + 'T00:00:00').toLocaleDateString('pt-BR')
      : "[DATA_TERMINO]";
    return `😊 Olá, ${solicitante}!

Esperamos que esteja bem.

Conforme alinhado durante o atendimento realizado por ${analista}, formalizamos abaixo o acordo de paralisação temporária da assinatura da ${razaoSocial}.

⏸️ Paralisação Temporária da Assinatura
A assinatura ficará paralisada no período de:
📅 Início: ${dataInicio}
📅 Término previsto: ${dataTermino}
Durante esse período, o acesso ao sistema permanecerá suspenso.${avisoFatura}

🔄 Reativação Automática
Ao final do prazo informado acima:
✅ O sistema será reativado automaticamente
✅ O faturamento será retomado conforme as condições contratuais vigentes
✅ A assinatura voltará ao status ativo, sem necessidade de nova solicitação

⚠️ Importante
A paralisação não caracteriza cancelamento contratual.
Caso não haja manifestação até o término do período acordado, a assinatura será reativada automaticamente.

Permaneçamos à disposição para quaisquer esclarecimentos. 🙏
Atenciosamente,
Time Sucesso do Cliente`;
  };

  const buildCanceladoComMultaTemplate = (faturasLista = faturas, linkMultaParam = linkMulta) => {
    const solicitante = data.solicitante || "Cliente";
    const analista = data.responsavel || "nosso analista";
    const totalRestante = (data.ciclos_faltantes || 0) * (data.valor_mensalidade || 0);
    const hoje = new Date();
    const hasSubId = (f) => f.subscription_id && f.subscription_id !== 'null' && f.subscription_id !== null;
    const faturasAssinatura = faturasLista.filter(f => hasSubId(f));
    const faturasAvulsas = faturasLista.filter(f => !hasSubId(f));

    const renderFaturaLinha = (f) => {
      const venc = f.due_at ? new Date(f.due_at) : null;
      const vencida = venc && venc < hoje;
      const label = vencida ? `VENCIDA #${f.id}` : `A VENCER #${f.id}`;
      const dataStr = venc ? venc.toLocaleDateString('pt-BR') : '—';
      return f.url
        ? `📄 ${dataStr} — ${fmtBRL(f.amount)} — [${label}](${f.url})`
        : `📄 ${dataStr} — ${fmtBRL(f.amount)} — ${label}`;
    };

    const faturasTexto = faturasAssinatura.length > 0
      ? faturasAssinatura.map(renderFaturaLinha).join('\n')
      : 'Nenhuma fatura de mensalidade em aberto identificada.';

    // Multa: usa fatura avulsa se existir, senão usa o linkMultaParam
    const multaAvulsa = faturasAvulsas[0];
    const linhaMulta = multaAvulsa
      ? renderFaturaLinha({ ...multaAvulsa, id: multaAvulsa.id })
      : linkMultaParam
        ? `[Multa #${data.multa_bill_id || 'Fatura'}](${linkMultaParam})`
        : '🔗 (link será gerado após agendamento na Vindi)';

    return `😊 Olá, tudo bem?

Conforme alinhado com o analista ${analista}, seguem abaixo as orientações para continuidade do processo de cancelamento.
Após a quitação de todas as notas devidas e o encerramento do acesso ao sistema, será encaminhado o distrato formal da assinatura.

💰 Emissão da Multa Contratual
De acordo com as condições do contrato:
📄 Vigência do contrato: ${data.tempo_contrato ? `${data.tempo_contrato} meses` : '—'}
📄 Mensalidades faturadas: ${data.ciclos_faturados || '—'}
📄 Mensalidades restantes: ${data.ciclos_faltantes || '—'} — totalizando ${fmtBRL(totalRestante)}
💳 Multa contratual: ${fmtBRL(data.valor_multa_calculado)} (equivalente a 50% do valor das parcelas restantes)
${linhaMulta}
⚠️ Importante: a multa contratual não contempla eventuais mensalidades em aberto, que deverão ser quitadas separadamente para conclusão do processo.

📋 Faturas em Aberto
Para a efetivação do cancelamento, é necessário que todas as faturas estejam quitadas. Consta em aberto:
${faturasTexto}

💻 Acesso ao Sistema até o Encerramento
O sistema permanecerá ativo até ${data.data_efetivacao || '[DATA_CANCELAMENTO]'}, mantendo acesso às seguintes funcionalidades:
• Marcação de ponto
• Emissão de relatórios
• Exportação de dados e backups
Após essa data, o acesso será encerrado.

💾 Backup e Exportação de Dados
⚠️ Importante: a empresa não realiza backup automaticamente.
O cliente é responsável por baixar todos os arquivos necessários antes da desativação do sistema.
Caso prefira, oferecemos o serviço de backup realizado pelo nosso Suporte Técnico (serviço disponível para contratação).

Orientações para exportação:

📁 Arquivos Fiscais
Relatórios > Ponto > Arquivos Fiscais > Portaria 1.510
• Selecione os colaboradores
• Gere os arquivos ACJEF, Espelho de Ponto e AFDT
• Exporte nos formatos Excel e PDF

📊 Relatórios de Ponto
Relatórios > Ponto > Ponto do Funcionário
• Selecione os colaboradores
• Exporte nos formatos Excel e PDF

⏱️ Banco de Horas
Banco de Horas Resumido: Relatórios > Banco de Horas > Banco de Horas Resumido
Extrato: Relatórios > Banco de Horas > Extrato do Banco de Horas

📌 Marcações
• Acesse Marcações
• Escolha o período desejado
• Exporte no formato AFD

💡 Dica: para selecionar todos os colaboradores, passe o mouse sobre o quadrado de seleção e clique em "Selecionar todos os colaboradores".

🔓 Acesso pós-cancelamento
Após o encerramento:
• O plano será migrado para o status Ex-assinante
• O acesso ficará disponível por até 12 meses, exclusivamente ao usuário master, apenas para consulta de informações

🤝 Agradecemos pela parceria até aqui.
Permanecemos à disposição caso, no futuro, desejem retomar a assinatura ou esclarecer qualquer dúvida.
Atenciosamente,
Time Sucesso do Cliente`;
  };

  const buildCanceladoComMultaOutrosSoftwareTemplate = (faturasLista = faturas, linkMultaParam = linkMulta) => {
    const analista = data.responsavel || 'nosso analista';
    const totalRestante = (data.ciclos_faltantes || 0) * (data.valor_mensalidade || 0);
    const hoje = new Date();
    const hasSubId = (f) => f.subscription_id && f.subscription_id !== 'null' && f.subscription_id !== null;
    const faturasAssinatura = faturasLista.filter(f => hasSubId(f));
    const faturasAvulsas = faturasLista.filter(f => !hasSubId(f));

    const renderFaturaLinha = (f) => {
      const venc = f.due_at ? new Date(f.due_at) : null;
      const vencida = venc && venc < hoje;
      const label = vencida ? `VENCIDA #${f.id}` : `A VENCER #${f.id}`;
      const dataStr = venc ? venc.toLocaleDateString('pt-BR') : '—';
      return f.url
        ? `📄 ${dataStr} — ${fmtBRL(f.amount)} — [${label}](${f.url})`
        : `📄 ${dataStr} — ${fmtBRL(f.amount)} — ${label}`;
    };

    const faturasTexto = faturasAssinatura.length > 0
      ? faturasAssinatura.map(renderFaturaLinha).join('\n')
      : 'Nenhuma fatura de mensalidade em aberto identificada.';

    const multaAvulsa = faturasAvulsas[0];
    const linhaMulta = multaAvulsa
      ? renderFaturaLinha({ ...multaAvulsa, id: multaAvulsa.id })
      : linkMultaParam
        ? `[Multa #${data.multa_bill_id || 'Fatura'}](${linkMultaParam})`
        : '🔗 (link será gerado após agendamento na Vindi)';

    return `😊 Olá, tudo bem?

Conforme alinhado com o analista ${analista}, seguem abaixo as orientações para continuidade do processo de cancelamento.
Após a quitação de todas as notas devidas e o encerramento do acesso ao sistema, será encaminhado o distrato formal da assinatura.

💰 Emissão da Multa Contratual
De acordo com as condições do contrato:
📄 Vigência do contrato: ${data.tempo_contrato ? `${data.tempo_contrato} meses` : '—'}
📄 Mensalidades faturadas: ${data.ciclos_faturados || '—'}
📄 Mensalidades restantes: ${data.ciclos_faltantes || '—'} — totalizando ${fmtBRL(totalRestante)}
💳 Multa contratual: ${fmtBRL(data.valor_multa_calculado)} (equivalente a 50% do valor das parcelas restantes)
${linhaMulta}
⚠️ Importante: a multa contratual não contempla eventuais mensalidades em aberto, que deverão ser quitadas separadamente para conclusão do processo.

📋 Faturas em Aberto
Para a efetivação do cancelamento, é necessário que todas as faturas estejam quitadas. Consta em aberto:
${faturasTexto}

💻 Acesso ao Sistema até o Encerramento
O sistema permanecerá ativo até ${data.data_efetivacao || '[DATA]'}, 
Após essa data, o acesso será encerrado.

💾 Backup e Exportação de Dados
⚠️ Importante: a empresa não realiza backup automaticamente.
O cliente é responsável por baixar todos os arquivos necessários antes da desativação do sistema.
Caso prefira, oferecemos o serviço de backup realizado pelo nosso Suporte Técnico (serviço disponível para contratação).

🤝 Agradecemos pela parceria até aqui.
Permanecemos à disposição caso, no futuro, desejem retomar a assinatura ou esclarecer qualquer dúvida.
Atenciosamente,
Time Sucesso do Cliente`;
  };

  const buildCanceladoSemMultaOutrosSoftwareTemplate = (faturasLista = faturas) => {
    const analista = data.responsavel || 'nosso analista';
    const hoje = new Date();
    const renderFaturaLinha = (f) => {
      const venc = f.due_at ? new Date(f.due_at) : null;
      const vencida = venc && venc < hoje;
      const label = vencida ? `VENCIDA #${f.id}` : `A VENCER #${f.id}`;
      const dataStr = venc ? venc.toLocaleDateString('pt-BR') : '—';
      return f.url
        ? `📄 ${dataStr} — ${fmtBRL(f.amount)} — [${label}](${f.url})`
        : `📄 ${dataStr} — ${fmtBRL(f.amount)} — ${label}`;
    };
    const faturasAssinatura = faturasLista.filter(f => f.subscription_id && f.subscription_id !== 'null' && f.subscription_id !== null);
    const faturasTexto = faturasAssinatura.length > 0
      ? faturasAssinatura.map(renderFaturaLinha).join('\n')
      : '• (busque as faturas na Vindi para preencher automaticamente)';

    return `😊 Olá, tudo bem?

Conforme alinhado com o analista ${analista}, seguem abaixo as orientações para continuidade do processo de cancelamento.
Após a quitação de todas as notas devidas e o encerramento do acesso ao sistema, será encaminhado o distrato formal da assinatura.

📋 Faturas em Aberto
Para a efetivação do cancelamento, é necessário que todas as faturas estejam quitadas. Consta em aberto:
${faturasTexto}

💻 Acesso ao Sistema até o Encerramento
O sistema permanecerá ativo até ${data.data_efetivacao || '[DATA]'}, 
Após essa data, o acesso será encerrado.

💾 Backup e Exportação de Dados
⚠️ Importante: a empresa não realiza backup automaticamente.
O cliente é responsável por baixar todos os arquivos necessários antes da desativação do sistema.
Caso prefira, oferecemos o serviço de backup realizado pelo nosso Suporte Técnico (serviço disponível para contratação).

🤝 Agradecemos pela parceria até aqui.
Permaneçamos à disposição caso, no futuro, desejem retomar a assinatura ou esclarecer qualquer dúvida.
Atenciosamente,
Time Sucesso do Cliente`;
  };

  const buildCanceladoSemMultaTemplate = (faturasLista = faturas) => {
    const analista = data.responsavel || 'nosso analista';
    const hoje = new Date();
    const renderFaturaLinha = (f) => {
      const venc = f.due_at ? new Date(f.due_at) : null;
      const vencida = venc && venc < hoje;
      const label = vencida ? `VENCIDA #${f.id}` : `A VENCER #${f.id}`;
      const dataStr = venc ? venc.toLocaleDateString('pt-BR') : '—';
      return f.url
        ? `📄 ${dataStr} — ${fmtBRL(f.amount)} — [${label}](${f.url})`
        : `📄 ${dataStr} — ${fmtBRL(f.amount)} — ${label}`;
    };
    // Só mensalidades (com subscription_id válido)
    const faturasAssinatura = faturasLista.filter(f => f.subscription_id && f.subscription_id !== 'null' && f.subscription_id !== null);
    const faturasTexto = faturasAssinatura.length > 0
      ? faturasAssinatura.map(renderFaturaLinha).join('\n')
      : '• (busque as faturas na Vindi para preencher automaticamente)';

    return `😊 Olá, tudo bem?

Conforme alinhado com o analista ${analista}, seguem abaixo as orientações para continuidade do processo de cancelamento.
Após a quitação de todas as notas devidas e o encerramento do acesso ao sistema, será encaminhado o distrato formal da assinatura.

📋 Faturas em Aberto
Para a efetivação do cancelamento, é necessário que todas as faturas estejam quitadas. Consta em aberto:
${faturasTexto}

💻 Acesso ao Sistema até o Encerramento
O sistema permanecerá ativo até ${data.data_efetivacao || '[DATA]'}, mantendo acesso às seguintes funcionalidades:
• Marcação de ponto
• Emissão de relatórios
• Exportação de dados e backups
Após essa data, o acesso será encerrado.

💾 Backup e Exportação de Dados
⚠️ Importante: a empresa não realiza backup automaticamente.
O cliente é responsável por baixar todos os arquivos necessários antes da desativação do sistema.
Caso prefira, oferecemos o serviço de backup realizado pelo nosso Suporte Técnico (serviço disponível para contratação).

Orientações para exportação:

📁 Arquivos Fiscais
Relatórios > Ponto > Arquivos Fiscais > Portaria 1.510
• Selecione os colaboradores
• Gere os arquivos ACJEF, Espelho de Ponto e AFDT
• Exporte nos formatos Excel e PDF

📊 Relatórios de Ponto
Relatórios > Ponto > Ponto do Funcionário
• Selecione os colaboradores
• Exporte nos formatos Excel e PDF

⏱️ Banco de Horas
Banco de Horas Resumido: Relatórios > Banco de Horas > Banco de Horas Resumido
Extrato: Relatórios > Banco de Horas > Extrato do Banco de Horas

📌 Marcações
• Acesse Marcações
• Escolha o período desejado
• Exporte no formato AFD

💡 Dica: para selecionar todos os colaboradores, passe o mouse sobre o quadrado de seleção e clique em "Selecionar todos os colaboradores".

🔓 Acesso pós-cancelamento
Após o encerramento:
• O plano será migrado para o status Ex-assinante
• O acesso ficará disponível por até 12 meses, exclusivamente ao usuário master, apenas para consulta de informações

🤝 Agradecemos pela parceria até aqui.
Permaneçamos à disposição caso, no futuro, desejem retomar a assinatura ou esclarecer qualquer dúvida.
Atenciosamente,
Time Sucesso do Cliente`;
  };

  const buscarFaturasDaVindi = async () => {
    // Tenta obter o customer_id de várias fontes na solicitação
    let customerId = data.vindi_customer_id
      || data.vindi_data?.customer?.id
      || data.vindi_data?.subscription?.customer?.id;

    // Se ainda não tiver, busca via assinatura
    if (!customerId && data.id_assinatura) {
      try {
        const subRes = await base44.functions.invoke('vindiIntegration', {
          action: 'buscar_por_id_assinatura',
          subscription_id: data.id_assinatura,
        });
        customerId = subRes.data?.customer_id || subRes.data?.subscription?.customer?.id;
        // Persiste para não precisar buscar novamente
        if (customerId) {
          await base44.entities.RetentionRequest.update(data.id, { vindi_customer_id: String(customerId) });
        }
      } catch (e) {
        // ignora, vai exibir erro abaixo
      }
    }

    if (!customerId) {
      toast.error("ID do cliente Vindi não encontrado. Verifique se a assinatura foi importada corretamente na triagem.");
      return [];
    }

    setLoadingFaturas(true);
    try {
      const res = await base44.functions.invoke('vindiIntegration', {
        action: 'faturas_em_aberto',
        customer_id: String(customerId),
      });
      const lista = res.data?.bills || [];
      setFaturas(lista);
      // Fatura com subscription_id = mensalidade; sem = avulsa (multa)
      const avulsa = lista.find(f => !f.subscription_id || f.subscription_id === 'null');
      const comSub = lista.find(f => f.subscription_id && f.subscription_id !== 'null');
      if (avulsa?.url) setLinkMulta(avulsa.url);
      if (comSub?.url) setLinkFaturaAberta(comSub.url);
      return lista;
    } catch (e) {
      toast.error("Erro ao buscar faturas na Vindi: " + e.message);
      return [];
    } finally {
      setLoadingFaturas(false);
    }
  };

  const handleTemplateChange = (template) => {
    setEmailTemplate(template);
    const builders = {
      duvida_resposta: buildDuvidaTemplate,
      retido: buildRetidoTemplate,
      suspenso: () => buildSuspensoTemplate(linkFaturaAberta),
      cancelado_com_multa: () => buildCanceladoComMultaTemplate(faturas, linkMulta),
      cancelado_sem_multa: () => buildCanceladoSemMultaTemplate(faturas),
      cancelado_com_multa_outros: () => buildCanceladoComMultaOutrosSoftwareTemplate(faturas, linkMulta),
      cancelado_sem_multa_outros: () => buildCanceladoSemMultaOutrosSoftwareTemplate(faturas),
    };
    setEmailBody(builders[template] ? builders[template]() : "");
  };

  // Converte texto com [TEXTO](URL) em HTML com links clicáveis
  const textToHtml = (text) => {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const withLinks = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#2563eb;text-decoration:underline;">$1</a>');
    const withBreaks = withLinks.replace(/\n/g, '<br>');
    return `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#1e293b;">${withBreaks}</div>`;
  };

  const handleSendEmail = async () => {
    if (!data.resultado_retencao && data.request_type !== "duvidas") {
      toast.error("Preencha o campo 'Resultado da Retenção' antes de enviar o e-mail");
      return;
    }
    if (!emailBody.trim()) {
      toast.error("Corpo do e-mail não pode estar vazio");
      return;
    }
    setSendingEmail(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: `Atualização sobre sua solicitação — ${data.razao_social}`,
        body: textToHtml(emailBody),
      });
      toast.success("E-mail enviado com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar e-mail");
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    if (data && !emailBody) {
      if (data.request_type === "duvidas") {
        setEmailBody(buildDuvidaTemplate());
      } else {
        setEmailBody(buildRetidoTemplate());
      }
    }
  }, []);

  // Inicializa suspensao_de com hoje se resultado for suspenso e campo estiver vazio
  useEffect(() => {
    if (data.resultado_retencao === "suspenso" && !data.suspensao_de) {
      onChange("suspensao_de", new Date().toISOString().split('T')[0]);
    }
  }, [data.resultado_retencao]);

  // Regenera o template suspenso automaticamente quando as datas mudam
  useEffect(() => {
    if (emailTemplate === "suspenso") {
      setEmailBody(buildSuspensoTemplate(linkFaturaAberta, data.suspensao_de, data.suspensao_ate));
    }
  }, [data.suspensao_de, data.suspensao_ate]);

  useEffect(() => {
    if (data?.cobra_multa === 'sim' && data?.plano_contratado) {
      buscarProdutos();
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">

      {/* Status de Negociação */}
      {data.request_type !== "duvidas" && data.negociacao_realizada && (
        <div className="border-l-4 border-blue-500 bg-blue-50 rounded-r-lg p-4">
          <div className="flex items-start gap-3">
            <Handshake className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">Negociação em Andamento</h3>
              <p className="text-xs text-blue-800 mb-2">Este cliente está em tratativa de retenção. O cancelamento continua suspenso até que a negociação seja concluída.</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {data.proximo_contato_data && (
                  <div className="flex items-center gap-1 text-blue-700">
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                    <span>Próximo contato: {new Date(data.proximo_contato_data).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                {data.proximo_contato_tipo && (
                  <div className="flex items-center gap-1 text-blue-700">
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tipo: {data.proximo_contato_tipo === 'ativo' ? 'Ativo (empresa)' : 'Receptivo (cliente)'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contexto de Retenção */}
      {data.request_type !== "duvidas" && (
        <CollapsibleSection title="🔄 Contexto de Retenção" defaultOpen={true}>
          <InfoField label="Atendido por qual Analista em retenção" value={data.responsavel} />
          <InfoField label="Contato" value={data.canal_contato === "telefonico" ? "Telefônico" : data.canal_contato === "email" ? "E-mail" : data.canal_contato === "whatsapp" ? "WhatsApp" : data.canal_contato === "sem_retorno" ? "Sem retorno" : "—"} />
          <div className="col-span-2">
            <InfoField label="Real Motivo do Cancelamento" value={data.motivo_real} />
          </div>
          <div className="col-span-2">
            <InfoField label="O que foi negociado" value={data.texto_negociado} />
          </div>
          {data.resultado_retencao === "suspenso" && (data.suspensao_de || data.suspensao_ate) && (
            <div className="col-span-2">
              <InfoField
                label="Período de Suspensão"
                value={`${data.suspensao_de ? new Date(data.suspensao_de + 'T00:00:00').toLocaleDateString('pt-BR') : '—'} até ${data.suspensao_ate ? new Date(data.suspensao_ate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}`}
              />
            </div>
          )}
          <div className="col-span-2">
            <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Resultado da Retenção</label>
            <select
              value={data.resultado_retencao || ""}
              onChange={(e) => onChange("resultado_retencao", e.target.value || null)}
              className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white"
            >
              <option value="">—</option>
              <option value="retido">Retido</option>
              <option value="suspenso">Suspenso</option>
              <option value="reativado">Reativado</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          {data.resultado_retencao === "suspenso" && (
            <div className="col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Período de Suspensão</label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 mb-0.5">De</p>
                  <Input
                    type="date"
                    value={data.suspensao_de || new Date().toISOString().split('T')[0]}
                    onChange={(e) => onChange("suspensao_de", e.target.value)}
                    onFocus={() => { if (!data.suspensao_de) onChange("suspensao_de", new Date().toISOString().split('T')[0]); }}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-slate-400 mb-0.5">Até</p>
                  <Input
                    type="date"
                    value={data.suspensao_ate || ""}
                    onChange={(e) => onChange("suspensao_ate", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* Agendar Multa - ANTES do envio de e-mail */}
      {data.cobra_multa === "sim" && !!data.valor_multa_calculado && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg overflow-hidden">
          <div className="bg-amber-100 px-3 py-2 border-b border-amber-200 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wider">⚠️ Agendar Multa Contratual na Vindi</h3>
            {multaAgendada && <span className="text-xs text-green-700 font-semibold">✅ Agendada (Bill #{multaAgendada.bill_id})</span>}
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Valor da Multa</p>
                <p className="font-semibold text-amber-900">{fmtBRL(data.valor_multa_calculado)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Data de Emissão (Faturamento)</p>
                <Input
                  type="date"
                  value={emissaoMulta}
                  onChange={e => setEmissaoMulta(e.target.value)}
                  className="h-7 text-sm border-amber-300"
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Data de Vencimento</p>
                <Input
                  type="date"
                  value={vencimentoMulta}
                  onChange={e => setVencimentoMulta(e.target.value)}
                  className="h-7 text-sm border-amber-300"
                />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Método de Pagamento</p>
                <select
                  value={pmCode}
                  onChange={e => setPmCode(e.target.value)}
                  className="w-full h-7 text-sm border border-amber-300 rounded-md px-2 bg-white"
                >
                  <option value="online_bank_slip">Boleto Webservice Itaú V2</option>
                  <option value="cash_5">Dinheiro - Itaú - 53960-1</option>
                </select>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Descrição</p>
                <p className="text-sm text-slate-700">Multa contratual</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Produto da Multa (Vindi)</label>
                <button
                  type="button"
                  onClick={buscarProdutos}
                  disabled={loadingProdutos}
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                >
                  {loadingProdutos ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Recarregar
                </button>
              </div>
              {loadingProdutos ? (
                <p className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Buscando produto...</p>
              ) : produtoMultaId ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-md px-3 py-1.5">
                  <span className="text-xs text-green-700 font-medium">✅ Produto ID: {produtoMultaId}</span>
                  <button type="button" onClick={() => setProdutoMultaId('')} className="ml-auto text-[10px] text-slate-400 hover:text-red-500">Trocar</button>
                </div>
              ) : (
                <p className="text-xs text-amber-600">⚠️ Produto não encontrado. Verifique se o plano "{data.plano_contratado}" está configurado em Configurações &gt; Planos.</p>
              )}
            </div>

            {multaAgendada?.url && (
              <div className="bg-green-50 border border-green-200 rounded-md p-2 text-xs text-green-800">
                ✅ Link gerado automaticamente e inserido no template de e-mail: <a href={multaAgendada.url} target="_blank" rel="noreferrer" className="underline">{multaAgendada.url}</a>
              </div>
            )}

            {multaJaGravada && !forcarNovaMulta ? (
              <div className="space-y-2">
                <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 text-xs text-green-800">
                  ✅ Multa já gerada — Bill #{data.multa_bill_id}
                  {data.multa_due_at && <span className="ml-2">· Venc. {(() => { try { const d = new Date(data.multa_due_at); return isNaN(d) ? data.multa_due_at.slice(0, 10).split('-').reverse().join('/') : d.toLocaleDateString('pt-BR'); } catch { return data.multa_due_at.slice(0, 10).split('-').reverse().join('/'); } })()}</span>}
                  {data.multa_bill_url && <a href={data.multa_bill_url} target="_blank" rel="noreferrer" className="ml-2 underline">Ver boleto</a>}
                </div>
                <Button size="sm" variant="outline" onClick={() => setForcarNovaMulta(true)} className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50">
                  Gerar Nova Multa
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleAgendarMulta}
                disabled={agendandoMulta || !produtoMultaId}
                className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs gap-1.5"
                size="sm"
              >
                {agendandoMulta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {agendandoMulta ? 'Agendando...' : 'Agendar Multa na Vindi'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Envio de E-mail */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-blue-50 px-3 py-2 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-2">
            <Mail className="w-3.5 h-3.5" /> Enviar E-mail ao Cliente
          </h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Template:</label>
            <select
              value={emailTemplate}
              onChange={e => handleTemplateChange(e.target.value)}
              disabled={loadingFaturas}
              className="flex-1 h-8 text-sm border border-slate-200 rounded-md px-2 bg-white"
            >
              {data.request_type === "duvidas" ? (
                <option value="duvida_resposta">Resposta</option>
              ) : (
                <>
                  <option value="retido">Cliente Retido</option>
                  <option value="suspenso">Suspenso</option>
                  <option value="cancelado_com_multa">Cancelamento c/ Multa</option>
                  <option value="cancelado_sem_multa">Cancelamento s/ Multa</option>
                  <option value="cancelado_com_multa_outros">Cancelamento c/ Multa OUTROS SOFTWARE</option>
                  <option value="cancelado_sem_multa_outros">Cancelamento s/ Multa OUTROS SOFTWARE</option>
                </>
              )}
            </select>
            {loadingFaturas && <Loader2 className="w-4 h-4 animate-spin text-slate-400 flex-shrink-0" />}
          </div>

          {emailTemplate === "duvida_resposta" && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Template padrão para responder dúvidas do cliente. Edite conforme necessário.</p>
            </div>
          )}

          {emailTemplate === "cancelado_com_multa" && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Faturas da Assinatura em Aberto</label>
                  <button
                    type="button"
                    onClick={async () => { const l = await buscarFaturasDaVindi(); setEmailBody(buildCanceladoComMultaTemplate(l, linkMulta)); }}
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                    disabled={loadingFaturas}
                  >
                    {loadingFaturas ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Buscar na Vindi
                  </button>
                </div>
                {faturas.length > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
                    {faturas.length} fatura(s) em aberto — vencimentos: {faturas.map(f => f.due_at ? new Date(f.due_at).toLocaleDateString('pt-BR') : '—').join(', ')}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">Clique em "Buscar na Vindi" para carregar automaticamente.</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">Link da Multa Agendada</label>
                <Input
                  value={linkMulta}
                  onChange={(e) => setLinkMulta(e.target.value)}
                  onBlur={() => setEmailBody(buildCanceladoComMultaTemplate(faturas, linkMulta))}
                  placeholder="Cole aqui o link da fatura da multa gerada na Vindi..."
                  className="h-8 text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">Será incluído como link de pagamento da multa contratual no e-mail.</p>
              </div>
            </div>
          )}

          {emailTemplate === "cancelado_com_multa_outros" && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Faturas da Assinatura em Aberto</label>
                  <button
                    type="button"
                    onClick={async () => { const l = await buscarFaturasDaVindi(); setEmailBody(buildCanceladoComMultaOutrosSoftwareTemplate(l, linkMulta)); }}
                    className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                    disabled={loadingFaturas}
                  >
                    {loadingFaturas ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Buscar na Vindi
                  </button>
                </div>
                {faturas.length > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
                    {faturas.length} fatura(s) em aberto — vencimentos: {faturas.map(f => f.due_at ? new Date(f.due_at).toLocaleDateString('pt-BR') : '—').join(', ')}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">Clique em "Buscar na Vindi" para carregar automaticamente.</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-1">Link da Multa Agendada</label>
                <Input
                  value={linkMulta}
                  onChange={(e) => setLinkMulta(e.target.value)}
                  onBlur={() => setEmailBody(buildCanceladoComMultaOutrosSoftwareTemplate(faturas, linkMulta))}
                  placeholder="Cole aqui o link da fatura da multa gerada na Vindi..."
                  className="h-8 text-sm"
                />
              </div>
            </div>
          )}

          {emailTemplate === "cancelado_sem_multa_outros" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Faturas em Aberto</label>
                <button
                  type="button"
                  onClick={async () => { const l = await buscarFaturasDaVindi(); setEmailBody(buildCanceladoSemMultaOutrosSoftwareTemplate(l)); }}
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                  disabled={loadingFaturas}
                >
                  {loadingFaturas ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Buscar na Vindi
                </button>
              </div>
              {faturas.length > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
                  {faturas.length} fatura(s) em aberto — vencimentos: {faturas.map(f => f.due_at ? new Date(f.due_at).toLocaleDateString('pt-BR') : '—').join(', ')}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Clique em "Buscar na Vindi" para carregar as faturas automaticamente.</p>
              )}
            </div>
          )}

          {emailTemplate === "cancelado_sem_multa" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Faturas em Aberto</label>
                <button
                  type="button"
                  onClick={async () => { const l = await buscarFaturasDaVindi(); setEmailBody(buildCanceladoSemMultaTemplate(l)); }}
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                  disabled={loadingFaturas}
                >
                  {loadingFaturas ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Buscar na Vindi
                </button>
              </div>
              {faturas.length > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
                  {faturas.length} fatura(s) em aberto — vencimentos: {faturas.map(f => f.due_at ? new Date(f.due_at).toLocaleDateString('pt-BR') : '—').join(', ')}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Clique em "Buscar na Vindi" para carregar as faturas automaticamente.</p>
              )}
            </div>
          )}

          {emailTemplate === "suspenso" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Link da Fatura em Aberto</label>
                <button
                  type="button"
                  onClick={async () => { const l = await buscarFaturasDaVindi(); setEmailBody(buildSuspensoTemplate(l[0]?.url || linkFaturaAberta)); }}
                  className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
                  disabled={loadingFaturas}
                >
                  {loadingFaturas ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Buscar na Vindi
                </button>
              </div>
              {faturas.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
                  {faturas.length} fatura(s) em aberto — vencimentos: {faturas.map(f => f.due_at ? new Date(f.due_at).toLocaleDateString('pt-BR') : '—').join(', ')}
                </div>
              )}
              <Input
                value={linkFaturaAberta}
                onChange={(e) => setLinkFaturaAberta(e.target.value)}
                onBlur={() => setEmailBody(buildSuspensoTemplate(linkFaturaAberta))}
                placeholder="Link buscado automaticamente ou cole manualmente..."
                className="h-8 text-sm"
              />
              <p className="text-[11px] text-slate-400">Se preenchido, o aviso de boleto será incluído no e-mail.</p>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Corpo do E-mail</label>
              <button
                type="button"
                onClick={() => handleTemplateChange(emailTemplate)}
                className="text-xs text-blue-500 hover:text-blue-700 underline"
              >
                🔄 Restaurar template
              </button>
            </div>
            <Textarea
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="text-sm min-h-32"
              placeholder="Edite o template ou escreva um novo..."
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSendEmail}
              disabled={sendingEmail || (data.request_type !== "duvidas" && !data.resultado_retencao)}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 disabled:opacity-50"
              size="sm"
            >
              {sendingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Enviar E-mail
            </Button>
          </div>
        </div>
      </div>

      {/* Observações livres */}
      <div className="border border-slate-200 rounded-lg p-3">
        <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold block mb-1">Observações</label>
        <textarea
          value={data.observacoes || ""}
          onChange={e => onChange("observacoes", e.target.value)}
          className="w-full h-20 text-sm border border-slate-200 rounded-md px-2 py-1 bg-white resize-none"
          placeholder="Observações livres sobre este processo..."
        />
      </div>
    </div>
  );
}