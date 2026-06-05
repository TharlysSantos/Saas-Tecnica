import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ExecutionForm from "./ExecutionForm";
import DuvidaResponseForm from "./DuvidaResponseForm";
import ProximoContatoSelector from "./ProximoContatoSelector";
import SemRetornoEmailForm from "./SemRetornoEmailForm";
import EnvioDoTermo from "./EnvioDoTermo";
import ExAssinantePanel from "./ExAssinantePanel";
import { Loader2, Save, ChevronRight, ChevronDown, Upload, ExternalLink, ArrowRight, ArrowLeft, Search, UserCheck, Eye, EyeOff, RefreshCw, Database, Download, X, CheckCircle2 } from "lucide-react";
import { mesesParaTexto, gerarOpcoes } from "./TempoAssinatura";
import TicketsDoCliente from "./TicketsDoCliente";
import { toast } from "sonner";

const ETAPAS = [
  { key: "triagem", label: "Triagem", color: "blue", statuses: ["triagem"] },
  { key: "retencao", label: "Retenção", color: "amber", statuses: ["em_tratativa", "em_retencao_contato", "aguardando_cliente", "aguardando_prazo", "aguardando_pagamento"] },
  { key: "execucao", label: "Execução", color: "purple", statuses: ["em_execucao"] },
  { key: "store", label: "Store", color: "red", statuses: ["processo_finalizado", "bloqueado", "reprocessar"] },
  { key: "oficializacao", label: "Oficialização", color: "orange", statuses: ["retido"] },
  { key: "concluido", label: "Concluído", color: "green", statuses: ["concluido"] },
];

const NEXT_STATUS = {
  triagem: "em_tratativa",
  retencao: "em_execucao",
  execucao: "processo_finalizado",
  ex_assinante: "retido",
  oficializacao: "concluido",
  concluido: null,
};

const STAGE_COLORS = {
  blue: { tab: "bg-blue-500 text-white", badge: "bg-blue-100 text-blue-700", card: "border-blue-200 bg-blue-50/20", btn: "bg-blue-600 hover:bg-blue-700" },
  amber: { tab: "bg-amber-500 text-white", badge: "bg-amber-100 text-amber-700", card: "border-amber-200 bg-amber-50/20", btn: "bg-amber-600 hover:bg-amber-700" },
  purple: { tab: "bg-purple-500 text-white", badge: "bg-purple-100 text-purple-700", card: "border-purple-200 bg-purple-50/20", btn: "bg-purple-600 hover:bg-purple-700" },
  red: { tab: "bg-red-500 text-white", badge: "bg-red-100 text-red-700", card: "border-red-200 bg-red-50/20", btn: "bg-red-600 hover:bg-red-700" },
  orange: { tab: "bg-orange-500 text-white", badge: "bg-orange-100 text-orange-700", card: "border-orange-200 bg-orange-50/20", btn: "bg-orange-600 hover:bg-orange-700" },
  green: { tab: "bg-green-600 text-white", badge: "bg-green-100 text-green-700", card: "border-green-200 bg-green-50/20", btn: "bg-green-600 hover:bg-green-700" },
};

const fmtBRL = (v) => v != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "—";
const fmtDate = (v) => v ? new Date(v + "T00:00:00").toLocaleDateString("pt-BR") : "—";

// Calcula data de cancelamento baseado na regra:
// COM multa: próximo_faturamento - 2 dias
// SEM multa: próximo_faturamento + 30 dias - 2 dias
function calcularCancelamentoAgendado(proximoFaturamento, temMulta) {
  if (!proximoFaturamento) return null;
  const d = new Date(proximoFaturamento + "T00:00:00");
  
  if (temMulta) {
    // Com multa: 2 dias antes do próximo faturamento
    d.setDate(d.getDate() - 2);
  } else {
    // Sem multa: 30 dias depois + 2 dias antes (= 28 dias depois)
    d.setDate(d.getDate() + 28);
  }
  
  return d.toISOString().split('T')[0];
}

// Calcula multa: valor_mensalidade * ciclos_faltantes / 2
function calcularMulta(ciclosFaltantes, valorMensalidade) {
  const ciclos = Number(ciclosFaltantes) || 0;
  const valor = Number(valorMensalidade) || 0;
  return ciclos > 0 && valor > 0 ? (valor * ciclos) / 2 : null;
}

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">{label}</p>
      <p className="text-sm text-slate-700">{value || "—"}</p>
    </div>
  );
}

function FieldRow({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">{label}</p>
      {children}
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

/* ── Read-only sections ── */
function DadosSolicitacao({ req, allRequests = [] }) {
  const fmtData = (d) => d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
  
  return (
    <CollapsibleSection title="📋 Dados da Solicitação">
      <InfoField label="Data da Solicitação" value={fmtData(req.created_date)} />
      <InfoField label="Razão Social" value={req.razao_social} />
      <InfoField label="CNPJ" value={req.cnpj} />
      <InfoField label="Solicitante" value={req.solicitante} />
      <InfoField label="Telefone" value={req.telefone} />
      <InfoField label="E-mail" value={req.email} />
      <InfoField label="Tipo de Solicitação" value={req.request_type} />
      <div className="col-span-2"><InfoField label="Motivo" value={req.motivo} /></div>
      <div className="col-span-2">
        <TicketsDoCliente currentRequestId={req.id} cnpj={req.cnpj} idFreshworks={req.id_freshworks} allRequests={allRequests} />
      </div>
    </CollapsibleSection>
  );
}

function FichaAssinatura({ req }) {
  const customerId = req.vindi_customer_id || req.vindi_data?.customer_id;
  const vindiLink = customerId ? `https://sandbox-app.vindi.com.br/admin/customers/${customerId}` : null;
  
  return (
    <CollapsibleSection title="📄 Ficha da Assinatura" defaultOpen={true}>
      <div className="col-span-2 space-y-2">
        <InfoField label="ID Assinatura" value={req.id_assinatura} />
        {vindiLink && (
          <a href={vindiLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-xs text-blue-600 hover:bg-blue-100 transition-colors font-semibold">
            <ExternalLink className="w-3.5 h-3.5" /> Abrir cliente no Vindi
          </a>
        )}
        {!vindiLink && req.id_assinatura && (
          <p className="text-xs text-slate-400 italic">Dados do cliente ainda não carregados. Salve novamente.</p>
        )}
      </div>
      <InfoField label="Família" value={req.familia} />
      <InfoField label="Condição de Pagamento" value={req.condicao_pagamento} />
      <InfoField label="Valor Mensalidade" value={fmtBRL(req.valor_mensalidade)} />
      <InfoField label="Inadimplente" value={req.inadimplente === "sim" ? "Sim" : req.inadimplente === "nao" ? "Não" : null} />
      <InfoField label="Cancelamento agendado para" value={fmtDate(req.data_ex_assinante)} />
      <InfoField label="Possui Multa (Automático)" value={req.possui_multa === "sim" ? "Sim" : req.possui_multa === "nao" ? "Não" : null} />
      <InfoField label="Valor Multa Calculado" value={req.valor_multa_calculado != null ? fmtBRL(req.valor_multa_calculado) : null} />
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">Termo Anexado</p>
        {req.link_termo ? (
          <a href={req.link_termo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline font-medium">
            ✓ Ver termo
          </a>
        ) : (
          <p className="text-sm text-slate-400 italic">Não anexado</p>
        )}
      </div>
    </CollapsibleSection>
  );
}

/* ── Stage forms ── */
function TempoAssinaturaInput({ value, onChange }) {
  const [input, setInput] = useState("");
  const opcoes = gerarOpcoes();
  const filtradas = input.trim()
    ? opcoes.filter(o => o.label.toLowerCase().includes(input.toLowerCase()) || String(o.meses).startsWith(input))
    : opcoes.slice(0, 20);
  const display = mesesParaTexto(value);

  return (
    <div className="space-y-1">
      <Input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={display || "Ex: 1, 12, 1 ano e 6 meses..."}
        className="h-8 text-sm"
      />
      {input.trim() && (
        <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-md bg-white divide-y divide-slate-100 shadow-sm z-10 relative">
          {filtradas.map(o => (
            <button
              key={o.meses}
              type="button"
              onClick={() => { onChange(o.meses); setInput(""); }}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 transition-colors"
            >
              {o.label}
            </button>
          ))}
          {filtradas.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400 italic">Nenhuma opção</p>
          )}
        </div>
      )}

    </div>
  );
}

function ObservacaoVindi({ data, currentUser, analistasConfig = [] }) {
  const [enviando, setEnviando] = useState(false);

  const gerarTexto = () => {
    const cancelamentoData = data.data_ex_assinante
      ? new Date(data.data_ex_assinante + "T00:00:00").toLocaleDateString("pt-BR")
      : "—";
    const dataAbertura = new Date().toLocaleDateString("pt-BR");
    // Tenta encontrar o nome reduzido pelo e-mail do usuário logado
    const analistaConfig = analistasConfig.find(a => a.email === currentUser?.email);
    const analista = analistaConfig?.nome || currentUser?.full_name || "—";

    return `Cliente entrou em contato solicitando cancelamento através do TICKET ${data.id_freshworks || "—"}
Solicitante: ${data.solicitante || "—"}
E-mail: ${data.email || "—"}
Telefone: ${data.telefone || "—"}
Encerramento do Acesso: ${cancelamentoData}
Atendimento realizado por ${analista} em ${dataAbertura}`;
  };

  const handleEnviar = async () => {
    if (!data.id_assinatura) {
      toast.error("Importe a assinatura Vindi antes de enviar a observação");
      return;
    }
    setEnviando(true);
    try {
      await base44.functions.invoke("vindiIntegration", {
        action: "adicionar_observacao",
        subscription_id: String(data.id_assinatura),
        observacao: gerarTexto(),
      });
      toast.success("Observação enviada para a Vindi!");
    } catch (e) {
      toast.error("Erro ao enviar observação: " + e.message);
    } finally {
      setEnviando(false);
    }
  };

  const texto = gerarTexto();

  return (
    <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">📝 Observação para a Vindi</span>
        <Button
          size="sm"
          onClick={handleEnviar}
          disabled={enviando || !data.id_assinatura}
          className="h-7 text-xs gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
        >
          {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {enviando ? "Enviando..." : "Enviar para Vindi"}
        </Button>
      </div>
      <pre className="text-xs text-purple-800 bg-purple-100/60 rounded p-2 whitespace-pre-wrap leading-relaxed font-mono">
        {texto}
      </pre>
      {!data.id_assinatura && (
        <p className="text-[10px] text-amber-600">⚠️ Importe a assinatura Vindi para habilitar o envio</p>
      )}
    </div>
  );
}

function TriagemForm({ data, onChange, analistas = [], planosAuxiliares = [], requestId, currentUser, analistasConfig = [], allRequests = [] }) {
  const planosFiltrados = data.marca
    ? planosAuxiliares.filter(p => p.marca === data.marca)
    : planosAuxiliares;
  const [buscando, setBuscando] = useState(false);
  const [assinaturas, setAssinaturas] = useState([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [planosConfigs, setPlanosConfigs] = useState([]);
  const [customerIdInput, setCustomerIdInput] = useState("");

  useEffect(() => {
    base44.entities.PlanConfig.list("nome", 200).then(setPlanosConfigs).catch(() => {});
  }, []);

  // Aplica todos os campos de uma assinatura processada pelo backend
  const aplicarDadosAssinatura = (d, fallbackCustomerId) => {
    const customerId = d.customer_id || fallbackCustomerId;
    const nomePlano = d.subscription?.plan?.name || null;
    const temMulta = (d.possui_multa || "nao") === "sim";
    const proximoFaturamento = d.subscription?.next_billing_at;
    
    onChange("id_assinatura", String(d.subscription?.id || ""));
    onChange("plano_contratado", nomePlano);
    onChange("marca", d.marca || null);
    onChange("familia", d.familia || null);
    onChange("condicao_pagamento", d.condicao_pagamento || null);
    onChange("valor_mensalidade", d.valor_mensalidade ?? null);
    onChange("ciclos_faturados", d.ciclos_faturados ?? null);
    onChange("tempo_contrato", d.meses_contrato ?? null);
    onChange("ciclos_faltantes", d.ciclos_faltantes ?? null);
    onChange("valor_multa_calculado", d.valor_multa_calculado ?? null);
    onChange("possui_multa", d.possui_multa || "nao");
    onChange("inadimplente", d.inadimplente ? "sim" : "nao");
    onChange("status_store", d.inadimplente ? "bloqueado" : "ativo");
    onChange("endereco", d.endereco || null);
    onChange("bairro", d.bairro || null);
    onChange("cidade", d.cidade || null);
    onChange("estado", d.estado || null);
    onChange("cep", d.cep || null);
    onChange("data_cancelamento_efetivo", d.data_cancelamento_efetivo || null);
    
    // Calcula data de cancelamento se não vier da Vindi
    if (!d.data_cancelamento_efetivo && proximoFaturamento) {
      const dataCancelamento = calcularCancelamentoAgendado(proximoFaturamento, temMulta);
      onChange("data_ex_assinante", dataCancelamento);
    } else {
      onChange("data_ex_assinante", d.data_cancelamento_efetivo || null);
    }
    
    onChange("vindi_data", { ...d, customer_id: customerId });
    onChange("vindi_customer_id", String(customerId || ""));
  };

  const handleBuscarPorCustomerId = async (customerId) => {
    if (!customerId) {
      toast.error("Informe o ID do cliente Vindi");
      return;
    }
    setBuscando(true);
    try {
      const res = await base44.functions.invoke("vindiIntegration", {
        action: "buscar_por_customer_id",
        customer_id: String(customerId),
      });
      const d = res.data;
      if (d?.multiple && d?.subscriptions?.length > 0) {
        setAssinaturas(d.subscriptions);
        setMostrarResultados(true);
        toast.success(`${d.subscriptions.length} assinatura(s) encontrada(s)`);
      } else if (d?.found && d?.subscription) {
        aplicarDadosAssinatura(d, customerId);
        toast.success("Assinatura importada com sucesso!");
      } else {
        toast.info("Nenhuma assinatura ativa encontrada para este cliente");
      }
    } catch (e) {
      toast.error("Erro ao buscar: " + e.message);
    } finally {
      setBuscando(false);
    }
  };

  const handleBuscarAssinatura = async () => {
    if (!data.cnpj) {
      toast.error("Preencha o CNPJ da solicitação primeiro");
      return;
    }
    setBuscando(true);
    try {
      const res = await base44.functions.invoke("vindiIntegration", {
        action: "buscar_por_cnpj",
        cnpj: data.cnpj,
      });
      const d = res.data;

      if (d?.multiple && d?.subscriptions?.length > 0) {
        setAssinaturas(d.subscriptions);
        setMostrarResultados(true);
        toast.success(`${d.subscriptions.length} assinatura(s) encontrada(s)`);
      } else if (d?.found && d?.subscription) {
        aplicarDadosAssinatura(d, d.customer_id);
        toast.success("Assinatura importada com sucesso!");
      } else if (d?.found && d?.skip_customer_id) {
        toast.warning("Nenhuma assinatura ativa encontrada para este CNPJ. Use a busca pelo ID do cliente Vindi (ex: 1109368).");
      } else {
        toast.info("Nenhuma assinatura encontrada para este CNPJ/CPF");
      }
    } catch (e) {
      toast.error("Erro ao buscar: " + e.message);
    } finally {
      setBuscando(false);
    }
  };

  const handleSelecionarAssinatura = async (sub) => {
    setBuscando(true);
    try {
      const res = await base44.functions.invoke("vindiIntegration", {
        action: "buscar_por_id_assinatura",
        subscription_id: String(sub.id),
      });
      const d = res.data;
      const customerId = d.customer_id || d.subscription?.customer?.id;
      onChange("id_assinatura", String(sub.id));
      const nomePlano = d.subscription?.plan?.name || sub.plan_name;
      onChange("plano_contratado", nomePlano);
      onChange("marca", d.marca || null);
      onChange("familia", d.familia || null);
      const planConfig = planosConfigs.find(p => p.nome === nomePlano);
      if (planConfig) {
        onChange("possui_multa", (planConfig.multa || "").toUpperCase() === "SIM" ? "sim" : "nao");
      }
      onChange("condicao_pagamento", d.condicao_pagamento || null);
      onChange("valor_mensalidade", d.valor_mensalidade ?? sub.amount);
      onChange("ciclos_faturados", d.ciclos_faturados ?? null);
      onChange("tempo_contrato", d.meses_contrato ?? null);
      onChange("ciclos_faltantes", d.ciclos_faltantes ?? null);
      onChange("valor_multa_calculado", d.valor_multa_calculado ?? null);
      onChange("inadimplente", d.inadimplente ? "sim" : "nao");
      onChange("status_store", d.inadimplente ? "bloqueado" : "ativo");
      onChange("endereco", d.endereco || null);
      onChange("bairro", d.bairro || null);
      onChange("cidade", d.cidade || null);
      onChange("estado", d.estado || null);
      onChange("cep", d.cep || null);
      onChange("data_cancelamento_efetivo", d.data_cancelamento_efetivo || null);
      onChange("vindi_data", { ...d, customer_id: customerId });
      onChange("vindi_customer_id", String(customerId || ''));
      setMostrarResultados(false);
      toast.success("Assinatura importada com sucesso!");
    } catch (e) {
      onChange("id_assinatura", String(sub.id));
      onChange("plano_contratado", sub.plan_name);
      onChange("valor_mensalidade", sub.amount);
      toast.error("Não foi possível carregar todos os dados: " + e.message);
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Buscar Assinatura Vindi */}
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Importar Assinatura Vindi</span>
          </div>
          <Button
            size="sm"
            onClick={handleBuscarAssinatura}
            disabled={buscando || !data.cnpj}
            className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
          >
            {buscando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {buscando ? "Buscando..." : "Buscar"}
          </Button>
        </div>
        {data.cnpj && (
          <p className="text-[10px] text-green-600">CNPJ/CPF: {data.cnpj}</p>
        )}
        {!data.cnpj && (
          <p className="text-[10px] text-amber-600">⚠️ Preencha o CNPJ na solicitação para buscar</p>
        )}

        {/* Busca alternativa por ID do cliente Vindi */}
        <div className="mt-2 pt-2 border-t border-green-200">
          <p className="text-[10px] text-green-600 font-semibold mb-1">Ou buscar pelo ID do cliente Vindi:</p>
          <div className="flex gap-1.5">
            <Input
              value={customerIdInput}
              onChange={e => setCustomerIdInput(e.target.value)}
              placeholder="Ex: 123456"
              className="h-7 text-sm flex-1 border-green-300"
            />
            <Button
              size="sm"
              onClick={() => handleBuscarPorCustomerId(customerIdInput)}
              disabled={buscando || !customerIdInput}
              className="h-7 text-xs gap-1 bg-green-700 hover:bg-green-800"
            >
              {buscando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              Buscar
            </Button>
          </div>
        </div>
        
        {mostrarResultados && assinaturas.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-[10px] font-semibold text-green-700 uppercase">Assinaturas encontradas:</p>
            {assinaturas.map((sub) => (
              <button
                key={sub.id}
                onClick={() => handleSelecionarAssinatura(sub)}
                className="w-full text-left px-2 py-1.5 text-xs bg-white border border-green-200 rounded hover:bg-green-50 transition-colors"
              >
                <span className="font-semibold">#{sub.id} — {sub.plan_name}</span>
                {sub.amount && <span className="ml-2 text-green-700">R$ {Number(sub.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
                {sub.status && <span className="ml-2 text-[10px] text-slate-500">• {sub.status}</span>}
              </button>
            ))}
            <button onClick={() => setMostrarResultados(false)} className="text-[10px] text-green-600 hover:underline mt-1">
              Fechar resultados
            </button>
          </div>
        )}
      </div>

      {/* Analista */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <UserCheck className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Analista Responsável</span>
        </div>
        <select
          value={data.responsavel || ""}
          onChange={e => onChange("responsavel", e.target.value || null)}
          className="w-full h-8 text-sm border border-blue-300 rounded-md px-2 bg-white"
        >
          <option value="">Não atribuído</option>
          {analistas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <FieldRow label="Plano Auxiliar">
        <>
          <Input
            list="planos-auxiliares-list"
            value={data.plano_auxiliar || ""}
            onChange={e => onChange("plano_auxiliar", e.target.value)}
            className="h-8 text-sm"
            placeholder="Selecione ou digite..."
          />
          <datalist id="planos-auxiliares-list">
            {planosFiltrados.map(p => <option key={p.id} value={p.nome} />)}
          </datalist>
        </>
      </FieldRow>
      <FieldRow label="Qtde Funcionários">
        <Input type="number" value={data.qtde_funcionarios ?? ""} onChange={e => onChange("qtde_funcionarios", e.target.value === "" ? null : Number(e.target.value))} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Tempo de Assinatura">
        <TempoAssinaturaInput value={data.tempo_contrato} onChange={v => onChange("tempo_contrato", v)} />
      </FieldRow>
      {data.possui_multa === "sim" && (
        <FieldRow label="Ciclos Faltantes">
          <Input type="number" value={data.ciclos_faltantes ?? ""} onChange={e => {
            const newValue = e.target.value === "" ? null : Number(e.target.value);
            onChange("ciclos_faltantes", newValue);
            // Recalcula multa automaticamente
            const novaMulta = calcularMulta(newValue, data.valor_mensalidade);
            onChange("valor_multa_calculado", novaMulta);
          }} className="h-8 text-sm" />
        </FieldRow>
      )}
      <FieldRow label="Data Opcional para Cancelamento">
        <Input type="date" value={data.data_cancelamento_efetivo || ""} onChange={e => {
          const novaData = e.target.value || null;
          onChange("data_cancelamento_efetivo", novaData);
          if (novaData) {
            onChange("data_ex_assinante", novaData);
          } else {
            // Se limpar o campo, recalcula pela regra automática
            const proximoFaturamento = data.vindi_data?.subscription?.next_billing_at;
            if (proximoFaturamento) {
              const temMulta = data.possui_multa === "sim";
              onChange("data_ex_assinante", calcularCancelamentoAgendado(proximoFaturamento, temMulta));
            } else {
              onChange("data_ex_assinante", null);
            }
          }
        }} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Cancelamento agendado para">
        <Input type="date" value={data.data_ex_assinante || ""} disabled className="h-8 text-sm bg-slate-50" />
      </FieldRow>
      {data.possui_multa === "sim" && <TermoUpload data={data} onChange={onChange} />}
      <ObservacaoVindi data={data} currentUser={currentUser} analistasConfig={analistasConfig} />
      <FieldRow label="Observações">
        <textarea value={data.observacoes || ""} onChange={e => onChange("observacoes", e.target.value)} className="w-full h-20 text-sm border border-slate-200 rounded-md px-2 py-1 bg-white resize-none" placeholder="Observações livres sobre este processo..." />
      </FieldRow>
    </div>
  );
}

function TermoUpload({ data, onChange }) {
  const [uploading, setUploading] = useState(false);
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onChange("link_termo", file_url);
    onChange("possui_termo", true);
    setUploading(false);
    toast.success("Arquivo carregado! Clique em Salvar para confirmar.");
  };
  return (
    <div className="col-span-2 flex items-center gap-3">
      <label className={`flex items-center gap-1.5 cursor-pointer text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-slate-500" />}
        {uploading ? "Enviando..." : "Upload do Termo"}
        <input type="file" className="hidden" disabled={uploading} onChange={handleUpload} accept=".pdf,.doc,.docx,.png,.jpg" />
      </label>
      {data.link_termo ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-green-600 font-semibold flex items-center gap-1">✓ Termo anexado</span>
          <a href={data.link_termo} target="_blank" rel="noreferrer" className="text-xs text-blue-500 underline flex items-center gap-1">
            Ver <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={() => { onChange("link_termo", null); onChange("possui_termo", false); }}
            className="text-xs text-red-400 hover:text-red-600 underline"
          >
            Remover
          </button>
        </div>
      ) : (
        <span className="text-xs text-slate-400 italic">Nenhum arquivo anexado</span>
      )}
    </div>
  );
}

function RetencaoForm({ data, onChange, motivosOptions = [], encontrarCategoria, analistas = [], req, currentUser, allRequests = [] }) {
  const handleMotivoChange = (id) => {
    onChange("conclusao_motivo_id", id || null);
    const categoria = encontrarCategoria(id);
    onChange("classificacao_motivacao", categoria?.nome || null);
  };

  const categoriaEncontrada = encontrarCategoria(data.conclusao_motivo_id);

  return (
     <div className="flex flex-col gap-3">
      <FieldRow label="Data Opcional para Cancelamento">
        <Input type="date" value={data.data_cancelamento_efetivo || ""} onChange={e => onChange("data_cancelamento_efetivo", e.target.value || null)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Transferir para o analista">
        <select
          value={data.responsavel || ""}
          onChange={e => onChange("responsavel", e.target.value === "" ? req.responsavel : e.target.value)}
          className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white"
        >
          <option value="">Não atribuído (mantém atual)</option>
          {analistas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </FieldRow>
      <FieldRow label="Cobra Multa">
        <select value={data.cobra_multa || ""} onChange={e => onChange("cobra_multa", e.target.value || null)} className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white">
          <option value="">—</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </FieldRow>
       {data.cobra_multa === "nao" && (
         <>
           <FieldRow label="Motivo não cobrar multa">
             <select value={data.motivo_nao_cobra_multa || ""} onChange={e => onChange("motivo_nao_cobra_multa", e.target.value || null)} className="w-full h-7 text-sm border border-slate-200 rounded-md px-2 bg-white">
               <option value="">—</option>
               <option value="tp_sem_termo">Sem Termo</option>
               <option value="negociado_multa">Multa Negociada</option>
               <option value="erro_operacional">Erro Interno</option>
             </select>
           </FieldRow>
         </>
       )}
      <FieldRow label="Contato">
        <select value={data.canal_contato || ""} onChange={e => onChange("canal_contato", e.target.value || null)} className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white">
          <option value="">—</option>
          <option value="telefonico">Telefônico</option>
          <option value="email">E-mail</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="sem_retorno">Sem retorno em nenhum dos canais</option>
        </select>
      </FieldRow>
      {data.canal_contato === "sem_retorno" && (
        <SemRetornoEmailForm req={req} analyistName={currentUser?.full_name} analyistEmail={currentUser?.email} />
      )}
      <FieldRow label="Real Motivo do Cancelamento">
        <Input value={data.motivo_real || ""} onChange={e => onChange("motivo_real", e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="O que foi negociado">
        <textarea value={data.texto_negociado || ""} onChange={e => onChange("texto_negociado", e.target.value)} className="w-full h-16 text-sm border border-slate-200 rounded-md px-2 py-1 bg-white resize-none" placeholder="Descreva o que foi negociado com o cliente..." />
      </FieldRow>
      <FieldRow label="Continuar a negociação com o cliente">
        <select value={data.negociacao_realizada ? "sim" : ""} onChange={e => onChange("negociacao_realizada", e.target.value === "sim" ? "sim" : null)} className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white">
          <option value="">—</option>
          <option value="sim">Sim</option>
          <option value="">Não</option>
        </select>
      </FieldRow>
      {data.negociacao_realizada && (
        <>
          <FieldRow label="Próximo contato - Data">
            <ProximoContatoSelector value={data.proximo_contato_data} onChange={v => onChange("proximo_contato_data", v)} req={req} />
          </FieldRow>
          <FieldRow label="Próximo contato - Tipo">
            <select value={data.proximo_contato_tipo || ""} onChange={e => onChange("proximo_contato_tipo", e.target.value || null)} className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white">
              <option value="">—</option>
              <option value="ativo">Ativo (realizado pela empresa)</option>
              <option value="receptivo">Receptivo (cliente entra em contato)</option>
            </select>
          </FieldRow>
        </>
      )}
      <FieldRow label="Motivação">
        <select
          value={data.conclusao_motivo_id || ""}
          onChange={e => handleMotivoChange(e.target.value)}
          className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white"
        >
          <option value="">Selecione...</option>
          {motivosOptions.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
      </FieldRow>
      <FieldRow label="Categoria (Preenchida Automaticamente)">
        <Input value={categoriaEncontrada?.nome || ""} disabled className="h-8 text-sm bg-slate-50" />
      </FieldRow>
      <FieldRow label="Resultado da Retenção">
        <select value={data.resultado_retencao || ""} onChange={e => onChange("resultado_retencao", e.target.value || null)} className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white">
          <option value="">—</option>
          <option value="retido">Retido</option>
          <option value="suspenso">Suspenso</option>
          <option value="reativado">Reativado</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </FieldRow>
      {data.resultado_retencao === "suspenso" && (
        <FieldRow label="Período de Suspensão">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 mb-0.5">De</p>
              <Input
                type="date"
                value={data.suspensao_de || new Date().toISOString().split('T')[0]}
                onChange={e => onChange("suspensao_de", e.target.value)}
                onFocus={() => { if (!data.suspensao_de) onChange("suspensao_de", new Date().toISOString().split('T')[0]); }}
                className="h-8 text-sm"
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-slate-400 mb-0.5">Até</p>
              <Input
                type="date"
                value={data.suspensao_ate || ""}
                onChange={e => onChange("suspensao_ate", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </FieldRow>
      )}
      <FieldRow label="Possibilidade de retorno futuramente">
        <select value={data.retorno_futuro || ""} onChange={e => onChange("retorno_futuro", e.target.value || null)} className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white">
          <option value="">—</option>
          <option value="sim">Sim</option>
          <option value="nao">Não</option>
        </select>
      </FieldRow>
      <FieldRow label="Observações">
        <textarea value={data.observacoes || ""} onChange={e => onChange("observacoes", e.target.value)} className="w-full h-20 text-sm border border-slate-200 rounded-md px-2 py-1 bg-white resize-none" placeholder="Observações livres sobre este processo..." />
      </FieldRow>
    </div>
  );
}

function ExecucaoForm({ data, onChange, currentUser, onGoBack, req, stage, allRequests = [] }) {
  if (data.request_type === "duvida") {
    return <DuvidaResponseForm data={data} onChange={onChange} currentUser={currentUser} />;
  }
  return <ExecutionForm data={data} onChange={onChange} currentUser={currentUser} onGoBack={onGoBack} />;
}

function ExAssinanteForm({ data, onChange, currentUser, onGoBack }) {
  const queryClient = useQueryClient();
  const [checking, setChecking] = useState(false);

  const isAdimplente = data.inadimplente !== "sim";
  const isBloqueado = data.status_store === "bloqueado";
  const isExAssinante = data.status_store === "ex_assinante";
  const isReprocessar = data.status_store === "reprocessar";

  // Ativar como Ex-Assinante (adimplentes)
  const handleAtivarExAssinante = async () => {
    onChange("status_store", "ex_assinante");
    onChange("status_processo", "concluido"); // Avança para próxima fase
    toast.success("Cliente ativado como Ex-Assinante!");
  };

  // Bloquear (inadimplentes)
  const handleBloquear = async () => {
    onChange("status_store", "bloqueado");
    toast.success("Cliente marcado como Bloqueado!");
  };

  // Reativar após pagamento (reprocessar -> ex_assinante)
  const handleReativarAposPagamento = async () => {
    onChange("status_store", "ex_assinante");
    toast.success("Cliente reativado como Ex-Assinante!");
  };

  // Avançar para Oficialização (verifica se não tem fatura aberta)
  const handleAvancarOficializacao = async () => {
    setChecking(true);
    try {
      // Verifica faturas abertas na Vindi
      const res = await base44.functions.invoke("vindiIntegration", {
        action: "buscar_por_id_assinatura",
        subscription_id: String(data.id_assinatura),
      });
      const d = res.data;
      
      if (d?.found && d?.open_bills > 0) {
        toast.error(`Cliente ainda possui ${d.open_bills} fatura(s) em aberto.`);
        return;
      }

      // Avança para oficialização
      onChange("status_processo", "retido");
      toast.success("Cliente avançado para Oficialização!");
    } catch (e) {
      toast.error("Erro ao verificar faturas: " + e.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Fluxo de Ações Rápidas */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">⚡ Ações Rápidas</p>
        
        {isAdimplente && data.status_store !== "ex_assinante" && (
          <Button onClick={handleAtivarExAssinante} className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
            ✅ Ativar como Ex-Assinante
          </Button>
        )}

        {!isAdimplente && !isBloqueado && (
          <Button onClick={handleBloquear} className="w-full bg-red-600 hover:bg-red-700 text-white gap-2">
            🔒 Bloquear Inadimplente
          </Button>
        )}

        {isReprocessar && (
          <Button onClick={handleReativarAposPagamento} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
            🔄 Reativar após Pagamento
          </Button>
        )}

        {isExAssinante && data.id_assinatura && (
          <Button 
            onClick={handleAvancarOficializacao} 
            disabled={checking} 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            {checking ? "Verificando..." : "📋 Avançar para Oficialização"}
          </Button>
        )}
      </div>

      {/* Info do Status Atual */}
      <div className={`border rounded-lg p-3 text-xs space-y-2 ${
        isBloqueado ? "bg-red-50 border-red-200" :
        isExAssinante ? "bg-green-50 border-green-200" :
        isReprocessar ? "bg-amber-50 border-amber-200" :
        "bg-slate-50 border-slate-200"
      }`}>
        <p className="font-semibold">
          {isBloqueado && "🔒 Bloqueado - Aguardando pagamento"}
          {isExAssinante && "✅ Ex-Assinante - Pronto para oficializar"}
          {isReprocessar && "🔄 Reprocessar - Aguardando reativação"}
          {!isBloqueado && !isExAssinante && !isReprocessar && "ℹ️ Selecione uma ação acima"}
        </p>
      </div>

      <FieldRow label="Status Store">
        <select value={data.status_store || "ativo"} onChange={e => onChange("status_store", e.target.value)} className="w-full h-8 text-sm border border-slate-200 rounded-md px-2 bg-white">
          <option value="ativo">Ativo</option>
          <option value="ex_assinante">Ex-Assinante</option>
          <option value="bloqueado">Bloqueado</option>
          <option value="reprocessar">Reprocessar</option>
        </select>
      </FieldRow>

      <FieldRow label="Observações">
        <textarea value={data.observacoes || ""} onChange={e => onChange("observacoes", e.target.value)} className="w-full h-20 text-sm border border-slate-200 rounded-md px-2 py-1 bg-white resize-none" placeholder="Observações livres sobre este processo..." />
      </FieldRow>
    </div>
  );
}

function OficializacaoForm({ data, onChange }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
        <p className="text-sm font-semibold text-orange-700 mb-2">📝 Oficialização do Cancelamento</p>
        <p className="text-xs text-orange-600">Preencha os dados para finalizar o processo.</p>
      </div>
      <FieldRow label="Resumo da Conclusão">
        <Input value={data.conclusao_resumo || ""} onChange={e => onChange("conclusao_resumo", e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Próximas Ações">
        <Input value={data.conclusao_proximas_acoes || ""} onChange={e => onChange("conclusao_proximas_acoes", e.target.value)} className="h-8 text-sm" />
      </FieldRow>
      <FieldRow label="Observações">
        <textarea value={data.observacoes || ""} onChange={e => onChange("observacoes", e.target.value)} className="w-full h-20 text-sm border border-slate-200 rounded-md px-2 py-1 bg-white resize-none" placeholder="Observações livres sobre este processo..." />
      </FieldRow>
    </div>
  );
}

function ConcluidoForm({ data, onChange }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
        <p className="text-sm font-semibold text-green-700 mb-2">✅ Processo Concluído</p>
        <p className="text-xs text-green-600">
          {data.request_type === "duvidas" && "Dúvida do cliente respondida e finalizada."}
          {data.request_type === "cancelamento" && "Cancelamento oficializado e finalizado."}
          {data.request_type === "downgrade" && "Downgrade processado e finalizado."}
        </p>
      </div>
      <FieldRow label="Observações">
        <textarea value={data.observacoes || ""} onChange={e => onChange("observacoes", e.target.value)} className="w-full h-20 text-sm border border-slate-200 rounded-md px-2 py-1 bg-white resize-none" placeholder="Observações livres sobre este processo..." />
      </FieldRow>
    </div>
  );
}

function RequestCard({ req, stage, analistas, analistasConfig = [], planosAuxiliares, motivosOptions, categoriasOptions, encontrarCategoria, currentUser, onSaved, stageRequests = [], allRequests = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleGoBack = async () => {
    const previousStage = ETAPAS.find(e => e.key === stage.key);
    const previousStageIdx = ETAPAS.indexOf(previousStage) - 1;
    if (previousStageIdx >= 0) {
      const prevStage = ETAPAS[previousStageIdx];
      const newStatus = prevStage.statuses[prevStage.statuses.length - 1] || prevStage.statuses[0];
      setSaving(true);
      await base44.entities.RetentionRequest.update(req.id, { status_processo: newStatus });
      queryClient.invalidateQueries({ queryKey: ["workflow-requests"] });
      toast.success("Retornado à etapa anterior");
      setSaving(false);
      setExpanded(false);
      onSaved?.();
    }
  };

  const handleExpand = () => {
    if (!expanded) {
      const newForm = { ...req };
      // Calcular multa se estiver na retenção e cobra_multa = sim
      if (stage.key === "retencao" && newForm.cobra_multa === "sim") {
        const ciclos = Number(newForm.ciclos_faltantes) || 0;
        const mensalidade = Number(newForm.valor_mensalidade) || 0;
        if (ciclos > 0 && mensalidade > 0) {
          newForm.valor_multa_calculado = ciclos * mensalidade;
        }
      }
      setForm(newForm);
    }
    setExpanded(v => !v);
  };

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async (advance = false, goBack = false) => {
    if (goBack) {
      await handleGoBack();
      return;
    }
    setSaving(true);
    const payload = { ...form };
    console.log('💾 Salvando payload:', { vindi_customer_id: payload.vindi_customer_id, id_assinatura: payload.id_assinatura });

    // Atualiza inadimplente consultando a Vindi ao salvar (se tiver id_assinatura)
    if (payload.id_assinatura) {
      try {
        const res = await base44.functions.invoke("vindiIntegration", {
          action: "buscar_por_id_assinatura",
          subscription_id: String(payload.id_assinatura),
        });
        const d = res.data;
        if (d?.found) {
          payload.inadimplente = d.inadimplente ? "sim" : "nao";
          payload.status_store = d.inadimplente ? "bloqueado" : (payload.status_store === "bloqueado" ? "ativo" : payload.status_store);
        }
      } catch (_) {}
    }
    if (stage.key === "retencao") {
      const multaCalculada = calcularMulta(payload.ciclos_faltantes, payload.valor_mensalidade);
      if (multaCalculada !== null) {
        payload.valor_multa_calculado = multaCalculada;
      }
    }
    if (stage.key === "triagem" && payload.request_type === "duvidas" && !payload.responsavel) {
      payload.status_processo = "em_execucao";
    } else if (stage.key === "triagem" && payload.request_type === "duvidas" && payload.responsavel) {
      payload.status_processo = "em_execucao";
    } else if (stage.key === "execucao" && payload.request_type === "duvidas") {
      payload.status_processo = "concluido";
    } else if (advance && NEXT_STATUS[stage.key]) {
      payload.status_processo = NEXT_STATUS[stage.key];
    }
    console.log('📤 Update final payload:', { vindi_customer_id: payload.vindi_customer_id, id_assinatura: payload.id_assinatura });
    await base44.entities.RetentionRequest.update(req.id, payload);
    queryClient.invalidateQueries({ queryKey: ["workflow-requests"] });
    toast.success(advance ? "Salvo e avançado para próxima etapa!" : "Salvo com sucesso!");
    setSaving(false);
    setExpanded(false);
    onSaved?.();
  };

  const colors = STAGE_COLORS[stage.color];

  const renderForm = () => {
    switch (stage.key) {
      case "triagem": return (
        <TriagemForm data={form} onChange={handleChange} analistas={analistas} planosAuxiliares={planosAuxiliares} requestId={req.id} currentUser={currentUser} analistasConfig={analistasConfig || []} allRequests={allRequests} />
      );
      case "retencao": return <RetencaoForm data={form} onChange={handleChange} motivosOptions={motivosOptions} encontrarCategoria={encontrarCategoria} analistas={analistas} req={req} currentUser={currentUser} allRequests={allRequests} />;
      case "execucao": return <ExecucaoForm data={form} onChange={handleChange} currentUser={currentUser} onGoBack={handleGoBack} req={req} stage={stage} allRequests={allRequests} />;
      case "oficializacao": return <OficializacaoForm data={form} onChange={handleChange} />;
      case "concluido": return <ConcluidoForm data={form} onChange={handleChange} />;
      default: return null;
    }
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${colors.card}`}>
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/60 transition-colors"
        onClick={handleExpand}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-2">
            {req.razao_social}
            {req.negociacao_realizada && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase tracking-wider flex-shrink-0">🤝 Negociando</span>}
          </p>
          <p className="text-xs text-slate-400">
            {req.cnpj} · {req.request_type}
            {req.responsavel && stage.key !== "triagem" && <span className="ml-2 text-slate-500">· 👤 {req.responsavel}</span>}
            {req.proximo_contato_data && <span className="ml-2 text-blue-600 font-semibold">· 📅 {new Date(req.proximo_contato_data).toLocaleDateString('pt-BR')}</span>}
          </p>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </div>

      {expanded && (
        <div className="border-t border-slate-200 px-4 py-4 bg-white space-y-4">
          {/* Read-only info sections */}
          <DadosSolicitacao req={req} allRequests={allRequests} />
          <FichaAssinatura req={{ ...req, ...form }} />

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400 uppercase tracking-wider font-semibold">Formulário da Etapa</span>
            </div>
          </div>

          {renderForm()}

          <div className="flex items-center gap-2 pt-2">
            <Button size="sm" onClick={() => handleSave(false)} disabled={saving} className={`${colors.btn} text-white gap-1.5 h-8`}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </Button>
            {(stage.key === "execucao" || stage.key === "retencao" || stage.key === "ex_assinante" || stage.key === "oficializacao") && (
              <Button size="sm" onClick={handleGoBack} disabled={saving} variant="outline" className="gap-1.5 h-8 border-slate-300">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                Salvar e Voltar
              </Button>
            )}
            {NEXT_STATUS[stage.key] && (
              <Button 
                size="sm" 
                onClick={() => handleSave(true)} 
                disabled={saving || (stage.key === "retencao" && form.negociacao_realizada)} 
                variant="outline" 
                className="gap-1.5 h-8 border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                title={stage.key === "retencao" && form.negociacao_realizada ? "Altere o status de negociação para avançar" : ""}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                Salvar e Avançar
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setExpanded(false)} className="h-8 ml-auto">Cancelar</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkflowBoard() {
  const [activeStage, setActiveStage] = useState("triagem");
  const [search, setSearch] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [retencaoFilters, setRetencaoFilters] = useState([]);
  const [execucaoFilters, setExecucaoFilters] = useState([]);
  const [storeFilters, setStoreFilters] = useState([]);
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterAdimplencia, setFilterAdimplencia] = useState("todos");
  const [filterFaturas, setFilterFaturas] = useState("todos");
  const [filterCnpj, setFilterCnpj] = useState("");
  const [filterFamilia, setFilterFamilia] = useState("todos");
  const [filtroStoreAberto, setFiltroStoreAberto] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["workflow-requests"],
    queryFn: () => base44.entities.RetentionRequest.list("-created_date", 500),
  });

  const { data: stepConfigs = [] } = useQuery({
    queryKey: ["step-configs"],
    queryFn: () => base44.entities.StepConfig.list("-updated_date", 50),
  });

  // Normaliza analistas para objetos {nome, email}
  const normalizeAnalistas = (cfg) => (cfg?.analistas || []).map(a => typeof a === "string" ? { nome: a, email: "" } : a);

  // Combina analistas de TODOS os registros de uma etapa (evita problema de duplicatas no banco)
  const getAnalistasEtapa = (etapa) => {
    const registros = stepConfigs.filter(c => c.etapa === etapa);
    const todos = registros.flatMap(r => normalizeAnalistas(r));
    // Deduplicar por email (ou nome se sem email)
    const vistos = new Set();
    return todos.filter(a => {
      const key = a.email || a.nome;
      if (vistos.has(key)) return false;
      vistos.add(key);
      return true;
    });
  };

  // Analistas de triagem: usado para resolver o nome reduzido de quem está logado (na obs Vindi)
  const analistasTriagem = getAnalistasEtapa("triagem");
  // Analistas de retenção: aparecem no dropdown "Analista Responsável" da triagem
  const analistasRetencao = getAnalistasEtapa("retencao");
  const analistasConfig = analistasTriagem; // para resolver nome do usuário logado na observação Vindi
  const analistas = analistasRetencao.map(a => a.nome); // dropdown de atribuição

  const { data: motivosOptions = [] } = useQuery({
    queryKey: ["cancellation-reasons-active"],
    queryFn: () => base44.entities.CancellationReason.filter({ ativo: true }, "nome", 200),
  });

  const { data: categoriasOptions = [] } = useQuery({
    queryKey: ["reason-categories-active"],
    queryFn: () => base44.entities.ReasonCategory.filter({ ativo: true }, "nome", 200),
  });

  const { data: planosAuxiliares = [] } = useQuery({
    queryKey: ["planos-auxiliares"],
    queryFn: () => base44.entities.PlanoAuxiliar.filter({ ativo: true }, "nome", 200),
  });

  const { data: planConfigs = [] } = useQuery({
    queryKey: ["plan-configs"],
    queryFn: () => base44.entities.PlanConfig.list("nome", 200),
  });

  // Famílias únicas a partir das PlanConfigs (para o filtro Store)
  const familiasDinamica = React.useMemo(() => {
    const set = new Set();
    planConfigs.forEach(p => { if (p.familia) set.add(p.familia); });
    return Array.from(set).sort();
  }, [planConfigs]);

  const stage = ETAPAS.find(e => e.key === activeStage);
  const colors = STAGE_COLORS[stage.color];

  const stageRequests = requests.filter(r => {
    const statusMatch = stage.statuses.includes(r.status_processo);
    // Lógica especial: "duvida" sem responsável pula direto para execução (triagem -> execução)
    if (r.request_type === "duvida" && !r.responsavel) {
      return stage.key === "execucao" && statusMatch;
    }
    return statusMatch;
  });
  
  const searchLower = search.toLowerCase();
  const filtered = search
    ? stageRequests.filter(r =>
        r.razao_social?.toLowerCase().includes(searchLower) ||
        r.cnpj?.replace(/\D/g, "").includes(search.replace(/\D/g, "")) ||
        r.id_freshworks?.toLowerCase().includes(searchLower)
      )
    : stageRequests;

  // Aplicar filtros por etapa
  const finalFiltered = (() => {
    let result = filtered;
    
    if (activeStage === "retencao" && retencaoFilters.length > 0) {
      result = result.filter(r => 
        retencaoFilters.includes("negociacao") && r.negociacao_realizada
          ? retencaoFilters.includes("negociacao")
          : retencaoFilters.includes("outros")
      );
    }
    
    if (activeStage === "execucao" && execucaoFilters.length > 0) {
      result = result.filter(r => execucaoFilters.includes(r.resultado_retencao));
    }
    
    if (activeStage === "store" && storeFilters.length > 0) {
      result = result.filter(r => storeFilters.includes(r.status_store));
    }
    
    // Filtro de data para Ex-Assinante: usa data_cancelamento_efetivo, se não existir usa data_ex_assinante
    if (activeStage === "store" && (filterDateFrom || filterDateTo)) {
      result = result.filter(r => {
        const dataParaUsar = r.data_cancelamento_efetivo || r.data_ex_assinante;
        if (filterDateFrom && dataParaUsar < filterDateFrom) return false;
        if (filterDateTo && dataParaUsar > filterDateTo) return false;
        return true;
      });
    }
    
    return result;
  })();

  const countByStage = (s) => requests.filter(r => s.statuses.includes(r.status_processo)).length;

  // Encontra a categoria que contém um motivo específico
  const encontrarCategoria = (motivoId) => {
    if (!motivoId) return null;
    return categoriasOptions.find(cat => cat.motivos_ids?.includes(motivoId));
  };



  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workflow de Cancelamento</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie e avance as etapas do processo de cancelamento</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar empresa, CNPJ ou ticket..."
            value={search}
            onChange={e => {
              const val = e.target.value;
              setSearch(val);
              if (val.trim()) {
                // Encontra a primeira aba que tem resultado com esse texto
                const valLower = val.toLowerCase();
                const matchStage = ETAPAS.find(e =>
                  requests.some(r =>
                    e.statuses.includes(r.status_processo) &&
                    (r.razao_social?.toLowerCase().includes(valLower) ||
                     r.cnpj?.replace(/\D/g,"").includes(val.replace(/\D/g,"")) ||
                     r.id_freshworks?.toLowerCase().includes(valLower))
                  )
                );
                if (matchStage && matchStage.key !== activeStage) {
                  setActiveStage(matchStage.key);
                }
              }
            }}
            className="pl-10"
          />
        </div>
      </div>



      {/* Stage Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ETAPAS.map(e => {
          const count = countByStage(e);
          const isActive = activeStage === e.key;
          const c = STAGE_COLORS[e.color];
          return (
            <button
              key={e.key}
              onClick={() => { setActiveStage(e.key); setRetencaoFilters([]); setExecucaoFilters([]); setStoreFilters([]); setFilterDateFrom(""); setFilterDateTo(""); setFilterAdimplencia("todos"); setFilterFaturas("todos"); setFilterCnpj(""); setFilterFamilia("todos"); setFiltroStoreAberto(false); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                isActive ? c.tab : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {e.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? "bg-white/30" : c.badge}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtro de Retenção */}
      {activeStage === "retencao" && (
        <div className="flex items-center gap-3 pb-2">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filtrar por status:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "negociacao", label: "Em Negociação" },
              { value: "outros", label: "Outros" },
            ].map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={retencaoFilters.includes(option.value)}
                  onChange={e => {
                    if (e.target.checked) {
                      setRetencaoFilters([...retencaoFilters, option.value]);
                    } else {
                      setRetencaoFilters(retencaoFilters.filter(f => f !== option.value));
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <span className="text-sm text-slate-600">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Filtro de Execução */}
      {activeStage === "execucao" && (
        <div className="flex items-center gap-3 pb-2">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Filtrar por resultado:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "cancelado", label: "Cancelado" },
              { value: "retido", label: "Retido" },
              { value: "suspenso", label: "Suspenso" },
              { value: "reativado", label: "Reativado" },
            ].map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={execucaoFilters.includes(option.value)}
                  onChange={e => {
                    if (e.target.checked) {
                      setExecucaoFilters([...execucaoFilters, option.value]);
                    } else {
                      setExecucaoFilters(execucaoFilters.filter(f => f !== option.value));
                    }
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <span className="text-sm text-slate-600">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Filtros Store — bloco unificado */}
      {activeStage === "store" && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setFiltroStoreAberto(o => !o)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">🔍 Filtrar clientes</span>
              {(storeFilters.length > 0 || filterDateFrom || filterDateTo || filterAdimplencia !== "todos" || filterFaturas !== "todos" || filterCnpj || filterFamilia !== "todos") && (
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">Filtros ativos</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(storeFilters.length > 0 || filterDateFrom || filterDateTo || filterAdimplencia !== "todos" || filterFaturas !== "todos" || filterCnpj || filterFamilia !== "todos") && (
                <button
                  onClick={e => { e.stopPropagation(); setStoreFilters([]); setFilterDateFrom(""); setFilterDateTo(""); setFilterAdimplencia("todos"); setFilterFaturas("todos"); setFilterCnpj(""); setFilterFamilia("todos"); }}
                  className="text-[10px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpar
                </button>
              )}
              {filtroStoreAberto ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </div>
          </button>

          {filtroStoreAberto && <div className="p-4 space-y-3 border-t border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">

            {/* Status */}
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Status</p>
              <div className="flex flex-col gap-1">
                {[
                  { value: "ex_assinante", label: "Ex-Assinante" },
                  { value: "bloqueado", label: "Bloqueado" },
                  { value: "reprocessar", label: "Reprocessar" },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={storeFilters.includes(opt.value)}
                      onChange={e => {
                        if (e.target.checked) setStoreFilters(p => [...p, opt.value]);
                        else setStoreFilters(p => p.filter(f => f !== opt.value));
                      }}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600"
                    />
                    <span className="text-sm text-slate-600 group-hover:text-slate-800">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Data do cancelamento */}
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Data do cancelamento</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-6">De</span>
                  <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-8 text-sm flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-6">Até</span>
                  <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-8 text-sm flex-1" />
                </div>
              </div>
            </div>

            {/* Adimplência */}
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Adimplência</p>
              <div className="flex flex-col gap-1">
                {[
                  { value: "todos", label: "Todos" },
                  { value: "adimplente", label: "Adimplente" },
                  { value: "inadimplente", label: "Inadimplente" },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="adimplencia" value={opt.value} checked={filterAdimplencia === opt.value} onChange={() => setFilterAdimplencia(opt.value)} className="w-3.5 h-3.5 border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600 group-hover:text-slate-800">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Faturas em aberto */}
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Faturas em Aberto</p>
              <div className="flex flex-col gap-1">
                {[
                  { value: "todos", label: "Todos" },
                  { value: "sem_faturas", label: "Sem Faturas" },
                  { value: "com_faturas", label: "Com Faturas" },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="faturas" value={opt.value} checked={filterFaturas === opt.value} onChange={() => setFilterFaturas(opt.value)} className="w-3.5 h-3.5 border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600 group-hover:text-slate-800">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* CNPJ */}
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">CNPJ</p>
              <Input
                value={filterCnpj}
                onChange={e => setFilterCnpj(e.target.value)}
                placeholder="Digite o CNPJ..."
                className="h-8 text-sm"
              />
            </div>

            {/* Família */}
            <div>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Família</p>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="familia" value="todos" checked={filterFamilia === "todos"} onChange={() => setFilterFamilia("todos")} className="w-3.5 h-3.5 border-slate-300 text-blue-600" />
                  <span className="text-sm text-slate-600 group-hover:text-slate-800">Todos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="familia" value="kairos" checked={filterFamilia === "kairos"} onChange={() => setFilterFamilia("kairos")} className="w-3.5 h-3.5 border-slate-300 text-blue-600" />
                  <span className="text-sm text-slate-600 group-hover:text-slate-800">Kairos (inclui Kairos / PEC)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" name="familia" value="mdcomum" checked={filterFamilia === "mdcomum"} onChange={() => setFilterFamilia("mdcomum")} className="w-3.5 h-3.5 border-slate-300 text-blue-600" />
                  <span className="text-sm text-slate-600 group-hover:text-slate-800">MD Comum (inclui MD Comum / PEC)</span>
                </label>
                {familiasDinamica.filter(f => {
                  const fl = f.toLowerCase();
                  return !fl.includes("kairos") && !fl.includes("md comum") && !fl.includes("md comun");
                }).map(f => (
                  <label key={f} className="flex items-center gap-2 cursor-pointer group">
                    <input type="radio" name="familia" value={f} checked={filterFamilia === f} onChange={() => setFilterFamilia(f)} className="w-3.5 h-3.5 border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-600 group-hover:text-slate-800">{f}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>
          </div>}
        </div>
      )}

      {/* Painel Store - Exportar TXT */}
      {activeStage === "store" && (
        <ExAssinantePanel
          requests={stageRequests}
          storeFilters={storeFilters}
          filterAdimplencia={filterAdimplencia}
          filterFaturas={filterFaturas}
          filterCnpj={filterCnpj}
          filterFamilia={filterFamilia}
          filterDateFrom={filterDateFrom}
          filterDateTo={filterDateTo}
          planConfigs={planConfigs}
        />
      )}

      {/* Painel Oficialização — usa EnvioDoTermo */}
      {activeStage === "oficializacao" && <EnvioDoTermo />}

      {/* Cards */}
      {activeStage !== "store" && activeStage !== "oficializacao" && (
        isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : finalFiltered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">Nenhuma solicitação nesta etapa</p>
            <p className="text-sm mt-1">Avance solicitações de etapas anteriores para que apareçam aqui.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-w-2xl">
            {finalFiltered.map(req => (
              <RequestCard
                key={req.id}
                req={req}
                stage={stage}
                analistas={analistas}
                analistasConfig={analistasConfig}
                planosAuxiliares={planosAuxiliares}
                motivosOptions={motivosOptions}
                categoriasOptions={categoriasOptions}
                encontrarCategoria={encontrarCategoria}
                currentUser={currentUser}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ["workflow-requests"] })}
                stageRequests={finalFiltered}
                allRequests={requests}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}