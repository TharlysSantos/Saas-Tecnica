import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ETAPA_LABELS = {
  triagem: "Triagem",
  retencao: "Retenção",
  execucao: "Execução",
  ex_assinante: "Ex-Assinante",
  oficializacao: "Oficialização de Cancelamento",
};

const ETAPAS = Object.keys(ETAPA_LABELS);

export default function StepConfigs() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(null);
  const [newGrupo, setNewGrupo] = useState({});
  const [newAnalistaNome, setNewAnalistaNome] = useState({});
  const [newAnalistaEmail, setNewAnalistaEmail] = useState({});

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["step-configs"],
    queryFn: () => base44.entities.StepConfig.list("etapa", 20),
  });

  const configMap = {};
  configs.forEach((c) => { configMap[c.etapa] = c; });

  const getOrCreate = async (etapa) => {
    if (configMap[etapa]) return configMap[etapa];
    const created = await base44.entities.StepConfig.create({ etapa, grupos: [], analistas: [] });
    queryClient.invalidateQueries({ queryKey: ["step-configs"] });
    return created;
  };

  const updateField = async (etapa, field, value) => {
    setSaving(etapa);
    const record = await getOrCreate(etapa);
    await base44.entities.StepConfig.update(record.id, { [field]: value });
    queryClient.invalidateQueries({ queryKey: ["step-configs"] });
    setSaving(null);
    toast.success("Salvo!");
  };

  const addGrupo = async (etapa) => {
    const val = (newGrupo[etapa] || "").trim();
    if (!val) return;
    const record = await getOrCreate(etapa);
    const current = configMap[etapa]?.grupos || [];
    if (current.includes(val)) return;
    await updateField(etapa, "grupos", [...current, val]);
    setNewGrupo((p) => ({ ...p, [etapa]: "" }));
  };

  const removeGrupo = async (etapa, item) => {
    const record = configMap[etapa];
    if (!record) return;
    const updated = (record.grupos || []).filter((i) => i !== item);
    await updateField(etapa, "grupos", updated);
  };

  const addAnalista = async (etapa) => {
    const nome = (newAnalistaNome[etapa] || "").trim();
    const email = (newAnalistaEmail[etapa] || "").trim();
    if (!nome || !email) { toast.error("Preencha nome e e-mail do analista"); return; }
    const record = await getOrCreate(etapa);
    const current = configMap[etapa]?.analistas || [];
    // Normaliza: suporta array de strings (legado) e array de objetos
    const currentObj = current.map(a => typeof a === "string" ? { nome: a, email: "" } : a);
    if (currentObj.find(a => a.email === email)) { toast.error("E-mail já cadastrado"); return; }
    await updateField(etapa, "analistas", [...currentObj, { nome, email }]);
    setNewAnalistaNome((p) => ({ ...p, [etapa]: "" }));
    setNewAnalistaEmail((p) => ({ ...p, [etapa]: "" }));
  };

  const removeAnalista = async (etapa, email) => {
    const record = configMap[etapa];
    if (!record) return;
    const updated = (record.analistas || []).filter((a) => (typeof a === "string" ? a : a.email) !== email);
    await updateField(etapa, "analistas", updated);
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      {ETAPAS.map((etapa) => {
        const cfg = configMap[etapa] || {};
        const isSaving = saving === etapa;
        // Normaliza analistas legado (strings) para objetos
        const analistas = (cfg.analistas || []).map(a => typeof a === "string" ? { nome: a, email: "" } : a);

        return (
          <div key={etapa} className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{ETAPA_LABELS[etapa]}</h3>
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
            </div>
            <div className="p-4 grid grid-cols-2 gap-6">
              {/* Grupos */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Grupos</p>
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[24px]">
                  {(cfg.grupos || []).map((g) => (
                    <span key={g} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                      {g}
                      <button onClick={() => removeGrupo(etapa, g)} className="hover:text-blue-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {(cfg.grupos || []).length === 0 && <span className="text-xs text-slate-300 italic">Nenhum grupo</span>}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar grupo..."
                    value={newGrupo[etapa] || ""}
                    onChange={(e) => setNewGrupo((p) => ({ ...p, [etapa]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addGrupo(etapa)}
                    className="h-7 text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={() => addGrupo(etapa)} className="h-7 px-2">
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Analistas */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Analistas</p>
                <div className="flex flex-col gap-1.5 mb-2 min-h-[24px]">
                  {analistas.length === 0 && <span className="text-xs text-slate-300 italic">Nenhum analista</span>}
                  {analistas.map((a) => (
                    <span key={a.email || a.nome} className="flex items-center justify-between gap-1 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-lg">
                      <span>
                        <span className="font-semibold">{a.nome}</span>
                        {a.email && <span className="ml-1.5 text-green-500">{a.email}</span>}
                      </span>
                      <button onClick={() => removeAnalista(etapa, a.email || a.nome)} className="hover:text-green-900 flex-shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5">
                  <Input
                    placeholder="Nome reduzido (ex: Graziela Barros)"
                    value={newAnalistaNome[etapa] || ""}
                    onChange={(e) => setNewAnalistaNome((p) => ({ ...p, [etapa]: e.target.value }))}
                    className="h-7 text-xs"
                  />
                  <Input
                    placeholder="E-mail (ex: graziela@empresa.com)"
                    value={newAnalistaEmail[etapa] || ""}
                    onChange={(e) => setNewAnalistaEmail((p) => ({ ...p, [etapa]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && addAnalista(etapa)}
                    className="h-7 text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={() => addAnalista(etapa)} className="h-7 px-2 gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Adicionar analista
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}