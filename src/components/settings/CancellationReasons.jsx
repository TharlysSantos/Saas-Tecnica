import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function CancellationReasons() {
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  const { data: reasons = [], isLoading } = useQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: () => base44.entities.CancellationReason.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (nome) => base44.entities.CancellationReason.create({ nome, ativo: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cancellation-reasons"] });
      setNewName("");
      toast.success("Motivo criado!");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, nome }) => base44.entities.CancellationReason.update(id, { nome }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cancellation-reasons"] });
      setEditingId(null);
      toast.success("Motivo atualizado!");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CancellationReason.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cancellation-reasons"] });
      toast.success("Motivo removido.");
    },
  });

  const handleAdd = () => {
    if (!newName.trim()) return;
    createMutation.mutate(newName.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Nome do motivo de cancelamento..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={!newName.trim() || createMutation.isPending} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : reasons.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhum motivo cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {reasons.map((r) => (
            <div key={r.id} className="flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3">
              {editingId === r.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 h-8"
                    autoFocus
                  />
                  <button onClick={() => updateMutation.mutate({ id: r.id, nome: editingName })} className="text-green-600 hover:text-green-700">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-slate-700">{r.nome}</span>
                  <button onClick={() => { setEditingId(r.id); setEditingName(r.nome); }} className="text-slate-400 hover:text-blue-500">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(r.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}