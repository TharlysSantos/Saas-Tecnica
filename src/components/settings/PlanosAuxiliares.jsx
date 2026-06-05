import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function PlanosAuxiliares() {
  const queryClient = useQueryClient();
  const [newNome, setNewNome] = useState("");
  const [newMarca, setNewMarca] = useState("");
  const [editId, setEditId] = useState(null);
  const [editNome, setEditNome] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: planos = [], isLoading } = useQuery({
    queryKey: ["planos-auxiliares"],
    queryFn: () => base44.entities.PlanoAuxiliar.list("nome", 200),
  });

  const handleAdd = async () => {
    if (!newNome.trim()) return;
    setSaving(true);
    await base44.entities.PlanoAuxiliar.create({ nome: newNome.trim(), marca: newMarca || null, ativo: true });
    queryClient.invalidateQueries({ queryKey: ["planos-auxiliares"] });
    setNewNome("");
    setNewMarca("");
    setSaving(false);
    toast.success("Plano auxiliar adicionado!");
  };

  const handleToggle = async (plano) => {
    await base44.entities.PlanoAuxiliar.update(plano.id, { ativo: !plano.ativo });
    queryClient.invalidateQueries({ queryKey: ["planos-auxiliares"] });
  };

  const [editMarca, setEditMarca] = useState("");

  const handleEdit = async (id) => {
    if (!editNome.trim()) return;
    await base44.entities.PlanoAuxiliar.update(id, { nome: editNome.trim(), marca: editMarca || null });
    queryClient.invalidateQueries({ queryKey: ["planos-auxiliares"] });
    setEditId(null);
    toast.success("Nome atualizado!");
  };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;

  const ativos = planos.filter(p => p.ativo);
  const inativos = planos.filter(p => !p.ativo);

  return (
    <div className="space-y-5">
      {/* Add new */}
      <div className="flex gap-2">
        <Input
          placeholder="Nome do plano auxiliar..."
          value={newNome}
          onChange={e => setNewNome(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="h-9"
        />
        <select value={newMarca} onChange={e => setNewMarca(e.target.value)} className="h-9 text-sm border border-slate-200 rounded-md px-2 bg-white">
          <option value="">Marca</option>
          <option value="DIMEP">DIMEP</option>
          <option value="MADIS">MADIS</option>
        </select>
        <Button onClick={handleAdd} disabled={saving || !newNome.trim()} className="gap-1.5">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar
        </Button>
      </div>

      {/* Active list */}
      <div className="space-y-1.5">
        {ativos.map(plano => (
          <div key={plano.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white">
            {editId === plano.id ? (
              <>
                <Input value={editNome} onChange={e => setEditNome(e.target.value)} className="h-7 text-sm flex-1" autoFocus onKeyDown={e => e.key === "Enter" && handleEdit(plano.id)} />
                <select value={editMarca} onChange={e => setEditMarca(e.target.value)} className="h-7 text-sm border border-slate-200 rounded-md px-2 bg-white">
                  <option value="">Marca</option>
                  <option value="DIMEP">DIMEP</option>
                  <option value="MADIS">MADIS</option>
                </select>
                <button onClick={() => handleEdit(plano.id)} className="text-green-600 hover:text-green-800"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-slate-800">{plano.nome}</span>
                {plano.marca && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{plano.marca}</span>}
                <button onClick={() => { setEditId(plano.id); setEditNome(plano.nome); setEditMarca(plano.marca || ""); }} className="text-slate-400 hover:text-slate-600"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleToggle(plano)} className="text-xs text-red-400 hover:text-red-600 px-2 py-0.5 rounded border border-red-200 hover:bg-red-50 transition-colors">Desativar</button>
              </>
            )}
          </div>
        ))}
        {ativos.length === 0 && <p className="text-sm text-slate-400 italic">Nenhum plano ativo.</p>}
      </div>

      {/* Inactive list */}
      {inativos.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Desativados</p>
          <div className="space-y-1.5">
            {inativos.map(plano => (
              <div key={plano.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50 opacity-60">
                <span className="flex-1 text-sm text-slate-500 line-through">{plano.nome}</span>
                <button onClick={() => handleToggle(plano)} className="text-xs text-green-600 hover:text-green-800 px-2 py-0.5 rounded border border-green-200 hover:bg-green-50 transition-colors">Reativar</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}