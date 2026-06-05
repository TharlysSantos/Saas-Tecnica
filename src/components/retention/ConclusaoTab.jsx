import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Save, Loader2, ClipboardCheck, Pencil, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function ConclusaoTab({ request, onSaved, onClose }) {
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(!request?.conclusao_resumo && !request?.conclusao_motivo_id);
  const [resumo, setResumo] = useState(request?.conclusao_resumo || "");
  const [proximasAcoes, setProximasAcoes] = useState(request?.conclusao_proximas_acoes || "");
  const [motivoId, setMotivoId] = useState(request?.conclusao_motivo_id || "");

  useEffect(() => {
    setResumo(request?.conclusao_resumo || "");
    setProximasAcoes(request?.conclusao_proximas_acoes || "");
    setMotivoId(request?.conclusao_motivo_id || "");
    setEditing(!request?.conclusao_resumo && !request?.conclusao_motivo_id);
  }, [request]);

  const { data: motivos = [] } = useQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: () => base44.entities.CancellationReason.filter({ ativo: true }),
  });

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.RetentionRequest.update(request.id, {
      conclusao_resumo: resumo,
      conclusao_proximas_acoes: proximasAcoes,
      conclusao_motivo_id: motivoId,
    });
    toast.success("Conclusão salva com sucesso!");
    setSaving(false);
    setEditing(false);
    onSaved?.();
  };

  const motivoSelecionado = motivos.find((m) => m.id === motivoId);

  // Group motivos by classificacao
  const grouped = motivos.reduce((acc, m) => {
    const cat = m.classificacao || "Outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {});

  if (!editing) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Conclusão Registrada</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-slate-500 hover:text-slate-700 gap-1 text-xs h-7">
              <Pencil className="w-3 h-3" /> Editar
            </Button>
          </div>

          <div className="rounded-lg border border-green-100 bg-green-50/50 p-4 space-y-4">
            {motivoSelecionado && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Classificação</p>
                <p className="text-xs text-blue-600 font-semibold mb-2">{motivoSelecionado.classificacao}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Motivo</p>
                <p className="text-sm text-slate-700 font-medium">{motivoSelecionado.nome}</p>
              </div>
            )}
            {resumo && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Resumo da Retenção</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{resumo}</p>
              </div>
            )}
            {proximasAcoes && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Próximas Ações</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{proximasAcoes}</p>
              </div>
            )}
            {!motivoSelecionado && !resumo && !proximasAcoes && (
              <p className="text-sm text-slate-400 italic">Nenhuma informação registrada.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardCheck className="w-4 h-4 text-blue-500" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Conclusão da Retenção</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wider">Classificação / Motivo</Label>
          <Select value={motivoId} onValueChange={setMotivoId}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Selecione o motivo..." />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {Object.entries(grouped).map(([cat, items]) => (
                <React.Fragment key={cat}>
                  <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50">
                    {cat}
                  </div>
                  {items.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="pl-4">
                      {m.nome}
                    </SelectItem>
                  ))}
                </React.Fragment>
              ))}
            </SelectContent>
          </Select>
          {motivoSelecionado && (
            <p className="text-xs text-blue-600 font-medium">{motivoSelecionado.classificacao}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wider">Resumo da Retenção</Label>
          <Textarea
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            placeholder="Descreva o resumo do atendimento e das ações realizadas para reter o cliente..."
            className="min-h-[110px] resize-none text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 uppercase tracking-wider">Próximas Ações</Label>
          <Textarea
            value={proximasAcoes}
            onChange={(e) => setProximasAcoes(e.target.value)}
            placeholder="Descreva as próximas ações a serem tomadas..."
            className="min-h-[90px] resize-none text-sm"
          />
        </div>
      </div>

      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 w-full"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Conclusão
        </Button>
      </div>
    </div>
  );
}