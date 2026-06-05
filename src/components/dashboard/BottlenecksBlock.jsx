import React from "react";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

function GargaloBar({ label, count, max, color }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs font-bold text-slate-800">{count}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function BottlenecksBlock({ requests, actions }) {
  const now = new Date();

  // Sem retorno do contato +7 dias
  const semRetorno7 = requests.filter(r => {
    if (["processo_finalizado", "retido"].includes(r.status_processo)) return false;
    const lastAction = actions
      .filter(a => a.request_id === r.id)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    const ref = lastAction?.created_date || r.created_date;
    return ref && differenceInDays(now, parseISO(ref)) >= 7;
  }).length;

  const inadimplentes = requests.filter(r =>
    r.inadimplente === "sim" && !["processo_finalizado", "retido"].includes(r.status_processo)
  ).length;

  const aguardandoPagamento = requests.filter(r => r.status_processo === "aguardando_pagamento").length;

  // Aguardando prazo de cancelamento = aguardando_cancelamento_vindi + suspenso
  const aguardandoPrazo = requests.filter(r =>
    ["aguardando_cancelamento_vindi", "suspenso"].includes(r.status_processo)
  ).length;

  const gargalos = [
    { label: "Sem retorno do Contato +7 dias", count: semRetorno7, color: "bg-red-500" },
    { label: "Cliente inadimplente", count: inadimplentes, color: "bg-orange-500" },
    { label: "Aguardando pagamento", count: aguardandoPagamento, color: "bg-amber-400" },
    { label: "Aguardando o Prazo de cancelamento", count: aguardandoPrazo, color: "bg-purple-400" },
  ];

  const maxVal = Math.max(...gargalos.map(g => g.count), 1);
  const totalGargalos = gargalos.reduce((s, g) => s + g.count, 0);

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Gargalos Operacionais</h3>
          <p className="text-xs text-slate-400 mt-0.5">Processos parados ou com risco</p>
        </div>
        {totalGargalos > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 text-red-600 px-2.5 py-1 rounded-lg text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            {totalGargalos} alertas
          </div>
        )}
      </div>

      <div className="space-y-4">
        {gargalos.map(g => (
          <GargaloBar key={g.label} label={g.label} count={g.count} max={maxVal} color={g.color} />
        ))}
      </div>

      {semRetorno7 > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700">
            <strong>{semRetorno7}</strong> solicitação(ões) sem retorno há mais de 7 dias. Verificar cancelamento automático.
          </p>
        </div>
      )}
    </div>
  );
}