import React from "react";
import { Users } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

function TaxaBadge({ taxa }) {
  const color = taxa >= 70 ? "text-green-600 bg-green-50" : taxa >= 40 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
  return <span className={cn("px-2 py-0.5 rounded text-xs font-bold", color)}>{taxa}%</span>;
}

export default function TeamPerformance({ requests, actions }) {
  const now = new Date();

  // Build per-responsavel stats
  const statsMap = {};

  requests.filter(r => r.responsavel).forEach(r => {
    if (!statsMap[r.responsavel]) {
      statsMap[r.responsavel] = { total: 0, retidos: 0, cancelados: 0, semContato: 0 };
    }
    statsMap[r.responsavel].total++;
    if (r.status_processo === "retido") statsMap[r.responsavel].retidos++;
    if (r.status_processo === "processo_finalizado") statsMap[r.responsavel].cancelados++;

    // sem contato há +3 dias
    if (!["processo_finalizado", "retido"].includes(r.status_processo)) {
      const lastAction = actions
        .filter(a => a.request_id === r.id)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
      const ref = lastAction?.created_date || r.created_date;
      if (ref && differenceInDays(now, parseISO(ref)) >= 3) {
        statsMap[r.responsavel].semContato++;
      }
    }
  });

  // Avg response time per responsavel (time between request creation and first action)
  requests.filter(r => r.responsavel).forEach(r => {
    const firstAction = actions
      .filter(a => a.request_id === r.id)
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))[0];
    if (firstAction && r.created_date) {
      const days = differenceInDays(parseISO(firstAction.created_date), parseISO(r.created_date));
      if (!statsMap[r.responsavel].tempoResp) statsMap[r.responsavel].tempoResp = [];
      statsMap[r.responsavel].tempoResp.push(days);
    }
  });

  const rows = Object.entries(statsMap).map(([name, d]) => {
    const finalizados = d.retidos + d.cancelados;
    const taxa = finalizados > 0 ? Math.round((d.retidos / finalizados) * 100) : null;
    const avgResp = d.tempoResp?.length > 0
      ? Math.round(d.tempoResp.reduce((s, v) => s + v, 0) / d.tempoResp.length)
      : null;
    return { name, ...d, taxa, avgResp };
  }).sort((a, b) => b.total - a.total);

  if (rows.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-900 text-sm">Performance do Time</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Atendente</th>
              <th className="text-center py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Atendimentos</th>
              <th className="text-center py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Retidos</th>
              <th className="text-center py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Taxa Retenção</th>
              <th className="text-center py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Tempo Médio 1ª Resp.</th>
              <th className="text-center py-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sem Contato</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="py-3 px-2 font-medium text-slate-800">{r.name}</td>
                <td className="py-3 px-2 text-center text-slate-700">{r.total}</td>
                <td className="py-3 px-2 text-center text-green-600 font-semibold">{r.retidos}</td>
                <td className="py-3 px-2 text-center">
                  {r.taxa !== null ? <TaxaBadge taxa={r.taxa} /> : <span className="text-slate-300 text-xs">—</span>}
                </td>
                <td className="py-3 px-2 text-center text-slate-600 text-xs">
                  {r.avgResp !== null ? `${r.avgResp}d` : "—"}
                </td>
                <td className="py-3 px-2 text-center">
                  {r.semContato > 0
                    ? <span className="text-red-600 font-bold text-xs">{r.semContato}</span>
                    : <span className="text-slate-300 text-xs">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}