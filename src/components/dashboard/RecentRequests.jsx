import React from "react";
import { Badge } from "@/components/ui/badge";
const formatSP = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
};

const typeConfig = {
  cancelamento: { label: "Cancelamento", color: "bg-red-100 text-red-700" },
  downgrade: { label: "Downgrade", color: "bg-amber-100 text-amber-700" },
  duvidas: { label: "Dúvidas", color: "bg-blue-100 text-blue-700" },
};

const statusConfig = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-700" },
  em_analise: { label: "Em Análise", color: "bg-purple-100 text-purple-700" },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-700" },
};

export default function RecentRequests({ requests, isLoading }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Últimas Solicitações</h3>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 p-6">
      <h3 className="text-sm font-semibold text-slate-800 mb-4 uppercase tracking-wider">Últimas Solicitações</h3>

      {requests.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Nenhuma solicitação encontrada.</p>
      ) : (
        <div className="space-y-3">
          {requests.slice(0, 5).map((req) => {
            const type = typeConfig[req.request_type] || typeConfig.duvidas;
            const status = statusConfig[req.status] || statusConfig.pendente;
            return (
              <div
                key={req.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{req.razao_social}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {req.solicitante} · {formatSP(req.created_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Badge className={`${type.color} text-[10px] font-medium`}>{type.label}</Badge>
                  <Badge className={`${status.color} text-[10px] font-medium`}>{status.label}</Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}