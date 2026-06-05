import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const detailsConfig = {
  cancelamento: {
    key: "motivo",
    label: "Motivo do Cancelamento",
    placeholder: "Descreva o motivo pelo qual deseja cancelar o contrato...",
  },
  downgrade: {
    key: "solicitacao",
    label: "Solicitação de Downgrade",
    placeholder: "Descreva a solicitação de downgrade desejada...",
  },
  duvidas: {
    key: "duvida",
    label: "Dúvida",
    placeholder: "Descreva sua dúvida sobre o contrato...",
  },
};

export default function StepDetails({ formData, setFormData, errors }) {
  const config = detailsConfig[formData.request_type];

  if (!config) return null;

  return (
    <div className="space-y-4 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-1">Detalhes</h3>
      <p className="text-sm text-slate-500 mb-6">Forneça informações adicionais sobre sua solicitação.</p>

      <div className="space-y-1.5">
        <Label htmlFor={config.key} className="text-sm font-medium text-slate-700">
          {config.label} <span className="text-red-400">*</span>
        </Label>
        <Textarea
          id={config.key}
          placeholder={config.placeholder}
          value={formData[config.key] || ""}
          onChange={(e) => setFormData({ ...formData, [config.key]: e.target.value })}
          className={`min-h-[140px] resize-none ${errors?.[config.key] ? "border-red-400 focus:ring-red-200" : ""}`}
        />
        {errors?.[config.key] && (
          <p className="text-xs text-red-500">{errors[config.key]}</p>
        )}
      </div>
    </div>
  );
}