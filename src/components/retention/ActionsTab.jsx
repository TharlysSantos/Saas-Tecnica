import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Phone, Loader2, MessageSquare, Calendar } from "lucide-react";
import { toast } from "sonner";

const formatSP = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
};

export default function ActionsTab({ requestId, request }) {
  const queryClient = useQueryClient();
  const [descricao, setDescricao] = useState("");
  const [canal, setCanal] = useState("");
  const [dataProximoContato, setDataProximoContato] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["request-actions", requestId],
    queryFn: () => base44.entities.RequestAction.filter({ request_id: requestId }, "-created_date"),
  });

  const addMutation = useMutation({
    mutationFn: async (payload) => {
      const user = await base44.auth.me();
      const contexto_ia = {
        tipo_solicitacao: request?.request_type || "",
        razao_social: request?.razao_social || "",
        cnpj: request?.cnpj || "",
        plano_contratado: request?.plano_contratado || "",
        valor_mensalidade: request?.valor_mensalidade || null,
        ciclos_faturados: request?.ciclos_faturados || null,
        inadimplente: request?.inadimplente || "",
        possui_multa: request?.possui_multa || "",
        motivo_solicitacao: request?.motivo || request?.solicitacao || request?.duvida || "",
        canal_contato: payload.canal,
        descricao_acao: payload.descricao,
        data_acao: new Date().toISOString(),
      };
      return base44.entities.RequestAction.create({
        ...payload,
        autor_nome: user?.full_name || "Usuário",
        autor_email: user?.email || "",
        contexto_ia,
        aprovado_para_ia: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["request-actions", requestId] });
      setDescricao("");
      setCanal("");
      setDataProximoContato("");
      setShowForm(false);
      toast.success("Ação registrada com sucesso!");
    },
  });

  const handleAdd = () => {
    if (!descricao.trim()) { toast.error("Preencha a descrição da ação."); return; }
    if (!canal) { toast.error("Selecione o canal de contato."); return; }
    const payload = { request_id: requestId, descricao, canal };
    if (dataProximoContato) {
      // Store as ISO string — the user picked in local time via datetime-local input
      payload.data_proximo_contato = new Date(dataProximoContato).toISOString();
    }
    addMutation.mutate(payload);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-4 pb-3">
        {!showForm ? (
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            size="sm"
            className="w-full gap-2 border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600"
          >
            <Plus className="w-4 h-4" />
            Nova Ação
          </Button>
        ) : (
          <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Registrar Ação</p>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 uppercase tracking-wider">Canal de Contato</Label>
              <Select value={canal} onValueChange={setCanal}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione o canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-blue-500" /> E-mail</span>
                  </SelectItem>
                  <SelectItem value="telefone">
                    <span className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-green-500" /> Telefone</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 uppercase tracking-wider">Descrição da Ação</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva a ação realizada..."
                className="min-h-[80px] resize-none text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Próximo Contato <span className="text-slate-300 normal-case">(opcional)</span>
              </Label>
              <Input
                type="datetime-local"
                value={dataProximoContato}
                onChange={(e) => setDataProximoContato(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleAdd}
                disabled={addMutation.isPending}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 flex-1"
              >
                {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Registrar
              </Button>
              <Button
                onClick={() => { setShowForm(false); setDescricao(""); setCanal(""); setDataProximoContato(""); }}
                variant="ghost"
                size="sm"
                className="text-slate-500"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          ))
        ) : actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <MessageSquare className="w-8 h-8 text-slate-200 mb-3" />
            <p className="text-sm text-slate-400">Nenhuma ação registrada.</p>
            <p className="text-xs text-slate-300 mt-1">Clique em "Nova Ação" para começar.</p>
          </div>
        ) : (
          actions.map((action) => (
            <div key={action.id} className="bg-white border border-slate-100 rounded-xl p-4 space-y-2 hover:border-slate-200 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-slate-700 leading-relaxed flex-1">{action.descricao}</p>
                <Badge
                  className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-medium ${
                    action.canal === "email"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {action.canal === "email" ? <Mail className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                  {action.canal === "email" ? "E-mail" : "Telefone"}
                </Badge>
              </div>
              {action.data_proximo_contato && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md w-fit">
                  <Calendar className="w-3 h-3" />
                  <span>Próximo contato: {formatSP(action.data_proximo_contato)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-50">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  {action.autor_nome?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="text-xs text-slate-500 font-medium">{action.autor_nome}</span>
                <span className="text-xs text-slate-300">·</span>
                <span className="text-xs text-slate-400">{formatSP(action.created_date)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}