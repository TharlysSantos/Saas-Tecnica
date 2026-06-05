import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Brain } from "lucide-react";

const LIFECYCLE_RANGES = [
  { label: "1 a 3 meses", min: 1, max: 3 },
  { label: "4 a 8 meses", min: 4, max: 8 },
  { label: "9 a 12 meses", min: 9, max: 12 },
  { label: "13 a 24 meses", min: 13, max: 24 },
  { label: "25+ meses", min: 25, max: Infinity },
];

const COMPANY_SIZE_RANGES = [
  { label: "Micro (1-9)", min: 1, max: 9 },
  { label: "Pequena (10-49)", min: 10, max: 49 },
  { label: "Média (50-199)", min: 50, max: 199 },
  { label: "Grande (200+)", min: 200, max: Infinity },
];

const EVITRAVEIS = [
  "Baixa utilização",
  "Problema no suporte",
  "Problema no produto",
  "Problema com equipamento",
  "Comercial e Atendimento",
];

export default function IntelligenceBlock({ requests, reasons, actions }) {
  const reasonMap = {};
  reasons.forEach(r => { reasonMap[r.id] = r; });

  // Top 5 motivos
  const motivoCount = {};
  requests.forEach(r => {
    if (r.conclusao_motivo_id) {
      const m = reasonMap[r.conclusao_motivo_id];
      const key = m ? m.nome : "Não informado";
      const cat = m ? m.classificacao : null;
      motivoCount[key] = motivoCount[key] || { value: 0, classificacao: cat };
      motivoCount[key].value++;
    }
  });
  const top5 = Object.entries(motivoCount)
    .sort((a, b) => b[1].value - a[1].value)
    .slice(0, 5)
    .map(([name, d]) => ({
      name: name.length > 32 ? name.slice(0, 30) + "…" : name,
      value: d.value,
      evitavel: d.classificacao ? EVITRAVEIS.includes(d.classificacao) : false,
    }));

  let evitavel = 0, inevitavel = 0;
  requests.forEach(r => {
    if (r.conclusao_motivo_id) {
      const m = reasonMap[r.conclusao_motivo_id];
      if (m) {
        if (EVITRAVEIS.includes(m.classificacao)) evitavel++;
        else inevitavel++;
      }
    }
  });

  // Ciclo de vida por ciclos_faturados
  const lifecycleData = LIFECYCLE_RANGES.map(range => {
    const inRange = requests.filter(r => {
      const meses = r.ciclos_faturados || 0;
      return meses >= range.min && meses <= range.max;
    });
    const cancelados = inRange.filter(r => r.status_processo === "processo_finalizado").length;
    const taxa = inRange.length > 0 ? Math.round((cancelados / inRange.length) * 100) : 0;
    return { name: range.label, total: inRange.length, cancelados, taxa };
  });

  // Por tamanho da empresa (qtde_funcionarios)
  const companySizeData = COMPANY_SIZE_RANGES.map(range => {
    const inRange = requests.filter(r => {
      const func = r.qtde_funcionarios || 0;
      return func >= range.min && (range.max === Infinity ? true : func <= range.max);
    });
    const cancelados = inRange.filter(r => r.status_processo === "processo_finalizado").length;
    const taxa = inRange.length > 0 ? Math.round((cancelados / inRange.length) * 100) : 0;
    return { name: range.label, total: inRange.length, cancelados, taxa };
  }).filter(d => d.total > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-slate-500" />
        <h3 className="font-semibold text-slate-900 text-sm">Inteligência & Análise Avançada</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 5 motivos */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Top 5 Motivos de Cancelamento</p>
          {top5.length > 0 ? (
            <div className="space-y-3">
              {top5.map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-xs text-slate-600 flex-1">{item.name}</span>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${item.evitavel ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                        {item.evitavel ? "Evitável" : "Inevitável"}
                      </span>
                      <span className="text-xs font-bold text-slate-800 w-4 text-right">{item.value}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.evitavel ? "bg-amber-400" : "bg-slate-400"}`}
                      style={{ width: top5[0]?.value > 0 ? `${Math.round((item.value / top5[0].value) * 100)}%` : "0%" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic py-4 text-center">Sem motivos registrados</p>
          )}
          {(evitavel + inevitavel) > 0 && (
            <div className="border-t border-slate-100 pt-3 flex gap-3">
              <div className="flex-1 text-center">
                <p className="text-lg font-bold text-amber-600">{evitavel}</p>
                <p className="text-[10px] text-slate-400">Evitáveis</p>
              </div>
              <div className="w-px bg-slate-100" />
              <div className="flex-1 text-center">
                <p className="text-lg font-bold text-slate-500">{inevitavel}</p>
                <p className="text-[10px] text-slate-400">Inevitáveis</p>
              </div>
            </div>
          )}
        </div>

        {/* Ciclo de vida */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cancelamentos por Tempo de Cliente</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={lifecycleData} margin={{ left: -24, right: 4 }}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
              <Tooltip
                formatter={(v) => [`${v}%`, "Taxa cancelamento"]}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Bar dataKey="taxa" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="space-y-1.5">
            {lifecycleData.filter(d => d.total > 0).map(d => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{d.name}</span>
                <span className="text-slate-800 font-medium">{d.total} clientes · <span className="text-red-500">{d.cancelados} cancel. ({d.taxa}%)</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Por tamanho da empresa */}
        <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Cancelamentos por Tamanho da Empresa</p>
          {companySizeData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={companySizeData} margin={{ left: -24, right: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip
                    formatter={(v) => [`${v}%`, "Taxa cancelamento"]}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Bar dataKey="taxa" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {companySizeData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{d.name}</span>
                    <span className="text-slate-800 font-medium">{d.total} · <span className="text-purple-500">{d.cancelados} cancel. ({d.taxa}%)</span></span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-400 italic py-6 text-center">Sem dados de funcionários registrados</p>
          )}
        </div>
      </div>
    </div>
  );
}