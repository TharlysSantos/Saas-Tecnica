import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle, CheckCircle, FileText, XCircle, ExternalLink, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v) {
  if (!v) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function VindiActionsPanel({ request, onSaved, onDataImported, currentUser }) {
  const [loadingTermo, setLoadingTermo] = useState(false);
  const [loadingCancelar, setLoadingCancelar] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [showForce, setShowForce] = useState(false);
  const [cnpjInput, setCnpjInput] = useState(request.cnpj || "");
  const [searching, setSearching] = useState(false);
  const [vindiStatus, setVindiStatus] = useState(null);
  const [multipleSubscriptions, setMultipleSubscriptions] = useState(null);
  const [multipleCustomer, setMultipleCustomer] = useState(null);
  const [localRequest, setLocalRequest] = useState(null); // snapshot local após importação

  const handleVindiSearch = async () => {
    if (!cnpjInput) return;
    setSearching(true);
    setVindiStatus(null);
    setMultipleSubscriptions(null);
    const res = await base44.functions.invoke('vindiIntegration', { action: 'buscar_por_cnpj', cnpj: cnpjInput });
    if (res.data?.multiple_customers) {
      setMultipleSubscriptions({ type: 'customers', items: res.data.customers });
      setSearching(false);
      return;
    }
    if (res.data?.multiple) {
      setMultipleSubscriptions({ type: 'subscriptions', items: res.data.subscriptions });
      setMultipleCustomer(res.data.customer);
      setSearching(false);
      return;
    }
    await applyVindiData(res.data);
    setSearching(false);
  };

  const handleSelectCustomer = async (customerId) => {
    setSearching(true);
    setMultipleSubscriptions(null);
    const res = await base44.functions.invoke('vindiIntegration', { action: 'buscar_por_customer_id', customer_id: customerId });
    if (res.data?.multiple) {
      setMultipleSubscriptions({ type: 'subscriptions', items: res.data.subscriptions });
      setMultipleCustomer(res.data.customer);
      setSearching(false);
      return;
    }
    await applyVindiData(res.data);
    setSearching(false);
  };

  const handleSelectSubscription = async (subId) => {
    setSearching(true);
    setMultipleSubscriptions(null);
    const res = await base44.functions.invoke('vindiIntegration', { action: 'buscar_por_id_assinatura', subscription_id: subId });
    await applyVindiData(res.data);
    setSearching(false);
  };

  const applyVindiData = async (data) => {
    if (!data.found) {
      setVindiStatus('not_found');
      return;
    }
    const sub = data.subscription;
    const customer = data.customer;
    const fields = {
      id_assinatura: sub?.id?.toString() || "",
      plano_contratado: sub?.plan?.name || "",
      valor_mensalidade: data.valor_mensalidade || 0,
      inadimplente: data.inadimplente ? "sim" : "nao",
      ciclos_faturados: data.meses_contrato || 0,
      ciclos_faltantes: data.ciclos_faltantes || 0,
      valor_multa_calculado: data.valor_multa_calculado || 0,
      data_cancelamento_efetivo: data.data_cancelamento_efetivo || "",
      marca: sub?.plan?.name || "",
      razao_social: request.razao_social || customer?.name || "",
      email: request.email || customer?.email || "",
      telefone: request.telefone || (customer?.phones?.[0]?.number ? customer.phones[0].number.replace(/^55/, '') : ""),
      bairro: data.bairro || "",
      cidade: data.cidade || "",
      cep: data.cep || "",
    };
    await base44.entities.RetentionRequest.update(request.id, fields);
    toast.success("Dados importados da Vindi com sucesso!");
    setVindiStatus('found');
    // Propaga os campos atualizados para o componente pai
    onDataImported?.(fields);
    // Atualiza snapshot local
    setLocalRequest({ ...request, ...fields });
    onSaved?.();
  };

  // Usa snapshot local se disponível, senão usa prop
  const req = localRequest || request;
  const isInadimplente = req.inadimplente === "sim";
  const isAdmin = currentUser?.role === "admin";
  const canCancelVindi = req.id_assinatura && (!isInadimplente || isAdmin);

  const handleGerarTermo = async () => {
    setLoadingTermo(true);
    const res = await base44.functions.invoke("generateTermoPDF", { request_id: request.id });
    if (res.data?.success) {
      toast.success("Termo gerado e salvo com sucesso!");
      onSaved?.();
    } else {
      toast.error("Erro ao gerar termo.");
    }
    setLoadingTermo(false);
  };

  const handleCancelarVindi = async () => {
    if (isInadimplente && !justificativa.trim()) {
      toast.error("Justificativa obrigatória para forçar cancelamento com inadimplência.");
      return;
    }
    setLoadingCancelar(true);
    const res = await base44.functions.invoke("vindiIntegration", {
      action: "cancelar_assinatura",
      subscription_id: request.id_assinatura,
      justificativa: justificativa || undefined,
    });

    if (res.data?.success) {
      await base44.entities.RetentionRequest.update(request.id, {
        status_processo: "processo_finalizado",
      });
      toast.success("Assinatura cancelada na Vindi!");
      onSaved?.();
    } else {
      toast.error(res.data?.error || "Erro ao cancelar assinatura.");
    }
    setLoadingCancelar(false);
    setShowForce(false);
  };

  // Se ainda não tem assinatura vinculada, mostrar busca
  if (!req.id_assinatura) {
    return (
      <div className="space-y-4 p-5">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">Dados Vindi não vinculados</p>
          <p className="text-xs text-amber-700">Busque pelo CNPJ para importar os dados da assinatura.</p>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-slate-700">CNPJ</Label>
          <div className="flex gap-2">
            <Input
              placeholder="00.000.000/0000-00"
              value={cnpjInput}
              onChange={(e) => setCnpjInput(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={handleVindiSearch} disabled={searching || !cnpjInput} className="flex-shrink-0 gap-1">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Buscar
            </Button>
          </div>
          {vindiStatus === 'found' && (
            <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Dados importados com sucesso!</p>
          )}
          {vindiStatus === 'not_found' && (
            <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> CNPJ não encontrado na Vindi.</p>
          )}
        </div>

        {multipleSubscriptions?.type === 'customers' && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">{multipleSubscriptions.items.length} clientes encontrados com este CPF/CNPJ. Selecione um:</p>
            {multipleSubscriptions.items.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelectCustomer(c.id)}
                className="w-full text-left bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-3 transition-colors"
              >
                <p className="text-sm font-medium text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-500">{c.email} · ID: {c.id}</p>
              </button>
            ))}
          </div>
        )}

        {multipleSubscriptions?.type === 'subscriptions' && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">{multipleSubscriptions.items.length} assinaturas encontradas. Selecione uma:</p>
            {multipleSubscriptions.items.map(sub => (
              <button
                key={sub.id}
                onClick={() => handleSelectSubscription(sub.id)}
                className="w-full text-left bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-3 transition-colors"
              >
                <p className="text-sm font-medium text-slate-800">{sub.plan_name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-slate-500">ID: {sub.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    sub.status === 'active' ? 'bg-green-100 text-green-700' :
                    sub.status === 'past_due' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{sub.status}</span>
                  {sub.start_at && <span className="text-xs text-slate-400">Início: {new Date(sub.start_at).toLocaleDateString('pt-BR')}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5">
      {/* Status Financeiro */}
      <div className={`rounded-xl p-4 flex items-start gap-3 ${isInadimplente ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
        {isInadimplente
          ? <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          : <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        }
        <div>
          <p className={`font-semibold text-sm ${isInadimplente ? "text-red-700" : "text-green-700"}`}>
            {isInadimplente ? "Cliente Inadimplente" : "Cliente Adimplente"}
          </p>
          {isInadimplente && (
            <p className="text-xs text-red-600 mt-0.5">Cancelamento bloqueado. {isAdmin ? "Como admin, você pode forçar com justificativa." : "Apenas administradores podem forçar."}</p>
          )}
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-slate-400 uppercase tracking-wider text-[10px]">ID Assinatura</p>
          <p className="font-medium text-slate-700 mt-0.5">{req.id_assinatura || "—"}</p>
        </div>
        <div>
          <p className="text-slate-400 uppercase tracking-wider text-[10px]">Mensalidade</p>
          <p className="font-medium text-slate-700 mt-0.5">{formatCurrency(req.valor_mensalidade)}</p>
        </div>
        <div>
          <p className="text-slate-400 uppercase tracking-wider text-[10px]">Ciclos Faltantes</p>
          <p className="font-medium text-slate-700 mt-0.5">{req.ciclos_faltantes ?? "—"}</p>
        </div>
        <div>
          <p className="text-slate-400 uppercase tracking-wider text-[10px]">Multa Calculada</p>
          <p className="font-semibold text-amber-700 mt-0.5">{formatCurrency(req.valor_multa_calculado)}</p>
        </div>
        <div>
          <p className="text-slate-400 uppercase tracking-wider text-[10px]">Data Canc. Efetivo</p>
          <p className="font-medium text-slate-700 mt-0.5">{req.data_cancelamento_efetivo || "—"}</p>
        </div>
        <div>
          <p className="text-slate-400 uppercase tracking-wider text-[10px]">Passível de Multa</p>
          <p className="font-medium text-slate-700 mt-0.5">{req.passivel_multa === "sim" ? "Sim" : req.passivel_multa === "nao" ? "Não" : "Em análise"}</p>
        </div>
      </div>

      {/* Termo gerado */}
      {request.link_termo && (
        <a
          href={request.link_termo}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700 hover:bg-green-100 transition-colors"
        >
          <FileText className="w-4 h-4" />
          <span className="flex-1 font-medium">Termo de Cancelamento gerado</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}

      {/* Ação: Gerar Termo */}
      <Button
        onClick={handleGerarTermo}
        disabled={loadingTermo}
        variant="outline"
        className="w-full gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
      >
        {loadingTermo ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
        {request.link_termo ? "Regenerar Termo PDF" : "Gerar Termo PDF"}
      </Button>

      {/* Ação: Cancelar na Vindi */}
      {req.id_assinatura && (
        <>
          {isInadimplente && isAdmin && !showForce && (
            <Button
              variant="outline"
              className="w-full gap-2 border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => setShowForce(true)}
            >
              <XCircle className="w-4 h-4" />
              Forçar Cancelamento (Admin)
            </Button>
          )}

          {isInadimplente && isAdmin && showForce && (
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Justificativa obrigatória</Label>
              <textarea
                className="w-full border border-red-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
                rows={3}
                placeholder="Descreva o motivo para forçar o cancelamento com inadimplência..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCancelarVindi}
                  disabled={loadingCancelar || !justificativa.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                >
                  {loadingCancelar ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Confirmar Cancelamento Forçado
                </Button>
                <Button variant="ghost" onClick={() => setShowForce(false)} className="text-slate-500">Cancelar</Button>
              </div>
            </div>
          )}

          {!isInadimplente && (
            <Button
              onClick={handleCancelarVindi}
              disabled={loadingCancelar}
              className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
            >
              {loadingCancelar ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Cancelar Assinatura na Vindi
            </Button>
          )}
        </>
      )}
    </div>
  );
}