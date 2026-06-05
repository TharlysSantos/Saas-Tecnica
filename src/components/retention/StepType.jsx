import React from "react";
import { XCircle, ArrowDownCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const options = [
  {
    value: "cancelamento",
    label: "Cancelamento",
    description: "Solicitar o cancelamento do contrato",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-50 border-red-200 hover:border-red-400",
    bgActive: "bg-red-50 border-red-500 ring-2 ring-red-100",
  },
  {
    value: "downgrade",
    label: "Downgrade",
    description: "Solicitar redução do plano atual",
    icon: ArrowDownCircle,
    color: "text-amber-500",
    bg: "bg-amber-50 border-amber-200 hover:border-amber-400",
    bgActive: "bg-amber-50 border-amber-500 ring-2 ring-amber-100",
  },
  {
    value: "duvidas",
    label: "Dúvidas",
    description: "Esclarecer dúvidas sobre o contrato",
    icon: HelpCircle,
    color: "text-blue-500",
    bg: "bg-blue-50 border-blue-200 hover:border-blue-400",
    bgActive: "bg-blue-50 border-blue-500 ring-2 ring-blue-100",
  },
];

export default function StepType({ formData, setFormData }) {
  return (
    <div className="space-y-3 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-1">Tipo de solicitação</h3>
      <p className="text-sm text-slate-500 mb-6">Selecione o tipo de solicitação que deseja realizar.</p>

      <div className="space-y-3">
        {options.map((option) => {
          const isActive = formData.request_type === option.value;
          return (
            <button
              key={option.value}
              onClick={() => setFormData({ ...formData, request_type: option.value })}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left",
                isActive ? option.bgActive : option.bg
              )}
            >
              <option.icon className={cn("w-6 h-6 flex-shrink-0", option.color)} />
              <div>
                <p className="font-semibold text-slate-800 text-sm">{option.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}