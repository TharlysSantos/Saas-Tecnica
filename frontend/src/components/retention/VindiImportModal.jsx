import React, { useState } from "react";
import { api } from "@/api/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Search, CheckCircle, AlertTriangle, X, Building2 } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v) {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function VindiImportModal({ onClose, onImported }) {
  const [cnpj, setCnpj] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSearch = async () => {
    if (!cnpj.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await api.functions.invoke("vindiIntegration", { action: "buscar_por_cnpj", cnpj });
    setResult(res.data);
    setLoading(false);
  };

  const handleImport = async () => {
    if (!result?.subscription) return;
    setSaving(true);
    const sub = result.subscription;
    const customer = result.customer;

    const payload = {
      cnpj: customer.registry_code || cnpj,
      razao_social: customer.name,
      email: customer.email || "",
      telefone: customer.phones?.[0]?.number || "",
      solicitante: customer.name,
      request_type: "cancelamento",
      status_processo: result.inadimplente ? "aguardando_pagamento" : "triagem",
      inadimplente: result.inadimplente ? "sim" : "nao",
      id_assinatura: String(sub.id),
      plano_contratado: sub.plan?.name || "",
      valor_mensalidade: result.valor_mensalidade || 0,
      ciclos_faturados: sub.billing_cycles || 0,
      ciclos_faltantes: result.ciclos_faltantes || 0,
      valor_multa_calculado: result.valor_multa_calculado || 0,
      data_cancelamento_efetivo: result.data_cancelamento_efetivo || null,
      vindi_data: { subscription: sub, customer },
    };

    await api.entities.RetentionRequest.create(payload);

    if (result.inadimplente) {
      toast.warning("Cliente inadimplente! Alerta registrado na solicitação.");
    } else {
      toast.success("Dados importados da Vindi com sucesso!");
    }

    setSaving(false);
    onImported?.();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="font-semibold text-slate-900">Importar da Vindi</h2>
              <p className="text-xs text-slate-500 mt-0.5">Busque pelo CNPJ/CPF do cliente</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-slate-500 mb-1 block">CNPJ / CPF</Label>
                <Input
                  placeholder="00.000.000/0001-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Buscar
                </Button>
              </div>
            </div>

            {result && !result.found && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {result.message || "Cliente não encontrado na Vindi."}
              </div>
            )}

            {result?.found && result.subscription && (
              <div className="space-y-3">
                {result.inadimplente && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-700 text-sm">Cliente Inadimplente</p>
                      <p className="text-xs text-red-600">{result.bills_em_aberto?.length} fatura(s) em aberto. Cancelamento bloqueado.</p>
                    </div>
                  </div>
                )}
                {!result.inadimplente && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700 font-medium">Cliente adimplente</span>
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-slate-500" />
                    <p className="font-semibold text-slate-800 text-sm">{result.customer?.name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-400">CNPJ:</span> <span className="text-slate-700">{result.customer?.registry_code}</span></div>
                    <div><span className="text-slate-400">Plano:</span> <span className="text-slate-700">{result.subscription?.plan?.name || "—"}</span></div>
                    <div><span className="text-slate-400">Mensalidade:</span> <span className="text-slate-700 font-semibold">{formatCurrency(result.valor_mensalidade)}</span></div>
                    <div><span className="text-slate-400">Ciclos faltantes:</span> <span className="text-slate-700">{result.ciclos_faltantes}</span></div>
                    <div><span className="text-slate-400">Multa calc.:</span> <span className="text-slate-700 font-semibold text-amber-700">{formatCurrency(result.valor_multa_calculado)}</span></div>
                    <div><span className="text-slate-400">Data canc. efetivo:</span> <span className="text-slate-700">{result.data_cancelamento_efetivo || "—"}</span></div>
                  </div>
                </div>

                <Button
                  onClick={handleImport}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Importar Solicitação
                </Button>
              </div>
            )}

            {result?.found && !result.subscription && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                {result.message || "Nenhuma assinatura ativa encontrada para este cliente."}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}