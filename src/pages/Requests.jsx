import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, FileText, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import RetentionModal from "../components/retention/RetentionModal";
import RequestSheet from "../components/retention/RequestSheet";

const formatSP = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
};

const formatSPDateOnly = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
  });
};

const typeConfig = {
  cancelamento: { label: "Cancelamento", color: "bg-red-100 text-red-700" },
  downgrade: { label: "Downgrade", color: "bg-amber-100 text-amber-700" },
  duvidas: { label: "Dúvidas", color: "bg-blue-100 text-blue-700" },
};

const statusConfig = {
  // Triagem
  triagem: { label: "Triagem", color: "bg-slate-100 text-slate-700" },
  // Retenção
  em_tratativa: { label: "Retenção", color: "bg-amber-100 text-amber-700" },
  em_retencao_contato: { label: "Retenção", color: "bg-amber-100 text-amber-700" },
  aguardando_cliente: { label: "Retenção", color: "bg-amber-100 text-amber-700" },
  aguardando_prazo: { label: "Retenção", color: "bg-amber-100 text-amber-700" },
  aguardando_pagamento: { label: "Retenção", color: "bg-amber-100 text-amber-700" },
  // Execução
  em_execucao: { label: "Execução", color: "bg-purple-100 text-purple-700" },
  // Store
  processo_finalizado: { label: "Store", color: "bg-red-100 text-red-700" },
  bloqueado: { label: "Store", color: "bg-red-100 text-red-700" },
  reprocessar: { label: "Store", color: "bg-red-100 text-red-700" },
  // Oficialização
  retido: { label: "Oficialização", color: "bg-orange-100 text-orange-700" },
  // Concluído
  concluido: { label: "Concluído", color: "bg-green-100 text-green-700" },
  // legados
  suspenso: { label: "Retenção", color: "bg-amber-100 text-amber-700" },
  aguardando_cancelamento_vindi: { label: "Execução", color: "bg-purple-100 text-purple-700" },
};

export default function Requests() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["retention-requests"],
    queryFn: () => base44.entities.RetentionRequest.list("-created_date", 100),
  });

  const { data: allActions = [] } = useQuery({
    queryKey: ["all-request-actions"],
    queryFn: () => base44.entities.RequestAction.list("-created_date", 500),
  });

  const { data: cancellationReasons = [] } = useQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: () => base44.entities.CancellationReason.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RetentionRequest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retention-requests"] });
      toast.success("Solicitação removida.");
    },
  });

  // Map: reasonId -> reason name
  const reasonMap = {};
  cancellationReasons.forEach((r) => { reasonMap[r.id] = r.nome; });

  const selectedRequest = requests.find(r => r.id === selectedRequestId) || null;

  const ETAPA_STATUS_MAP = {
    triagem: ["triagem"],
    retencao: ["em_tratativa", "em_retencao_contato", "aguardando_cliente", "aguardando_prazo", "aguardando_pagamento"],
    execucao: ["em_execucao"],
    store: ["processo_finalizado", "bloqueado", "reprocessar"],
    oficializacao: ["retido"],
    concluido: ["concluido"],
  };

  const filtered = requests.filter((r) => {
    const matchSearch =
      !search ||
      r.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
      r.cnpj?.includes(search) ||
      r.solicitante?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || r.request_type === filterType;
    const statusAtual = r.status_processo || r.status;
    const matchStatus = filterStatus === "all" || (ETAPA_STATUS_MAP[filterStatus] || []).includes(statusAtual);
    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Solicitações</h1>
          <p className="text-sm text-slate-500 mt-1">Gerencie todas as solicitações de retenção</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            Nova Solicitação
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por empresa, CNPJ ou solicitante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="cancelamento">Cancelamento</SelectItem>
            <SelectItem value="downgrade">Downgrade</SelectItem>
            <SelectItem value="duvidas">Dúvidas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="triagem">Triagem</SelectItem>
            <SelectItem value="retencao">Retenção</SelectItem>
            <SelectItem value="execucao">Execução</SelectItem>
            <SelectItem value="store">Store</SelectItem>
            <SelectItem value="oficializacao">Oficialização</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70">
              <TableHead className="font-semibold text-slate-600">Empresa / CNPJ</TableHead>
              <TableHead className="font-semibold text-slate-600">Solicitante</TableHead>
              <TableHead className="font-semibold text-slate-600">Tipo</TableHead>
              <TableHead className="font-semibold text-slate-600">Motivo</TableHead>
              <TableHead className="font-semibold text-slate-600">Status</TableHead>
              <TableHead className="font-semibold text-slate-600">Analista</TableHead>
              <TableHead className="font-semibold text-slate-600">Criado em</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
            [1, 2, 3].map(i => (
              <TableRow key={i}>
                <TableCell colSpan={8}><div className="h-10 bg-slate-100 rounded animate-pulse" /></TableCell>
              </TableRow>
            ))
            ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-slate-400 py-12">
                  Nenhuma solicitação encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((req) => {
                const type = typeConfig[req.request_type] || typeConfig.duvidas;
                const statusKey = req.status_processo || req.status;
                const status = statusConfig[statusKey] || statusConfig.triagem;
                const isInadimplente = req.inadimplente === 'sim';
                const motivoNome = req.conclusao_motivo_id ? reasonMap[req.conclusao_motivo_id] : null;
                return (
                  <TableRow key={req.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedRequestId(req.id)}>
                    <TableCell>
                      <p className="font-medium text-slate-800 text-sm">{req.razao_social}</p>
                      <p className="text-xs text-slate-400">{req.cnpj}</p>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{req.solicitante}</TableCell>
                    <TableCell>
                      <Badge className={`${type.color} text-[10px]`}>{type.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {motivoNome ? (
                        <span className="text-xs text-slate-700 font-medium">{motivoNome}</span>
                      ) : (
                        <span className="text-xs text-amber-600 italic">Aguardando contato do especialista</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Badge className={`${status.color} text-[10px]`}>{status.label}</Badge>
                          {isInadimplente && (
                            <span title="Inadimplente"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /></span>
                          )}
                          {req.link_termo && (
                            <span title="Termo gerado"><FileText className="w-3.5 h-3.5 text-green-500" /></span>
                          )}
                        </div>
                        {status.label === "Retenção" && req.responsavel && (
                          <span className="text-[10px] text-slate-500">👤 {req.responsavel}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {req.responsavel || <span className="text-slate-300">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {formatSPDateOnly(req.created_date)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedRequest && (
        <RequestSheet
          request={selectedRequest}
          onClose={() => setSelectedRequestId(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["retention-requests"] });
            queryClient.invalidateQueries({ queryKey: ["all-request-actions"] });
          }}
        />
      )}



      <RetentionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["retention-requests"] })}
      />
    </div>
  );
}