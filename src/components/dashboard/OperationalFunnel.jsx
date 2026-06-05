import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const STATUS_CONFIG = [
  { key: "triagem", label: "Triagem", color: "#94a3b8" },
  { key: "aguardando_pagamento", label: "Aguard. Pagamento", color: "#f59e0b" },
  { key: "aguardando_cancelamento_vindi", label: "Aguard. Vindi", color: "#f97316" },
  { key: "suspenso", label: "Suspenso", color: "#8b5cf6" },
  { key: "retido", label: "Retido", color: "#22c55e" },
  { key: "processo_finalizado", label: "Finalizado", color: "#64748b" },
];

const RESPONSAVEL_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#22c55e", "#ef4444", "#06b6d4"];

export default function OperationalFunnel({ requests }) {
  const funnelData = STATUS_CONFIG.map(s => ({
    name: s.label,
    value: requests.filter(r => r.status_processo === s.key).length,
    color: s.color,
  }));

  // Responsáveis em atendimento
  const responsavelMap = {};
  requests.filter(r => r.responsavel && !["processo_finalizado", "retido"].includes(r.status_processo)).forEach(r => {
    responsavelMap[r.responsavel] = (responsavelMap[r.responsavel] || 0) + 1;
  });
  const responsavelData = Object.entries(responsavelMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.split(" ")[0], value }));

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-5">
      <div>
        <h3 className="font-semibold text-slate-900 text-sm">Funil Operacional</h3>
        <p className="text-xs text-slate-400 mt-0.5">Distribuição por status do processo</p>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={funnelData} layout="vertical" margin={{ left: 8, right: 16 }}>
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} width={130} axisLine={false} tickLine={false} />
          <Tooltip
            formatter={(val) => [val, "Solicitações"]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {funnelData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {responsavelData.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Em atendimento por operador</p>
          <div className="flex flex-wrap gap-2">
            {responsavelData.map((r, i) => (
              <div key={r.name} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: RESPONSAVEL_COLORS[i % RESPONSAVEL_COLORS.length] }} />
                <span className="text-xs font-medium text-slate-700">{r.name}</span>
                <span className="text-xs font-bold text-slate-500">{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}