import React from "react";
import { Badge } from "@/components/ui/badge";

const typeLabels = {
  cancelamento: { label: "Cancelamento", color: "bg-red-100 text-red-700" },
  downgrade: { label: "Downgrade", color: "bg-amber-100 text-amber-700" },
  duvidas: { label: "Dúvidas", color: "bg-blue-100 text-blue-700" },
};

const detailsLabels = {
  cancelamento: { key: "motivo", label: "Motivo" },
  downgrade: { key: "solicitacao", label: "Solicitação" },
  duvidas: { key: "duvida", label: "Dúvida" },
};

export default function StepConfirmation({ formData }) {
  const typeInfo = typeLabels[formData.request_type];
  const detailInfo = detailsLabels[formData.request_type];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Confirme seus dados</h3>
        <p className="text-sm text-slate-500">Revise as informações antes de enviar.</p>
      </div>

      <div className="bg-slate-50 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Tipo</span>
          <Badge className={`${typeInfo?.color} font-medium`}>{typeInfo?.label}</Badge>
        </div>

        <div className="border-t border-slate-200 pt-4 space-y-3">
          {[
            { label: "CNPJ", value: formData.cnpj },
            { label: "Razão Social", value: formData.razao_social },
            { label: "Solicitante", value: formData.solicitante },
            { label: "Telefone", value: formData.telefone },
            { label: "E-mail", value: formData.email },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center">
              <span className="text-sm text-slate-500">{item.label}</span>
              <span className="text-sm font-medium text-slate-800">{item.value}</span>
            </div>
          ))}
        </div>

        {detailInfo && formData[detailInfo.key] && (
          <div className="border-t border-slate-200 pt-4">
            <span className="text-sm text-slate-500">{detailInfo.label}</span>
            <p className="text-sm font-medium text-slate-800 mt-1 whitespace-pre-wrap">
              {formData[detailInfo.key]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}