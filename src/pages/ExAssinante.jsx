import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Download, CheckCircle2, CalendarDays, Users, AlertTriangle, Lock, Unlock, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

function toTxtDate(dateStr) {
  if (!dateStr) return "00000000";
  const d = new Date(dateStr + "T12:00:00");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return dd + mm + yyyy;
}

function getTodayTxtDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return dd + mm + yyyy;
}

function cleanDoc(doc) {
  return (doc || "").replace(/\D/g, "");
}

function generateTxt(clients, referenceDate) {
  const dataAtual = toTxtDate(referenceDate);
  const finalLines = clients.map((c) => {
    const doc = cleanDoc(c.cnpj).padEnd(14, "0").slice(0, 14);
    return `${doc}0${"08049999"}${dataAtual}`;
  });
  return finalLines.join("\n");
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = parseISO(dateStr);
    if (!isValid(d)) return dateStr;
    return format(d, "dd/MM/yyyy", { locale: ptBR });
  } catch { return dateStr; }
}

export default function ExAssinante() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("adimplentes");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [ativandoId, setAtivandoId] = useState(null);
  const [dataAtivacao, setDataAtivacao] = useState({});
  const [selectedAtivos, setSelectedAtivos] = useState(new Set());
  const [selectedInadimplentes, setSelectedInadimplentes] = useState(new Set());
  const [filterInadimplentes, setFilterInadimplentes] = useState("todos");

  const todayBR = useMemo(() => {
    return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
      .split("/").reverse().join("-");
  }, []);

  const { data: requests = [] } = useQuery({
    queryKey: ["ex-assinante-requests"],
    queryFn: () => base44.entities.RetentionRequest.filter({ request_type: "cancelamento" }),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["migration-logs"],
    queryFn: () => base44.entities.MigrationLog.list("-data_referencia"),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => base44.auth.me(),
  });

  const createLogMutation = useMutation({
    mutationFn: (data) => base44.entities.MigrationLog.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["migration-logs"] }),
  });

  const updateLogMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MigrationLog.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["migration-logs"] }),
  });

  const updateRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RetentionRequest.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ex-assinante-requests"] }),
  });

  // Separa adimplentes, inadimplentes e reprocessar com data_efetivacao
  // Usa data_cancelamento_efetivo se preenchido, senão usa data_efetivacao
  const adimplentes = useMemo(() =>
    requests.filter(r => {
      const dataParaUsar = r.data_cancelamento_efetivo || r.data_efetivacao;
      return dataParaUsar && r.inadimplente !== "sim" && r.status_store !== "ex_assinante" && r.status_store !== "reprocessar";
    }),
  [requests]);

  const inadimplentes = useMemo(() =>
    requests.filter(r => r.data_efetivacao && r.inadimplente === "sim" && r.status_store !== "ex_assinante"),
  [requests]);

  const reprocessar = useMemo(() =>
    requests.filter(r => r.data_efetivacao && r.status_store === "reprocessar"),
  [requests]);

  // Agrupa adimplentes por data (data_cancelamento_efetivo ou data_efetivacao)
  const groupedAdimplentes = useMemo(() => {
    const map = {};
    adimplentes.forEach((r) => {
      const dataParaUsar = r.data_cancelamento_efetivo || r.data_efetivacao;
      if (!map[dataParaUsar]) map[dataParaUsar] = [];
      map[dataParaUsar].push(r);
    });
    return Object.keys(map).sort().map((d) => {
      const log = logs.find((l) => l.data_referencia === d);
      return { date: d, clients: map[d], log, status: log?.status || "pendente" };
    });
  }, [adimplentes, logs]);

  const applyDateFilter = (items) => items.filter(item => {
    if (filterDateFrom && item.date < filterDateFrom) return false;
    if (filterDateTo && item.date > filterDateTo) return false;
    return true;
  });

  const filtered = useMemo(() => {
    const filteredGroups = groupedAdimplentes.map((item) => {
      // Filtra clientes do grupo por data_cancelamento_efetivo se tiver filtro de data
      let filteredClients = item.clients;
      if (filterDateFrom || filterDateTo) {
        filteredClients = item.clients.filter((c) => {
          const dataParaUsar = c.data_cancelamento_efetivo || c.data_efetivacao;
          if (filterDateFrom && dataParaUsar < filterDateFrom) return false;
          if (filterDateTo && dataParaUsar > filterDateTo) return false;
          return true;
        });
      }
      
      return {
        ...item,
        clients: filteredClients,
      };
    }).filter((item) => {
      // Remove grupos vazios após filtro de data
      if (item.clients.length === 0) return false;
      // Aplica filtro de status
      if (filterStatus !== "todos" && item.status !== filterStatus) return false;
      return true;
    });
    
    return filteredGroups;
  }, [groupedAdimplentes, filterDateFrom, filterDateTo, filterStatus]);

  // Inadimplentes aguardando ativação (bloqueados)
  const inadimplentesBloqueados = useMemo(() =>
    inadimplentes.filter(r => r.status_store === "bloqueado" || (!r.status_store || r.status_store === "ativo")),
  [inadimplentes]);

  // Inadimplentes que já foram ativados
  const inadimplentesAtivados = useMemo(() =>
    inadimplentes.filter(r => r.status_store === "ex_assinante"),
  [inadimplentes]);

  const pendingCount = groupedAdimplentes.filter(i => i.status === "pendente").length;

  const handleDownload = async (item) => {
    const txt = generateTxt(item.clients, item.date);
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ex-assinante-${item.date}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    if (!item.log) {
      await createLogMutation.mutateAsync({
        data_referencia: item.date,
        status: "pendente",
        qtde_clientes: item.clients.length,
        responsavel: currentUser?.full_name || "",
      });
    }
    toast.success(`TXT gerado com ${item.clients.length} cliente(s)`);
  };

  const handleToggleDone = async (item) => {
    const newStatus = item.status === "concluido" ? "pendente" : "concluido";
    // Marcar clientes como ex_assinante quando concluído
    if (newStatus === "concluido") {
      for (const c of item.clients) {
        await updateRequestMutation.mutateAsync({ id: c.id, data: { status_store: "ex_assinante", status_processo: "processo_finalizado" } });
      }
    }
    if (item.log) {
      await updateLogMutation.mutateAsync({ id: item.log.id, data: { status: newStatus, responsavel: currentUser?.full_name || "" } });
    } else {
      await createLogMutation.mutateAsync({ data_referencia: item.date, status: newStatus, qtde_clientes: item.clients.length, responsavel: currentUser?.full_name || "" });
    }
    toast.success(newStatus === "concluido" ? "Migrado como Ex-Assinante!" : "Reaberto como pendente.");
  };

  const handleBloquear = async (client) => {
    await updateRequestMutation.mutateAsync({ id: client.id, data: { status_store: "bloqueado" } });
    toast.success(`${client.razao_social} marcado como Bloqueado.`);
  };

  const handleAtivarInadimplente = async (client) => {
    const dateAtiv = dataAtivacao[client.id] || todayBR;
    setAtivandoId(client.id);
    await updateRequestMutation.mutateAsync({
      id: client.id,
      data: {
        status_store: "ex_assinante",
        status_processo: "processo_finalizado",
        data_ex_assinante: dateAtiv,
        inadimplente: "nao",
      },
    });
    setAtivandoId(null);
    toast.success(`${client.razao_social} ativado como Ex-Assinante!`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Migração Ex-Assinante</h1>
          <p className="text-slate-500 text-sm mt-1">Gerencie a migração de clientes cancelados.</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-2 rounded-xl">
            <AlertTriangle className="w-4 h-4" />
            <span><strong>{pendingCount}</strong> data{pendingCount > 1 ? "s" : ""} pendente{pendingCount > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("adimplentes")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "adimplentes" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          ✅ Migração Normal
          {groupedAdimplentes.filter(i => i.status === "pendente").length > 0 && (
            <span className="ml-2 bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
              {groupedAdimplentes.filter(i => i.status === "pendente").length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("inadimplentes")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "inadimplentes" ? "border-red-500 text-red-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          🔒 Inadimplentes Bloqueados
          {inadimplentesBloqueados.length > 0 && (
            <span className="ml-2 bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
              {inadimplentesBloqueados.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("reprocessar")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "reprocessar" ? "border-green-600 text-green-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          🔄 Aguardando Migração
          {reprocessar.length > 0 && (
            <span className="ml-2 bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
              {reprocessar.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab: Adimplentes - Migração Normal */}
      {activeTab === "adimplentes" && (
        <>
          {selectedAtivos.size > 0 && (
            <div className="sticky top-4 z-30 bg-blue-900 text-white rounded-xl px-5 py-3 flex items-center justify-between shadow-lg">
              <span className="text-sm font-medium">{selectedAtivos.size} cliente(s) selecionado(s) para ativação</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    const clientes = filtered.flatMap(g => g.clients).filter(c => selectedAtivos.has(c.id));
                    const linhas = clientes.map(c => {
                      const doc = (c.cnpj || "").replace(/\D/g, "").padEnd(14, "0").slice(0, 14);
                      const hoje = getTodayTxtDate();
                      return `${doc}0${"08049999"}${hoje}`;
                    });
                    const txt = linhas.join("\n");
                    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `ativar-adimplentes-${getTodayTxtDate()}.txt`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success(`TXT gerado com ${clientes.length} cliente(s)`);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Gerar TXT Ativação
                </Button>
                <button onClick={() => setSelectedAtivos(new Set())} className="text-blue-200 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <div className="flex flex-wrap gap-4 items-end mb-4">
              <p className="text-xs text-blue-700 font-semibold uppercase tracking-wider">🔍 Filtrar por data de cancelamento</p>
            </div>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <p className="text-xs text-slate-600 font-medium">De</p>
                <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-9 text-sm w-40" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-600 font-medium">Até</p>
                <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-9 text-sm w-40" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-600 font-medium">Status</p>
                <div className="flex gap-1">
                  {[{ key: "todos", label: "Todos" }, { key: "pendente", label: "Pendente" }, { key: "concluido", label: "Concluído" }].map((opt) => (
                    <button key={opt.key} onClick={() => setFilterStatus(opt.key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${filterStatus === opt.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {(filterDateFrom || filterDateTo || filterStatus !== "todos") && <Button variant="ghost" size="sm" onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterStatus("todos"); }} className="text-slate-500 text-xs hover:text-blue-600">Limpar tudo</Button>}
            </div>

            <div className="border-t border-blue-200 pt-3 flex items-center gap-2 mt-3">
              <span className="text-xs text-blue-700 font-semibold uppercase">Selecionar:</span>
              <Button size="sm" variant="outline" onClick={() => {
                if (selectedAtivos.size === filtered.flatMap(g => g.clients).length) {
                  setSelectedAtivos(new Set());
                } else {
                  setSelectedAtivos(new Set(filtered.flatMap(g => g.clients).map(c => c.id)));
                }
              }} className="text-xs h-7 border-blue-300">
                {selectedAtivos.size === filtered.flatMap(g => g.clients).length ? "Desmarcar Todos" : "Todos"}
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <CalendarDays className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum cliente adimplente para migrar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                const isToday = item.date === todayBR;
                const isDone = item.status === "concluido";
                return (
                  <div key={item.date} className={`bg-white border rounded-xl overflow-hidden transition-all ${isDone ? "border-green-200 opacity-80" : isToday ? "border-blue-300 shadow-md shadow-blue-50" : "border-slate-200"}`}>
                    <div className={`flex items-center justify-between px-5 py-3.5 ${isDone ? "bg-green-50" : isToday ? "bg-blue-50" : "bg-slate-50"}`}>
                      <div className="flex items-center gap-3">
                        <CalendarDays className={`w-5 h-5 ${isDone ? "text-green-500" : isToday ? "text-blue-600" : "text-slate-400"}`} />
                        <div>
                          <span className="font-semibold text-slate-800">{formatDisplayDate(item.date)}</span>
                          {isToday && <Badge className="ml-2 bg-blue-100 text-blue-700 text-[10px]">Hoje</Badge>}
                        </div>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Users className="w-3.5 h-3.5" /> {item.clients.length} cliente{item.clients.length > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={isDone ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}>
                          {isDone ? "✓ Migrado" : "Pendente"}
                        </Badge>
                        <Button size="sm" variant="outline" onClick={() => handleDownload(item)} className="gap-1.5 text-sm">
                          <Download className="w-4 h-4" /> Baixar TXT
                        </Button>
                        <Button size="sm" onClick={() => handleToggleDone(item)}
                          className={isDone ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-green-600 hover:bg-green-700 text-white"}>
                          {isDone ? "Reabrir" : "Marcar Migrado"}
                        </Button>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {item.clients.map((c) => {
                        const isSelected = selectedAtivos.has(c.id);
                        const isInadimplente = c.inadimplente === "sim";
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedAtivos(prev => {
                                const next = new Set(prev);
                                next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                                return next;
                              });
                            }}
                            className={`flex items-center gap-4 px-5 py-2.5 text-sm cursor-pointer transition-colors ${
                              isSelected ? "bg-blue-50 border-l-4 border-blue-500" : 
                              isInadimplente ? "bg-red-50/40 hover:bg-red-50/60" : 
                              "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-800">{c.razao_social}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${
                                  isInadimplente ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                }`}>
                                  {isInadimplente ? "Inadimplente" : "Adimplente"}
                                </span>
                              </div>
                            </div>
                            <span className="text-slate-400 text-xs font-mono">{c.cnpj}</span>
                            {c.plano_contratado && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{c.plano_contratado}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: Reprocessar */}
      {activeTab === "reprocessar" && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 flex gap-2">
            <span className="text-lg">🔄</span>
            <div>
              <p className="font-semibold">Clientes que quitaram a inadimplência.</p>
              <p className="text-xs mt-0.5 text-green-600">Estes clientes foram automaticamente liberados pela revalidação diária. Baixe o TXT e marque como migrado.</p>
            </div>
          </div>
          {reprocessar.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <p className="text-slate-500">Nenhum cliente aguardando migração.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reprocessar.map((c) => {
                const txt = () => {
                  const blob = new Blob([`${(c.cnpj || "").replace(/\D/g, "").padEnd(14, "0").slice(0, 14)}0${"08049999"}${toTxtDate(c.data_efetivacao)}`], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `reprocessar-${c.cnpj}.txt`; a.click(); URL.revokeObjectURL(url);
                };
                return (
                  <div key={c.id} className="bg-white border border-green-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 bg-green-50">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{c.razao_social}</p>
                        <p className="text-xs text-slate-400 font-mono">{c.cnpj}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={txt} className="gap-1.5 text-xs border-green-300">
                          <Download className="w-3.5 h-3.5" /> Baixar TXT
                        </Button>
                        <Button size="sm" onClick={async () => {
                          await updateRequestMutation.mutateAsync({ id: c.id, data: { status_store: "ex_assinante", status_processo: "processo_finalizado" } });
                          toast.success(`${c.razao_social} migrado como Ex-Assinante!`);
                        }} className="bg-green-600 hover:bg-green-700 text-white text-xs">
                          Marcar Migrado
                        </Button>
                      </div>
                    </div>
                    <div className="px-5 py-2.5 grid grid-cols-3 gap-3 text-xs text-slate-600">
                      <div><p className="text-[10px] uppercase text-slate-400 font-semibold">Plano</p><p>{c.plano_contratado || "—"}</p></div>
                      <div><p className="text-[10px] uppercase text-slate-400 font-semibold">Data Cancelamento</p><p>{formatDisplayDate(c.data_efetivacao)}</p></div>
                      <div><p className="text-[10px] uppercase text-slate-400 font-semibold">Mensalidade</p><p>{c.valor_mensalidade ? `R$ ${Number(c.valor_mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "—"}</p></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab: Inadimplentes Bloqueados */}
      {activeTab === "inadimplentes" && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <p className="text-xs text-slate-500 font-medium">De</p>
              <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-9 text-sm w-40" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-500 font-medium">Até</p>
              <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-9 text-sm w-40" />
            </div>
            {(filterDateFrom || filterDateTo) && <Button variant="ghost" size="sm" onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }} className="text-slate-400 text-xs self-end">Limpar filtro</Button>}
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex gap-2">
            <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Clientes inadimplentes não constam no arquivo TXT de migração.</p>
              <p className="text-xs mt-0.5 text-red-600">Quando o cliente quitar a pendência, clique em "Ativar como Ex-Assinante" para liberar e mover para oficializado.</p>
            </div>
          </div>

          {inadimplentesBloqueados.filter(c => {
            if (filterDateFrom && c.data_efetivacao < filterDateFrom) return false;
            if (filterDateTo && c.data_efetivacao > filterDateTo) return false;
            return true;
          }).length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Lock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Nenhum cliente inadimplente bloqueado no momento.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inadimplentesBloqueados.filter(c => {
                if (filterDateFrom && c.data_efetivacao < filterDateFrom) return false;
                if (filterDateTo && c.data_efetivacao > filterDateTo) return false;
                return true;
              }).map((c) => (
                <div key={c.id} className="bg-white border border-red-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-red-50">
                    <div className="flex items-center gap-3">
                      <Lock className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{c.razao_social}</p>
                        <p className="text-xs text-slate-400 font-mono">{c.cnpj}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-100 text-red-700 text-[10px]">🔒 Bloqueado</Badge>
                      {c.status_store !== "bloqueado" && (
                        <Button size="sm" variant="outline" onClick={() => handleBloquear(c)}
                          className="text-xs border-red-300 text-red-700 hover:bg-red-50 gap-1">
                          <Lock className="w-3 h-3" /> Marcar Bloqueado
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="px-5 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600 border-t border-red-100">
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-semibold">Plano</p>
                      <p>{c.plano_contratado || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-semibold">Data Cancelamento</p>
                      <p>{formatDisplayDate(c.data_efetivacao)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-semibold">Multa</p>
                      <p>{c.multa_bill_id ? `Bill #${c.multa_bill_id}` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-semibold">Valor Mensalidade</p>
                      <p>{c.valor_mensalidade ? `R$ ${Number(c.valor_mensalidade).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : "—"}</p>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-red-100 bg-slate-50 flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-slate-500 font-medium">Data de ativação (quando pagar)</p>
                      <Input
                        type="date"
                        value={dataAtivacao[c.id] || todayBR}
                        onChange={e => setDataAtivacao(prev => ({ ...prev, [c.id]: e.target.value }))}
                        className="h-8 text-sm w-44"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAtivarInadimplente(c)}
                      disabled={ativandoId === c.id}
                      className="bg-green-600 hover:bg-green-700 text-white gap-1.5 mt-5"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {ativandoId === c.id ? "Ativando..." : "Ativar como Ex-Assinante"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {inadimplentesAtivados.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Já Ativados</p>
              <div className="space-y-2">
                {inadimplentesAtivados.map((c) => (
                  <div key={c.id} className="bg-white border border-green-200 rounded-xl px-5 py-3 flex items-center justify-between text-sm opacity-70">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-4 h-4 text-green-500" />
                      <span className="font-medium text-slate-700">{c.razao_social}</span>
                      <span className="text-slate-400 text-xs font-mono">{c.cnpj}</span>
                    </div>
                    <Badge className="bg-green-100 text-green-700 text-[10px]">✓ Ex-Assinante</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}