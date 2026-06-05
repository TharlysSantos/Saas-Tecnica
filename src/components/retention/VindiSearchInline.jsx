import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, CheckCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v) {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function VindiSearchInline({ requestId, cnpj, onImported }) {
  const [cnpjInput, setCnpjInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [savingSubId, setSavingSubId] = useState(null);

  // Preenche o campo e limpa resultado anterior quando o CNPJ mudar
  useEffect(() => {
    if (cnpj) {
      setCnpjInput(cnpj);
      setResult(null);
    }
  }, [cnpj]);

  const handleSearch = async () => {
    if (!cnpjInput.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await base44.functions.invoke("vindiIntegration", { action: "buscar_por_cnpj", cnpj: cnpjInput });
    setResult(res.data);
    setLoading(false);
  };



  const applySubscription = async (subId) => {
    setSavingSubId(subId);
    const res = await base44.functions.invoke("vindiIntegration", { action: "buscar_por_id_assinatura", subscription_id: subId });
    const data = res.data;
    if (!data.found) {
      toast.error("Assinatura não encontrada.");
      setSavingSubId(null);
      return;
    }
    const sub = data.subscription;
    const fields = {
      id_assinatura: sub?.id?.toString() || "",
      plano_contratado: sub?.plan?.name || "",
      valor_mensalidade: data.valor_mensalidade || 0,
      inadimplente: data.inadimplente ? "sim" : "nao",
      ciclos_faturados: data.ciclos_faturados || 0,
      ciclos_faltantes: data.ciclos_faltantes || 0,
      valor_multa_calculado: data.valor_multa_calculado || 0,
      data_cancelamento_efetivo: data.data_cancelamento_efetivo || "",
      data_efetivacao: data.data_cancelamento_efetivo || "",
      marca: data.marca || "",
      familia: data.familia || "",
      possui_multa: data.possui_multa || "nao",
      endereco: data.endereco || "",
      bairro: data.bairro || "",
      cidade: data.cidade || "",
      estado: data.estado || "",
      cep: data.cep || "",
      condicao_pagamento: data.condicao_pagamento || "",
    };
    await base44.entities.RetentionRequest.update(requestId, fields);
    toast.success("Assinatura vinculada com sucesso!");
    setSavingSubId(null);
    setResult(null);
    onImported?.(fields);
  };

  const handleImportSingle = async () => {
    if (!result?.subscription) return;
    setSavingSubId(result.subscription.id);
    const sub = result.subscription;
    const fields = {
      id_assinatura: sub?.id?.toString() || "",
      plano_contratado: sub?.plan?.name || "",
      valor_mensalidade: result.valor_mensalidade || 0,
      inadimplente: result.inadimplente ? "sim" : "nao",
      ciclos_faturados: result.ciclos_faturados || 0,
      ciclos_faltantes: result.ciclos_faltantes || 0,
      valor_multa_calculado: result.valor_multa_calculado || 0,
      data_cancelamento_efetivo: result.data_cancelamento_efetivo || "",
      data_efetivacao: result.data_cancelamento_efetivo || "",
      marca: result.marca || "",
      familia: result.familia || "",
      possui_multa: result.possui_multa || "nao",
      endereco: result.endereco || "",
      bairro: result.bairro || "",
      cidade: result.cidade || "",
      estado: result.estado || "",
      cep: result.cep || "",
      condicao_pagamento: result.condicao_pagamento || "",
    };
    await base44.entities.RetentionRequest.update(requestId, fields);
    toast.success("Assinatura vinculada com sucesso!");
    setSavingSubId(null);
    setResult(null);
    onImported?.(fields);
  };

  const saving = savingSubId !== null;

  const ACTIVE_STATUSES = ["active", "future", "created", "pending", "past_due", "suspended"];
  const rawSubscriptions = result?.multiple
    ? result.subscriptions
    : (result?.found && result?.subscription
      ? [{ id: result.subscription.id, plan_name: result.subscription.plan?.name, status: result.subscription.status, start_at: result.subscription.start_at }]
      : null);
  const subscriptions = rawSubscriptions?.filter(s => ACTIVE_STATUSES.includes(s.status));

  return (
    <div className="mt-3 space-y-3 border border-dashed border-blue-200 rounded-xl p-3 bg-blue-50/40">
      <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Buscar Assinatura na Vindi</p>

      <div className="flex gap-2">
        <Input
          placeholder="CNPJ / CPF"
          value={cnpjInput}
          onChange={(e) => !cnpj && setCnpjInput(e.target.value)}
          readOnly={!!cnpj}
          className={`h-8 text-sm ${cnpj ? "bg-slate-100 text-slate-500 cursor-default" : ""}`}
        />
        <Button size="sm" onClick={handleSearch} disabled={loading || !cnpjInput} className="bg-blue-600 hover:bg-blue-700 text-white gap-1 flex-shrink-0">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Buscar
        </Button>
      </div>



      {result && !result.found && !result.multiple && !result.multiple_customers && (
        <p className="text-xs text-red-600">{result.message || "Cliente não encontrado na Vindi."}</p>
      )}

      {result?.inadimplente && (
        <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Cliente inadimplente — {result.bills_em_aberto?.length || 0} fatura(s) em aberto.</span>
        </div>
      )}

      {subscriptions && subscriptions.length === 1 && !result?.multiple && (
        <div className="space-y-2">
          <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Plano:</span>
              <span className="font-medium text-slate-800">{result.subscription?.plan?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mensalidade:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(result.valor_mensalidade)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Multa calc.:</span>
              <span className="font-semibold text-amber-700">{formatCurrency(result.valor_multa_calculado)}</span>
            </div>
          </div>
          <Button size="sm" onClick={handleImportSingle} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-1">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            {saving ? "Vinculando..." : "Vincular esta assinatura"}
          </Button>
        </div>
      )}

      {result?.multiple && subscriptions && (
        <div className="space-y-1.5">
          <p className="text-xs text-slate-600 font-medium">{subscriptions.length} assinaturas encontradas — escolha uma:</p>
          {subscriptions.map(sub => (
            <button
              key={sub.id}
              onClick={() => applySubscription(sub.id)}
              disabled={saving}
              className="w-full text-left bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-lg px-3 py-2.5 transition-colors flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{sub.plan_name || "Sem plano"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-slate-400">ID: {sub.id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    sub.status === "active" ? "bg-green-100 text-green-700" :
                    sub.status === "past_due" ? "bg-red-100 text-red-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>{sub.status}</span>
                  {sub.start_at && <span className="text-[10px] text-slate-400">Início: {new Date(sub.start_at).toLocaleDateString("pt-BR")}</span>}
                </div>
              </div>
              {savingSubId === sub.id
                ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              }
            </button>
          ))}
        </div>
      )}
    </div>
  );
}