import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { mesesParaTexto } from "./TempoAssinatura";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import VindiActionsPanel from "./VindiActionsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, Check, Phone, Mail, Send, CheckSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

const toUTCDate = (date) => {
  if (!date) return null;
  const s = String(date);
  return new Date(s.includes('Z') || s.includes('+') ? s : s + 'Z');
};

const formatBR = (date) => {
  if (!date) return "—";
  return toUTCDate(date).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const formatBRDate = (date) => {
  if (!date) return "—";
  return toUTCDate(date).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const STATUS_FLOW = [
  { key: "recebido",     label: "Recebido" },
  { key: "analista",    label: "Analista" },
  { key: "processando", label: "Processando" },
  { key: "concluido",   label: "Concluído" },
];

const TYPE_LABELS = {
  cancelamento: "Cancelamento",
  downgrade: "Downgrade",
  duvidas: "Dúvidas",
};

const TYPE_COLORS = {
  cancelamento: "bg-red-100 text-red-700",
  downgrade: "bg-amber-100 text-amber-700",
  duvidas: "bg-blue-100 text-blue-700",
};

const STATUS_STORE_LABELS = { ativo: "Ativo", ex_assinante: "Ex-Assinante", bloqueado: "Bloqueado" };
const MOTIVO_NAO_MULTA_LABELS = {
  tp_sem_termo: "TP sem Termo",
  negociado_multa: "Negociado Multa",
  erro_operacional: "Erro Operacional"
};

const fmtBRL = (v) => v ? `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null;
const fmtYesNo = (v) => v === "sim" ? "✓ Sim" : v === "nao" ? "Não" : null;

function Section({ title, children }) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function SubSection({ title, color = "text-slate-500", children }) {
  return (
    <div className="col-span-2 border-t border-slate-100 pt-3 mt-1">
      <p className={`text-[10px] ${color} uppercase tracking-wider font-semibold mb-3`}>{title}</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {children}
      </div>
    </div>
  );
}

function InfoField({ label, value, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value || <span className="text-slate-300 italic">—</span>}</p>
    </div>
  );
}

export default function RequestSheet({ request, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [data, setData] = useState({});
  const [actionText, setActionText] = useState("");
  const [actionCanal, setActionCanal] = useState("telefone");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeSection, setActiveSection] = useState("dados");

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (request) setData({ ...request });
  }, [request]);

  const { data: actions = [] } = useQuery({
    queryKey: ["actions", request?.id],
    queryFn: () => base44.entities.RequestAction.filter({ request_id: request.id }, "-created_date", 100),
    enabled: !!request?.id,
  });

  const { data: comunicacoes = [] } = useQuery({
    queryKey: ["comunicacoes", request?.id],
    queryFn: () => base44.entities.Comunicacao.filter({ request_id: request.id }, "-created_date", 50),
    enabled: !!request?.id,
  });

  const addActionMutation = useMutation({
    mutationFn: (payload) => base44.entities.RequestAction.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions", request.id] });
      setActionText("");
      toast.success("Ação registrada!");
    },
  });

  const handleAddAction = async () => {
    if (!actionText.trim()) return;
    await addActionMutation.mutateAsync({
      request_id: request.id,
      descricao: actionText,
      canal: actionCanal,
      autor_nome: currentUser?.full_name || "Sistema",
      autor_email: currentUser?.email || "",
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.RetentionRequest.delete(request.id);
    toast.success("Solicitação excluída!");
    onSaved?.();
    onClose();
    setDeleting(false);
  };

  const handleSendEmail = async () => {
    if (!actionText.trim()) return;
    setSendingEmail(true);
    await base44.integrations.Core.SendEmail({
      to: data.email,
      subject: `Atualização sobre sua solicitação — ${data.razao_social}`,
      body: actionText,
    });
    await addActionMutation.mutateAsync({
      request_id: request.id,
      descricao: `[E-mail enviado] ${actionText}`,
      canal: "email",
      autor_nome: currentUser?.full_name || "Sistema",
      autor_email: currentUser?.email || "",
    });
    setSendingEmail(false);
    toast.success("E-mail enviado ao cliente!");
  };

  const oficializado = comunicacoes.some(c => c.tipo_template === 'cancelamento' && c.status_envio === 'enviado');
  const activeFlowIdx = oficializado ? 3
    : (data.contato_telefone || !!data.negociacao_realizada) ? 2
    : !!data.responsavel ? 1
    : 0;

  const EM_TRATATIVA_STATUSES = ['em_tratativa','em_retencao_contato','aguardando_cliente','aguardando_prazo','aguardando_pagamento','em_execucao','processo_finalizado','retido'];
  const verticalSteps = [
    { label: "Triagem realizada", sublabel: "", done: true },
    { label: "Analista de retenção atribuído", sublabel: data.responsavel || "Aguardando atribuição", done: !!data.responsavel },
    { label: "Contato com cliente realizado", sublabel: "", done: !!(data.contato_telefone || data.negociacao_realizada) },
    { label: "Em tratativa / Negociação", sublabel: "", done: EM_TRATATIVA_STATUSES.includes(data.status_processo) },
    { label: "Aguardando prazo / pagamento", sublabel: data.data_cancelamento_efetivo ? `Até ${formatBRDate(data.data_cancelamento_efetivo)}` : "", done: !!data.data_cancelamento_efetivo },
    { label: "Oficialização enviada ao cliente", sublabel: "", done: oficializado },
  ];

  const detailKey = { cancelamento: "motivo", downgrade: "solicitacao", duvidas: "duvida" }[data.request_type];
  const detailLabel = { cancelamento: "Motivo do cancelamento", downgrade: "Solicitação de downgrade", duvidas: "Dúvida" }[data.request_type];

  if (!request) return null;

  return (
    <>
      <div className="fixed top-0 bottom-0 left-0 lg:left-64 right-0 bg-black/25 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-0 bottom-0 left-0 lg:left-64 right-0 bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <Badge className={`${TYPE_COLORS[data.request_type]} text-xs`}>{TYPE_LABELS[data.request_type] || "Solicitação"}</Badge>
            <h2 className="font-semibold text-slate-900">{data.razao_social}</h2>
          </div>
          <div className="flex items-center gap-2">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Confirmar exclusão?</span>
                <Button size="sm" onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white h-7 px-2 text-xs gap-1">
                  {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Excluir"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} className="h-7 px-2 text-xs">Cancelar</Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-1 h-7 px-2">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Sub-nav */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {[
            { key: "dados", label: "Ficha" },
            { key: "vindi", label: "Vindi" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveSection(tab.key)}
              className={`px-5 py-3 text-sm font-medium transition-all border-b-2 ${
                activeSection === tab.key
                  ? "text-blue-600 border-blue-500"
                  : "text-slate-500 border-transparent hover:text-slate-700"
              }`}
            >{tab.label}</button>
          ))}
        </div>

        {activeSection === "vindi" && (
          <div className="flex-1 overflow-y-auto">
            <VindiActionsPanel
              request={data}
              onSaved={() => {
                queryClient.invalidateQueries({ queryKey: ["retention-requests"] });
                onSaved?.();
              }}
              onDataImported={(newFields) => setData(prev => ({ ...prev, ...newFields }))}
              currentUser={currentUser}
            />
          </div>
        )}

        <div className={`flex-1 overflow-y-auto px-6 py-6 space-y-5 ${activeSection !== "dados" ? "hidden" : ""}`}>

          {/* ─── 1. Dados da Solicitação ─── */}
          <Section title="Dados da Solicitação">
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Razão Social" value={data.razao_social} />
              <InfoField label="CNPJ / CPF" value={data.cnpj} />
              <InfoField label="Solicitante" value={data.solicitante} />
              <InfoField label="Data da Solicitação" value={formatBR(data.created_date)} />
              <InfoField label="Telefone" value={data.telefone} />
              <InfoField label="E-mail" value={data.email} />
              {detailKey && <InfoField full label={detailLabel} value={data[detailKey]} />}
            </div>
          </Section>

          {/* ─── 2. Ficha da Assinatura ─── */}
          <Section title="Ficha da Assinatura">
            {/* Dados fixos da assinatura */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <InfoField label="ID Assinatura" value={data.id_assinatura} />
              <InfoField label="ID Cliente Vindi" value={data.vindi_customer_id} />
              <InfoField label="Plano da Assinatura" value={data.plano_contratado} />
              <InfoField label="Marca" value={data.marca} />
              <InfoField label="Família" value={data.familia} />
              <InfoField label="Endereço" value={data.endereco} />
              <InfoField label="Bairro" value={data.bairro} />
              <InfoField label="Cidade / Estado" value={[data.cidade, data.estado].filter(Boolean).join(" / ") || null} />
              <InfoField label="CEP" value={data.cep} />
            </div>


            <div className="border-t border-slate-100 pt-3 mt-1">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <InfoField label="Plano Auxiliar" value={data.plano_auxiliar} />
                <InfoField label="Qtde Funcionários" value={data.qtde_funcionarios} />
                <InfoField label="Condição de Pagamento" value={data.condicao_pagamento} />
                <InfoField label="Valor Mensalidade" value={fmtBRL(data.valor_mensalidade)} />
                <InfoField label="Inadimplente" value={fmtYesNo(data.inadimplente)} />
                <InfoField label="Ciclos Faturados" value={data.ciclos_faturados} />
                <InfoField label="Tempo de Assinatura" value={mesesParaTexto(data.tempo_contrato) || null} />
                <InfoField label="Ciclos Faltantes" value={data.ciclos_faltantes} />
                <InfoField label="Data Opcional para Cancelamento" value={formatBRDate(data.data_ex_assinante)} />
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Possui Termo?</p>
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                    {data.possui_termo ? "✓ Sim" : "Não"}
                    {data.link_termo && (
                      <a href={data.link_termo} target="_blank" rel="noreferrer" className="text-blue-500 underline text-xs">Ver arquivo</a>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 mt-1">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <InfoField label="Status Store" value={STATUS_STORE_LABELS[data.status_store] || "Ativo"} />
                <InfoField label="Cancelamento agendado para" value={formatBRDate(data.data_efetivacao)} />
              </div>
            </div>

            <div className="col-span-2 border-t border-slate-100 pt-3 mt-1">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <InfoField label="Classificação da Motivação" value={data.classificacao_motivacao} />
                <InfoField label="Possui Multa" value={fmtYesNo(data.possui_multa)} />
                <InfoField label="Cobra Multa" value={fmtYesNo(data.cobra_multa)} />
                {data.cobra_multa === "nao" && (
                  <InfoField label="Motivo não cobrar multa" value={MOTIVO_NAO_MULTA_LABELS[data.motivo_nao_cobra_multa] || data.motivo_nao_cobra_multa} />
                )}
                <InfoField label="Valor Multa Calculado" value={fmtBRL(data.valor_multa_calculado)} />
                <InfoField full label="Real motivo (analista)" value={data.motivo_real} />
                <InfoField full label="Negociação realizada" value={data.negociacao_realizada} />
              </div>
            </div>
          </Section>

          {/* ─── 3. Contato Retenção ─── */}
          <Section title="Contato Retenção">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <InfoField full label="Real motivo" value={data.motivo_real} />
              <InfoField full label="Negociação realizada" value={data.negociacao_realizada} />
              <div className="col-span-2">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Ações solicitadas à Analista</p>
                {actions.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">Nenhuma ação registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {actions.map((a) => (
                      <div key={a.id} className="flex gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${a.canal === "email" ? "bg-blue-100" : "bg-green-100"}`}>
                          {a.canal === "email" ? <Mail className="w-3 h-3 text-blue-600" /> : <Phone className="w-3 h-3 text-green-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 leading-snug">{a.descricao}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {a.autor_nome && <span className="font-medium text-slate-500">{a.autor_nome}</span>}
                            {a.autor_nome && " · "}
                            {formatBR(a.created_date)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ─── 4. Status ─── */}
          <Section title="Status">
            <div className="flex items-center mb-5">
              {STATUS_FLOW.map((step, idx) => {
                const done = idx < activeFlowIdx;
                const active = idx === activeFlowIdx;
                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        done ? "bg-green-500 text-white" : active ? "bg-blue-600 text-white ring-4 ring-blue-100" : "bg-slate-100 text-slate-400"
                      }`}>
                        {done ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <span className={`text-[10px] font-medium whitespace-nowrap ${
                        active ? "text-blue-600" : done ? "text-green-600" : "text-slate-400"
                      }`}>{step.label}</span>
                    </div>
                    {idx < STATUS_FLOW.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 ${idx < activeFlowIdx ? "bg-green-400" : "bg-slate-200"}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="space-y-0">
              {verticalSteps.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                      step.done ? "bg-green-500 border-green-500" : "bg-white border-slate-300"
                    }`}>
                      {step.done
                        ? <Check className="w-3 h-3 text-white" />
                        : <span className="w-2 h-2 rounded-full bg-slate-300" />}
                    </div>
                    {idx < verticalSteps.length - 1 && (
                      <div className={`w-0.5 h-6 mt-0.5 ${step.done ? "bg-green-300" : "bg-slate-200"}`} />
                    )}
                  </div>
                  <div className="pb-4 flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-none ${step.done ? "text-slate-800" : "text-slate-400"}`}>{step.label}</p>
                    {step.sublabel && (
                      <p className={`text-xs mt-0.5 ${step.done ? "text-slate-500" : "text-slate-300"}`}>{step.sublabel}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>

        </div>
      </div>
    </>
  );
}