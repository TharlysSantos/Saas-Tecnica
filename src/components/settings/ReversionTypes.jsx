import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function ReversionTypes() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newCats, setNewCats] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [editingCats, setEditingCats] = useState([]);

  const { data: revTypes = [], isLoading } = useQuery({
    queryKey: ["reversion-types"],
    queryFn: () => base44.entities.ReversionType.list("-created_date", 200),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["reason-categories"],
    queryFn: () => base44.entities.ReasonCategory.list("nome", 200),
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.ReversionType.create({ nome: newName.trim(), categorias_ids: newCats, ativo: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reversion-types"] });
      setNewName("");
      setNewCats([]);
      toast.success("Tipo de reversão criado!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id }) => base44.entities.ReversionType.update(id, { nome: editingName, categorias_ids: editingCats }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reversion-types"] });
      setEditingId(null);
      toast.success("Tipo de reversão atualizado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReversionType.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reversion-types"] });
      toast.success("Tipo de reversão removido.");
    },
  });

  const toggle = (id, list, setList) => {
    setList(list.includes(id) ? list.filter(c => c !== id) : [...list, id]);
  };

  const getCatName = (id) => categories.find(c => c.id === id)?.nome || id;

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
        <p className="text-sm font-medium text-slate-700">Novo Tipo de Reversão</p>
        <Input
          placeholder="Nome do tipo de reversão..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <div>
          <p className="text-xs text-slate-500 mb-2">Selecione as categorias:</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => toggle(c.id, newCats, setNewCats)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${newCats.includes(c.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"}`}
              >
                {c.nome}
              </button>
            ))}
          </div>
          {categories.length === 0 && <p className="text-xs text-slate-400">Cadastre categorias primeiro.</p>}
        </div>
        <Button onClick={() => createMutation.mutate()} disabled={!newName.trim() || createMutation.isPending} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
      ) : revTypes.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhum tipo de reversão cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {revTypes.map((rt) => (
            <div key={rt.id} className="bg-slate-50 rounded-lg px-4 py-3 border border-slate-100">
              {editingId === rt.id ? (
                <div className="space-y-3">
                  <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus />
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => toggle(c.id, editingCats, setEditingCats)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${editingCats.includes(c.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"}`}
                      >
                        {c.nome}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateMutation.mutate({ id: rt.id })} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{rt.nome}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {rt.categorias_ids?.length > 0 ? rt.categorias_ids.map(getCatName).join(", ") : "Nenhuma categoria vinculada"}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => { setEditingId(rt.id); setEditingName(rt.nome); setEditingCats(rt.categorias_ids || []); }} className="text-slate-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => deleteMutation.mutate(rt.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
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