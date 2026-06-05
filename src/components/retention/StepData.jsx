import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ANALISTAS = ["Alberto", "Brigida"];

export default function StepData({ formData, setFormData, errors }) {
  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };



  const textFields = [
    { key: "razao_social", label: "Razão Social", placeholder: "Nome da empresa" },
    { key: "solicitante", label: "Solicitante", placeholder: "Nome completo" },
    { key: "telefone", label: "Telefone", placeholder: "(00) 00000-0000" },
    { key: "email", label: "E-mail", placeholder: "email@empresa.com", type: "email" },
  ];

  return (
    <div className="space-y-4 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-1">Dados da empresa</h3>
      <p className="text-sm text-slate-500">Preencha as informações abaixo. Os dados da Vindi serão buscados na triagem.</p>

      {/* CNPJ */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-700">CNPJ <span className="text-red-400">*</span></Label>
        <Input
          placeholder="00.000.000/0000-00"
          value={formData.cnpj || ""}
          onChange={(e) => handleChange("cnpj", e.target.value)}
          className={errors?.cnpj ? "border-red-400" : ""}
        />
        {errors?.cnpj && <p className="text-xs text-red-500">{errors.cnpj}</p>}
      </div>

      {/* Demais campos */}
      <div className="space-y-4">
        {textFields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key} className="text-sm font-medium text-slate-700">
              {field.label} <span className="text-red-400">*</span>
            </Label>
            <Input
              id={field.key}
              type={field.type || "text"}
              placeholder={field.placeholder}
              value={formData[field.key] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className={errors?.[field.key] ? "border-red-400" : ""}
            />
            {errors?.[field.key] && <p className="text-xs text-red-500">{errors[field.key]}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}