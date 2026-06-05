import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
// base44.entities.RequestAction disponível via SDK
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

import StepIndicator from "./StepIndicator";
import StepType from "./StepType";
import StepData from "./StepData";
import StepDetails from "./StepDetails";
import StepConfirmation from "./StepConfirmation";

const statusLabels = {
  triagem: "Triagem",
  em_tratativa: "Em Tratativa",
  em_retencao_contato: "Em Retenção (Contato)",
  aguardando_cliente: "Aguardando Cliente",
  aguardando_prazo: "Aguardando Prazo",
  aguardando_pagamento: "Aguardando Pagamento",
  em_execucao: "Em Execução",
  processo_finalizado: "Finalizado",
  retido: "Retido",
};

const initialData = {
  request_type: "",
  cnpj: "",
  razao_social: "",
  solicitante: "",
  telefone: "",
  email: "",
  motivo: "",
  solicitacao: "",
  duvida: "",
  status: "pendente",
};

export default function RetentionModal({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  const validateStep = () => {
    const newErrors = {};

    if (step === 0 && !formData.request_type) {
      toast.error("Selecione um tipo de solicitação.");
      return false;
    }

    if (step === 1) {
      if (!formData.cnpj) newErrors.cnpj = "Campo obrigatório";
      if (!formData.razao_social) newErrors.razao_social = "Campo obrigatório";
      if (!formData.solicitante) newErrors.solicitante = "Campo obrigatório";
      if (!formData.telefone) newErrors.telefone = "Campo obrigatório";
      if (!formData.email) newErrors.email = "Campo obrigatório";
    }

    if (step === 2) {
      const detailKey = {
        cancelamento: "motivo",
        downgrade: "solicitacao",
        duvidas: "duvida",
      }[formData.request_type];

      if (!formData[detailKey]) newErrors[detailKey] = "Campo obrigatório";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) setStep(step + 1);
  };

  const handleBack = () => {
    setErrors({});
    setStep(step - 1);
  };

  const checkDuplicates = async () => {
    if (!formData.cnpj) return [];
    const existing = await base44.entities.RetentionRequest.filter({ cnpj: formData.cnpj });
    return existing.filter(r => r.status_processo !== "processo_finalizado");
  };

  const handleSubmitConfirmed = async () => {
    setShowDuplicateWarning(false);
    setSubmitting(true);
    const payload = {
      request_type: formData.request_type,
      cnpj: formData.cnpj,
      razao_social: formData.razao_social,
      solicitante: formData.solicitante,
      telefone: formData.telefone,
      email: formData.email,
      responsavel: formData.responsavel || "",
      status_processo: "triagem",
      // dados Vindi pré-preenchidos (se buscados)
      id_assinatura: formData.id_assinatura || "",
      plano_contratado: formData.plano_contratado || "",
      valor_mensalidade: formData.valor_mensalidade ? parseFloat(formData.valor_mensalidade) : undefined,
      inadimplente: formData.inadimplente || "",
      marca: formData.marca || "",
    };
    if (formData.request_type === "cancelamento") payload.motivo = formData.motivo;
    if (formData.request_type === "downgrade") payload.solicitacao = formData.solicitacao;
    if (formData.request_type === "duvidas") payload.duvida = formData.duvida;
    await base44.entities.RetentionRequest.create(payload);
    toast.success("Solicitação enviada com sucesso!");
    setFormData(initialData);
    setStep(0);
    setErrors({});
    setSubmitting(false);
    onSuccess?.();
    onClose();
  };

  const handleSubmit = async () => {
    const dups = await checkDuplicates();
    if (dups.length > 0) {
      setDuplicates(dups);
      setShowDuplicateWarning(true);
      return;
    }
    await handleSubmitConfirmed();
  };

  const handleUnificar = async () => {
    // Unifica: adiciona uma observação/ação no processo mais recente existente
    const maisRecente = duplicates.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    setShowDuplicateWarning(false);
    setSubmitting(true);
    try {
      // Registra nova solicitação vinculada ao processo existente como observação
      await base44.entities.RequestAction.create({
        request_id: maisRecente.id,
        descricao: `[Nova solicitação unificada] Tipo: ${formData.request_type} — Solicitante: ${formData.solicitante} — ${formData.motivo || formData.solicitacao || formData.duvida || ""}`,
        canal: "email",
        autor_nome: "Sistema",
        autor_email: "",
      });
      toast.success(`Solicitação unificada ao processo #${maisRecente.id_freshworks || maisRecente.id}!`);
      setFormData(initialData);
      setStep(0);
      setErrors({});
      onSuccess?.();
      onClose();
    } catch (e) {
      toast.error("Erro ao unificar: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(initialData);
    setStep(0);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-xl font-bold text-slate-900">
            Nova Solicitação
          </DialogTitle>
        </DialogHeader>

        <StepIndicator currentStep={step} />

        {showDuplicateWarning && (
          <div className="mx-6 my-3 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-amber-800">⚠️ CNPJ com solicitação em aberto</p>
            <p className="text-xs text-amber-700">Encontramos {duplicates.length} solicitação(ões) ativa(s) para este CNPJ:</p>
            <div className="space-y-1">
              {duplicates.map(d => (
                <div key={d.id} className="text-xs text-amber-700 bg-amber-100 px-3 py-1.5 rounded-lg">
                  {d.razao_social} — <span className="font-medium">{d.request_type}</span> — {statusLabels[d.status_processo] || d.status_processo}
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-700 font-medium">O que deseja fazer?</p>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={handleSubmitConfirmed} className="bg-amber-600 hover:bg-amber-700 text-white">Abrir nova solicitação</Button>
              <Button size="sm" onClick={handleUnificar} className="bg-blue-600 hover:bg-blue-700 text-white">Unificar no processo existente</Button>
              <Button size="sm" variant="outline" onClick={() => setShowDuplicateWarning(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        <div className="min-h-[320px]">
          {step === 0 && <StepType formData={formData} setFormData={setFormData} />}
          {step === 1 && <StepData formData={formData} setFormData={setFormData} errors={errors} />}
          {step === 2 && <StepDetails formData={formData} setFormData={setFormData} errors={errors} />}
          {step === 3 && <StepConfirmation formData={formData} />}
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0}
            className="text-slate-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          {step < 3 ? (
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white">
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}