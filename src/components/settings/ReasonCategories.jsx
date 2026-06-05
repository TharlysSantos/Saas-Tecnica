import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Pencil, Check, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export default function ReasonCategories() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newMotivos, setNewMotivos] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingMotivos, setEditingMotivos] = useState([]);

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ["reason-categories"],
    queryFn: () => base44.entities.ReasonCategory.list("-created_date", 200),
  });

  const { data: reasons = [] } = useQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: () => base44.entities.CancellationReason.list("nome", 200),
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.ReasonCategory.create({ nome: newName.trim(), motivos_ids: newMotivos, ativo: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reason-categories"] });
      setNewName("");
      setNewMotivos([]);
      toast.success("Categoria criada!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.ReasonCategory.update(id, { nome: editingName, motivos_ids: editingMotivos }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reason-categories"] });
      setEditingId(null);
      toast.success("Categoria atualizada!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReasonCategory.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reason-categories"] });
      toast.success("Categoria removida.");
    },
  });

  const toggleMotivo = (id, list, setList) => {
    setList(list.includes(id) ? list.filter(m => m !== id) : [...list, id]);
  };

  const getReasonName = (id) => reasons.find(r => r.id === id)?.nome || id;

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
        <p className="text-sm font-medium text-slate-700">Nova Categoria</p>
        <Input
          placeholder="Nome da categoria..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <div>
          <p className="text-xs text-slate-500 mb-2">Selecione os motivos:</p>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <button
                key={r.id}
                onClick={() => toggleMotivo(r.id, newMotivos, setNewMotivos)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${newMotivos.includes(r.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"}`}
              >
                {r.nome}
              </button>
            ))}
          </div>
          {reasons.length === 0 && <p className="text-xs text-slate-400">Cadastre motivos primeiro.</p>}
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!newName.trim() || createMutation.isPending} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {loadingCats ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhuma categoria cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
              {editingId === cat.id ? (
                <div className="space-y-3">
                  <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus />
                  <div className="flex flex-wrap gap-2">
                    {reasons.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => toggleMotivo(r.id, editingMotivos, setEditingMotivos)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${editingMotivos.includes(r.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"}`}
                      >
                        {r.nome}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateMutation.mutate({ id: cat.id })} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{cat.nome}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {cat.motivos_ids?.length > 0 ? cat.motivos_ids.map(getReasonName).join(", ") : "Nenhum motivo vinculado"}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setEditingId(cat.id); setEditingName(cat.nome); setEditingMotivos(cat.motivos_ids || []); }} className="text-slate-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteMutation.mutate(cat.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}