import React from "react";
import { Ticket, ExternalLink, Clock, AlertCircle } from "lucide-react";

const STATUS_LABELS = {
  triagem: "Triagem",
  em_tratativa: "Em Tratativa",
  em_retencao_contato: "Em Retenção",
  aguardando_cliente: "Aguard. Cliente",
  aguardando_prazo: "Aguard. Prazo",
  aguardando_pagamento: "Aguard. Pagamento",
  em_execucao: "Em Execução",
  processo_finalizado: "Finalizado",
  retido: "Retido",
  concluido: "Concluído",
};

const TYPE_COLORS = {
  cancelamento: "bg-red-100 text-red-700",
  downgrade: "bg-amber-100 text-amber-700",
  duvidas: "bg-blue-100 text-blue-700",
};

const TYPE_LABELS = {
  cancelamento: "Cancelamento",
  downgrade: "Downgrade",
  duvidas: "Dúvidas",
};

export default function TicketsDoCliente({ currentRequestId, cnpj, idFreshworks, allRequests = [] }) {
  // Outros tickets do mesmo CNPJ (exclui o atual)
  const outrosTickets = allRequests.filter(
    r => r.cnpj === cnpj && r.id !== currentRequestId && r.status_processo !== "concluido"
  );

  const formatData = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  };

  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <Ticket className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Tickets do Cliente</span>
      </div>

      {/* Ticket atual (Freshworks) */}
      <div className="bg-white border border-slate-200 rounded-md px-3 py-2 space-y-1">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Ticket atual</p>
        {idFreshworks ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-semibold text-slate-700">#{idFreshworks}</span>
            <span className="text-[10px] text-slate-400 italic">(Freshworks — integração em breve)</span>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">ID Freshworks não informado</p>
        )}
      </div>

      {/* Outros tickets em aberto do mesmo CNPJ */}
      {outrosTickets.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">
              {outrosTickets.length} outro(s) processo(s) aberto(s) para este CNPJ
            </p>
          </div>
          <div className="space-y-1">
            {outrosTickets.map(t => (
              <div key={t.id} className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {t.id_freshworks && (
                      <span className="text-xs font-mono font-semibold text-slate-700">#{t.id_freshworks}</span>
                    )}
                    <span className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${TYPE_COLORS[t.request_type] || "bg-slate-100 text-slate-600"}`}>
                      {TYPE_LABELS[t.request_type] || t.request_type}
                    </span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {STATUS_LABELS[t.status_processo] || t.status_processo}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Aberto em {formatData(t.created_date)}
                    {t.responsavel && <span className="ml-1">· 👤 {t.responsavel}</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outrosTickets.length === 0 && (
        <p className="text-xs text-slate-400 italic px-1">Nenhum outro processo aberto para este CNPJ.</p>
      )}
    </div>
  );
}