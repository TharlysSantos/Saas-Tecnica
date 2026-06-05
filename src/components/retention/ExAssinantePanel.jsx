import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Download, RefreshCw, CheckCircle2, ArrowRight, ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";

const cleanDoc = (doc) => (doc || "").replace(/\D/g, "");

const getTodayTxtDate = () => {
  const d = new Date();
  return String(d.getDate()).padStart(2, "0") + String(d.getMonth() + 1).padStart(2, "0") + String(d.getFullYear());
};

// Classifica família: "kairos" ou "mdcomum" baseado no valor real vindo da PlanConfig
function classificarFamilia(familia) {
  if (!familia) return "outro";
  const f = familia.toLowerCase();
  if (f.includes("kairos")) return "kairos";
  if (f.includes("md comum") || f.includes("md comun")) return "mdcomum";
  return "outro";
}

function gerarArquivoTxt(clientes, codigo, nomeArquivo, todayTxt) {
  if (clientes.length === 0) return 0;
  const lines = clientes.map(req => {
    const doc = cleanDoc(req.cnpj).padEnd(14, "0").slice(0, 14);
    return `${doc}1${codigo}${todayTxt}`;
  });
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomeArquivo}-${todayTxt}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  return clientes.length;
}

export default function ExAssinantePanel({
  requests,
  storeFilters = [],
  filterAdimplencia = "todos",
  filterFaturas = "todos",
  filterCnpj = "",
  filterFamilia = "todos",
  filterDateFrom = "",
  filterDateTo = "",
  planConfigs = [],
}) {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [processing, setProcessing] = useState(false);

  // Extrai famílias únicas das PlanConfigs para o filtro dinâmico (usado pelo WorkflowBoard, não aqui)
  // Aqui usamos para classificar os clientes
  const filteredRequests = requests.filter(r => {
    if (storeFilters.length > 0 && !storeFilters.includes(r.status_store)) return false;
    if (filterAdimplencia === "adimplente" && r.inadimplente === "sim") return false;
    if (filterAdimplencia === "inadimplente" && r.inadimplente !== "sim") return false;
    const openBills = r.vindi_data?.open_bills || 0;
    if (filterFaturas === "com_faturas" && openBills === 0) return false;
    if (filterFaturas === "sem_faturas" && openBills > 0) return false;
    if (filterCnpj && !r.cnpj?.replace(/\D/g, "").includes(filterCnpj.replace(/\D/g, ""))) return false;
    if (filterFamilia !== "todos") {
      if (filterFamilia === "kairos" || filterFamilia === "mdcomum") {
        const tipo = classificarFamilia(r.familia);
        if (filterFamilia !== tipo) return false;
      } else {
        // Família exata (outros casos)
        if (r.familia !== filterFamilia) return false;
      }
    }
    if (filterDateFrom || filterDateTo) {
      const dataParaUsar = r.data_cancelamento_efetivo || r.data_ex_assinante;
      if (filterDateFrom && (!dataParaUsar || dataParaUsar < filterDateFrom)) return false;
      if (filterDateTo && (!dataParaUsar || dataParaUsar > filterDateTo)) return false;
    }
    return true;
  });

  // Desbloqueio: código 17049999 — um arquivo por grupo
  const handleGerarTxtDesbloqueio = () => {
    const lista = selectedIds.size > 0
      ? filteredRequests.filter(r => selectedIds.has(r.id))
      : filteredRequests.filter(r => r.inadimplente !== "sim");

    if (lista.length === 0) {
      toast.error("Nenhum cliente adimplente para desbloquear");
      return;
    }

    const todayTxt = getTodayTxtDate();
    const kairos = lista.filter(r => classificarFamilia(r.familia) === "kairos");
    const mdComum = lista.filter(r => classificarFamilia(r.familia) === "mdcomum");
    const outros = lista.filter(r => classificarFamilia(r.familia) === "outro");

    let total = 0;
    total += gerarArquivoTxt(kairos, "17049999", "Kairos", todayTxt);
    total += gerarArquivoTxt(mdComum, "17049999", "MD Comune", todayTxt);
    total += gerarArquivoTxt(outros, "17049999", "outros-desbloqueio", todayTxt);

    if (total === 0) {
      toast.error("Nenhum arquivo gerado");
    } else {
      toast.success(`TXT de desbloqueio gerado com ${total} cliente(s)`);
    }
  };

  // Bloqueio: código 17049999 com prefixo diferente no nome — um arquivo por grupo
  const handleGerarTxtBloqueio = () => {
    const lista = selectedIds.size > 0
      ? filteredRequests.filter(r => selectedIds.has(r.id))
      : filteredRequests.filter(r => r.inadimplente === "sim");

    if (lista.length === 0) {
      toast.error("Nenhum cliente inadimplente para bloquear");
      return;
    }

    const todayTxt = getTodayTxtDate();
    const kairos = lista.filter(r => classificarFamilia(r.familia) === "kairos");
    const mdComum = lista.filter(r => classificarFamilia(r.familia) === "mdcomum");
    const outros = lista.filter(r => classificarFamilia(r.familia) === "outro");

    let total = 0;
    total += gerarArquivoTxt(kairos, "17049999", "bloqueio-Kairos", todayTxt);
    total += gerarArquivoTxt(mdComum, "17049999", "bloqueio-MD Comune", todayTxt);
    total += gerarArquivoTxt(outros, "17049999", "bloqueio-outros", todayTxt);

    if (total === 0) {
      toast.error("Nenhum arquivo gerado");
    } else {
      toast.success(`TXT de bloqueio gerado com ${total} cliente(s)`);
    }
  };

  const handleAvancarReprocessar = async (reqId) => {
    await base44.entities.RetentionRequest.update(reqId, {
      status_store: "ex_assinante",
      status_processo: "processo_finalizado",
    });
    queryClient.invalidateQueries({ queryKey: ["workflow-requests"] });
    toast.success("Cliente reprocessado para Ex-Assinante");
  };

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
          <span>{selectedIds.size} cliente(s) selecionado(s) — os TXTs serão gerados apenas com os selecionados</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-slate-600 ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        <Button onClick={handleGerarTxtDesbloqueio} size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" /> Desbloqueio
        </Button>
        <Button onClick={handleGerarTxtBloqueio} size="sm" className="bg-red-600 hover:bg-red-700 text-white gap-1.5 text-xs">
          <Download className="w-3.5 h-3.5" /> Bloqueio
        </Button>
        <Button
          onClick={async () => {
            setProcessing(true);
            try {
              for (const req of filteredRequests) {
                if (!req.id_assinatura) continue;
                const res = await base44.functions.invoke("vindiIntegration", {
                  action: "buscar_por_id_assinatura",
                  subscription_id: String(req.id_assinatura),
                });
                const d = res.data;
                if (d?.found) {
                  await base44.entities.RetentionRequest.update(req.id, {
                    vindi_data: { ...d, customer_id: d.customer_id || req.vindi_customer_id },
                  });
                }
              }
              queryClient.invalidateQueries({ queryKey: ["workflow-requests"] });
              toast.success("Dados financeiros sincronizados!");
            } catch (e) {
              toast.error("Erro ao sincronizar: " + e.message);
            } finally {
              setProcessing(false);
            }
          }}
          disabled={processing}
          size="sm"
          className="bg-slate-600 hover:bg-slate-700 text-white gap-1.5 text-xs"
        >
          {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Sincronizar Vindi
        </Button>
        <Button
          onClick={async () => {
            setProcessing(true);
            try {
              for (const req of filteredRequests) {
                const isAdimplente = req.inadimplente !== "sim";
                const hasOverdue = req.vindi_data?.open_bills > 0 || req.vindi_data?.has_overdue;
                let newStatus = req.status_store;
                if (isAdimplente && hasOverdue) newStatus = "bloqueado";
                else if (req.status_store === "bloqueado" && isAdimplente && !hasOverdue) newStatus = "reprocessar";
                else if (isAdimplente && !hasOverdue) newStatus = "ex_assinante";
                if (newStatus !== req.status_store) {
                  await base44.entities.RetentionRequest.update(req.id, { status_store: newStatus });
                }
              }
              queryClient.invalidateQueries({ queryKey: ["workflow-requests"] });
              toast.success("Status atualizado!");
            } catch (e) {
              toast.error("Erro ao atualizar: " + e.message);
            } finally {
              setProcessing(false);
            }
          }}
          disabled={processing}
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5 text-xs"
        >
          {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Atualizar Status
        </Button>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <p className="text-sm">Nenhum cliente encontrado com os filtros aplicados</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedIds.size === filteredRequests.length && filteredRequests.length > 0}
                onChange={e => {
                  if (e.target.checked) setSelectedIds(new Set(filteredRequests.map(r => r.id)));
                  else setSelectedIds(new Set());
                }}
                className="w-4 h-4 rounded border-slate-300"
              />
              <span className="text-xs text-slate-500 font-medium">Selecionar todos ({filteredRequests.length})</span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {filteredRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(req.id)}
                      onChange={e => {
                        const next = new Set(selectedIds);
                        e.target.checked ? next.add(req.id) : next.delete(req.id);
                        setSelectedIds(next);
                      }}
                      className="w-4 h-4 rounded border-slate-300 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{req.razao_social}</p>
                        <span className={`px-2 py-0.5 text-[10px] rounded font-semibold flex-shrink-0 ${
                          req.status_store === "bloqueado" ? "bg-red-100 text-red-700" :
                          req.status_store === "reprocessar" ? "bg-amber-100 text-amber-700" :
                          req.status_store === "ex_assinante" ? "bg-green-100 text-green-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {req.status_store === "bloqueado" ? "🔒 Bloqueado" :
                           req.status_store === "reprocessar" ? "🔄 Reprocessar" :
                           req.status_store === "ex_assinante" ? "✅ Ex-Assinante" : "Ativo"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-slate-400 font-mono">{req.cnpj}</span>
                        <span className={`px-2 py-0.5 text-[10px] rounded font-semibold ${req.inadimplente === "sim" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {req.inadimplente === "sim" ? "Inadimplente" : "Adimplente"}
                        </span>
                        {req.familia && (
                          <span className={`px-2 py-0.5 text-[10px] rounded font-semibold ${
                            classificarFamilia(req.familia) === "kairos" ? "bg-blue-100 text-blue-700" :
                            classificarFamilia(req.familia) === "mdcomum" ? "bg-purple-100 text-purple-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {req.familia}
                          </span>
                        )}
                        {req.vindi_data?.open_bills > 0 && (
                          <span className="px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded font-semibold">
                            {req.vindi_data.open_bills} fatura(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {req.status_store === "reprocessar" && (
                    <Button size="sm" onClick={() => handleAvancarReprocessar(req.id)} variant="outline" className="text-xs gap-1.5 border-green-300 text-green-700 hover:bg-green-50 ml-2 flex-shrink-0">
                      <ArrowRight className="w-3 h-3" /> Passar para Ex-Assinante
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={async () => {
                  setProcessing(true);
                  const selecionados = filteredRequests.filter(r => selectedIds.has(r.id));
                  for (const req of selecionados) {
                    await base44.entities.RetentionRequest.update(req.id, { status_processo: "retido" });
                  }
                  queryClient.invalidateQueries({ queryKey: ["workflow-requests"] });
                  toast.success(`${selecionados.length} cliente(s) enviado(s) para Oficialização!`);
                  setSelectedIds(new Set());
                  setProcessing(false);
                }}
                disabled={processing}
                className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 text-xs"
              >
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
                Forçar Oficialização
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  setProcessing(true);
                  const selecionados = filteredRequests.filter(r => selectedIds.has(r.id));
                  for (const req of selecionados) {
                    await base44.entities.RetentionRequest.update(req.id, { status_processo: "em_execucao" });
                  }
                  queryClient.invalidateQueries({ queryKey: ["workflow-requests"] });
                  toast.success(`${selecionados.length} cliente(s) retornado(s) para Execução!`);
                  setSelectedIds(new Set());
                  setProcessing(false);
                }}
                disabled={processing}
                variant="outline"
                className="gap-1.5 text-xs border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                Retornar para Execução
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}