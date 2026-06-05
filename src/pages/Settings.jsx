import React, { useState } from "react";
import { Settings as SettingsIcon, ChevronRight, Tag, Grid3x3, RotateCcw, BookOpen, Users } from "lucide-react";
import CancellationReasons from "../components/settings/CancellationReasons";
import ReasonCategories from "../components/settings/ReasonCategories";
import ReversionTypes from "../components/settings/ReversionTypes";
import PlanConfigs from "../components/settings/PlanConfigs";
import PlanosAuxiliares from "../components/settings/PlanosAuxiliares";
import StepConfigs from "../components/settings/StepConfigs";

const menu = [
  {
    group: "Retenção",
    items: [
      { key: "motivos", label: "Motivos de Cancelamento", icon: Tag, description: "Cadastre os motivos individuais de cancelamento." },
      { key: "categorias", label: "Categorias", icon: Grid3x3, description: "Agrupe os motivos em categorias." },
      { key: "reversao", label: "Tipo de Reversão", icon: RotateCcw, description: "Agrupe categorias em tipos de reversão." },
    ],
  },
  {
    group: "Vindi",
    items: [
      { key: "planos", label: "Planos e Marcas", icon: BookOpen, description: "Gerencie o mapeamento de planos Vindi para marcas e regras de multa." },
      { key: "planos_auxiliares", label: "Planos Auxiliares", icon: BookOpen, description: "Gerencie os planos auxiliares disponíveis para seleção." },
    ],
  },
  {
    group: "Workflow",
    items: [
      { key: "etapas", label: "Responsáveis por Etapa", icon: Users, description: "Defina grupos e analistas responsáveis por cada etapa do processo." },
    ],
  },
];

const panels = {
  motivos: CancellationReasons,
  categorias: ReasonCategories,
  reversao: ReversionTypes,
  planos: PlanConfigs,
  planos_auxiliares: PlanosAuxiliares,
  etapas: StepConfigs,
};

const titles = {
  motivos: "Motivos de Cancelamento",
  categorias: "Categorias",
  reversao: "Tipo de Reversão",
  planos: "Planos e Marcas",
  planos_auxiliares: "Planos Auxiliares",
  etapas: "Responsáveis por Etapa",
};

const descriptions = {
  motivos: "Cadastre os motivos individuais de cancelamento.",
  categorias: "Agrupe os motivos de cancelamento em categorias.",
  reversao: "Agrupe categorias em tipos de reversão para estratégias de retenção.",
  planos: "Gerencie o mapeamento de planos Vindi para marcas e regras de multa. Adicione novos planos ou edite os existentes.",
  planos_auxiliares: "Gerencie os planos auxiliares disponíveis para seleção no workflow.",
  etapas: "Defina quais grupos e analistas são responsáveis por cada etapa do fluxo de retenção.",
};

export default function Settings() {
  const [active, setActive] = useState("motivos");
  const Panel = panels[active];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6" /> Configurações
        </h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie as configurações do sistema</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          {menu.map((group) => (
            <div key={group.group}>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2 px-2">{group.group}</p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActive(item.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                      active === item.key
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {active === item.key && <ChevronRight className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        {/* Content */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200/60 p-6">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-900">{titles[active]}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{descriptions[active]}</p>
          </div>
          <Panel />
        </div>
      </div>
    </div>
  );
}