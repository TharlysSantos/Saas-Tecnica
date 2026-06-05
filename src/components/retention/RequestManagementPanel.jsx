import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Save, Loader2, Building2, FileText, AlertCircle, Pencil, ListChecks, ClipboardCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import ActionsTab from "./ActionsTab";
import ConclusaoTab from "./ConclusaoTab";
import VindiActionsPanel from "./VindiActionsPanel";

const typeConfig = {
  cancelamento: { label: "Cancelamento", color: "bg-red-100 text-red-700" },
  downgrade: { label: "Downgrade", color: "bg-amber-100 text-amber-700" },
  duvidas: { label: "Dúvidas", color: "bg-blue-100 text-blue-700" },
};

const STATUS_OPTIONS = [
  { value: "triagem", label: "Triagem" },
  { value: "em_tratativa", label: "Em Tratativa" },
  { value: "em_retencao_contato", label: "Em Retenção (Contato)" },
  { value: "aguardando_cliente", label: "Aguardando Cliente" },
  { value: "aguardando_prazo", label: "Aguardando Prazo" },
  { value: "aguardando_pagamento", label: "Aguardando Pagamento" },
  { value: "em_execucao", label: "Em Execução" },
  { value: "processo_finalizado", label: "Finalizado" },
  { value: "retido", label: "Retido" },
];

const detailLabels = {
  cancelamento: { key: "motivo", label: "Motivo" },
  downgrade: { key: "solicitacao", label: "Solicitação" },
  duvidas: { key: "duvida", label: "Dúvida" },
};

const YesNoSelect = ({ value, onChange, label }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-slate-500 uppercase tracking-wider">{label}</Label>
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="sim">Sim</SelectItem>
        <SelectItem value="nao">Não</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

const Field = ({ label, value, onChange, type = "text", placeholder }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-slate-500 uppercase tracking-wider">{label}</Label>
    <Input
      type={type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || ""}
      className="h-9 text-sm"
    />
  </div>
);

function DataTab({ request, onSaved }) {
  const [editMode, setEditMode] = useState(false);
  const [mgmt, setMgmt] = useState({});
  const [saving, setSaving] = useState(false);

  const detail = detailLabels[request.request_type];

  useEffect(() => {
    setMgmt({
      status_processo: request.status_processo || "triagem",
      responsavel: request.responsavel || "",
      id_assinatura: request.id_assinatura || "",
      plano_contratado: request.plano_contratado || "",
      marca: request.marca || "",
      produto: request.produto || "",
      valor_mensalidade: request.valor_mensalidade || "",
      qtde_funcionarios: request.qtde_funcionarios || "",
      ciclos_faturados: request.ciclos_faturados || "",
      possui_multa: request.possui_multa || "",
      cobra_multa: request.cobra_multa || "",
      valor_multa: request.valor_multa || "",
      data_efetivacao: request.data_efetivacao || "",
      data_ex_assinante: request.data_ex_assinante || "",
      inadimplente: request.inadimplente || "",
    });
    setEditMode(false);
  }, [request]);

  const set = (key) => (val) => setMgmt((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    const payload = { ...mgmt };
    if (payload.valor_mensalidade) payload.valor_mensalidade = parseFloat(payload.valor_mensalidade);
    if (payload.qtde_funcionarios) payload.qtde_funcionarios = parseInt(payload.qtde_funcionarios);
    if (payload.ciclos_faturados) payload.ciclos_faturados = parseInt(payload.ciclos_faturados);
    if (payload.valor_multa) payload.valor_multa = parseFloat(payload.valor_multa);
    await base44.entities.RetentionRequest.update(request.id, payload);
    toast.success("Dados salvos com sucesso!");
    setSaving(false);
    setEditMode(false);
    onSaved?.();
  };

  const InfoRow = ({ label, value }) => (
    <div>
      <p className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-xs font-medium text-slate-700 mt-0.5">{value || <span className="text-slate-300 italic">—</span>}</p>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Dados da solicitação (sempre read-only) */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Dados da Solicitação
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoRow label="Razão Social" value={request.razao_social} />
            <InfoRow label="CNPJ" value={request.cnpj} />
            <InfoRow label="Solicitante" value={request.solicitante} />
            <InfoRow label="Telefone" value={request.telefone} />
            <div className="col-span-2"><InfoRow label="E-mail" value={request.email} /></div>
            {detail && request[detail.key] && (
              <div className="col-span-2 border-t border-slate-200 pt-3">
                <InfoRow label={detail.label} value={request[detail.key]} />
              </div>
            )}
          </div>
        </div>

        {/* Status e Responsável */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
            Status & Analista
          </p>
          {editMode ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-500 uppercase tracking-wider">Status</Label>
                <Select value={mgmt.status_processo} onValueChange={set("status_processo")}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Field label="Analista" value={mgmt.responsavel} onChange={set("responsavel")} placeholder="Nome do analista" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <InfoRow label="Status" value={STATUS_OPTIONS.find(o => o.value === mgmt.status_processo)?.label} />
              <InfoRow label="Analista" value={mgmt.responsavel} />
            </div>
          )}
        </div>

        {/* Informações do Contrato */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Informações do Contrato
            </p>
            {!editMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
                className="h-7 text-xs gap-1.5 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Pencil className="w-3 h-3" /> Editar
              </Button>
            )}
          </div>

          {editMode ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="ID Assinatura" value={mgmt.id_assinatura} onChange={set("id_assinatura")} placeholder="Ex: ASS-001" />
                <Field label="Plano Contratado" value={mgmt.plano_contratado} onChange={set("plano_contratado")} placeholder="Ex: Premium" />
                <Field label="Marca" value={mgmt.marca} onChange={set("marca")} placeholder="Marca" />
                <Field label="Produto" value={mgmt.produto} onChange={set("produto")} placeholder="Produto" />
                <Field label="Valor Mensalidade (R$)" value={mgmt.valor_mensalidade} onChange={set("valor_mensalidade")} type="number" placeholder="0,00" />
                <Field label="Qtde Funcionários" value={mgmt.qtde_funcionarios} onChange={set("qtde_funcionarios")} type="number" placeholder="0" />
                <Field label="Ciclos Faturados" value={mgmt.ciclos_faturados} onChange={set("ciclos_faturados")} type="number" placeholder="0" />
                <YesNoSelect label="Inadimplente?" value={mgmt.inadimplente} onChange={set("inadimplente")} />
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Multa</p>
                <div className="grid grid-cols-2 gap-3">
                  <YesNoSelect label="Possui Multa?" value={mgmt.possui_multa} onChange={set("possui_multa")} />
                  <YesNoSelect label="Cobra Multa?" value={mgmt.cobra_multa} onChange={set("cobra_multa")} />
                  <div className="col-span-2">
                    <Field label="Valor da Multa (R$)" value={mgmt.valor_multa} onChange={set("valor_multa")} type="number" placeholder="0,00" />
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Datas</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Data da Efetivação" value={mgmt.data_efetivacao} onChange={set("data_efetivacao")} type="date" />
                  <Field label="Data Ex-Assinante" value={mgmt.data_ex_assinante} onChange={set("data_ex_assinante")} type="date" />
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <InfoRow label="ID Assinatura" value={mgmt.id_assinatura} />
              <InfoRow label="Plano Contratado" value={mgmt.plano_contratado} />
              <InfoRow label="Marca" value={mgmt.marca} />
              <InfoRow label="Produto" value={mgmt.produto} />
              <InfoRow label="Valor Mensalidade" value={mgmt.valor_mensalidade ? `R$ ${parseFloat(mgmt.valor_mensalidade).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null} />
              <InfoRow label="Qtde Funcionários" value={mgmt.qtde_funcionarios} />
              <InfoRow label="Ciclos Faturados" value={mgmt.ciclos_faturados} />
              <InfoRow label="Inadimplente" value={mgmt.inadimplente === "sim" ? "Sim" : mgmt.inadimplente === "nao" ? "Não" : null} />
              <InfoRow label="Possui Multa" value={mgmt.possui_multa === "sim" ? "Sim" : mgmt.possui_multa === "nao" ? "Não" : null} />
              <InfoRow label="Cobra Multa" value={mgmt.cobra_multa === "sim" ? "Sim" : mgmt.cobra_multa === "nao" ? "Não" : null} />
              <InfoRow label="Valor da Multa" value={mgmt.valor_multa ? `R$ ${parseFloat(mgmt.valor_multa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null} />
              <InfoRow label="Data Efetivação" value={mgmt.data_efetivacao} />
              <InfoRow label="Data Ex-Assinante" value={mgmt.data_ex_assinante} />
            </div>
          )}
        </div>
      </div>

      {editMode && (
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 flex-1"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </Button>
          <Button
            variant="ghost"
            onClick={() => setEditMode(false)}
            className="text-slate-500"
          >
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}

export default function RequestManagementPanel({ request, onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState("dados");
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  if (!request) return null;

  const type = typeConfig[request.request_type] || typeConfig.duvidas;

  const tabs = [
    { key: "dados", label: "Dados", icon: FileText },
    { key: "acoes", label: "Ações", icon: ListChecks },
    { key: "vindi", label: "Vindi", icon: Zap },
    { key: "conclusao", label: "Conclusão", icon: ClipboardCheck },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">Gestão da Solicitação</h2>
              <Badge className={`${type.color} text-[10px] mt-0.5`}>{type.label}</Badge>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50/30"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === "dados" && <DataTab request={request} onSaved={onSaved} />}
          {activeTab === "acoes" && <ActionsTab requestId={request.id} request={request} />}
          {activeTab === "vindi" && <div className="flex-1 overflow-y-auto"><VindiActionsPanel request={request} onSaved={onSaved} currentUser={currentUser} /></div>}
          {activeTab === "conclusao" && <ConclusaoTab request={request} onSaved={onSaved} onClose={onClose} />}
        </div>
      </div>
    </>
  );
}