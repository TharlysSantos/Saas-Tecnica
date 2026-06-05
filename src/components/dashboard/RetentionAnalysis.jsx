import React, { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

export default function RetentionAnalysis({ requests, reasons }) {
  const [expanded, setExpanded] = useState({});

  const cancelados = requests.filter(r =>
    r.status_processo === "processo_finalizado" && r.request_type === "cancelamento"
  );

  // Build reason map
  const reasonMap = {};
  reasons.forEach(r => { reasonMap[r.id] = r; });

  // Group: classificacao -> motivo -> count
  const tree = {};
  cancelados.forEach(r => {
    const m = r.conclusao_motivo_id ? reasonMap[r.conclusao_motivo_id] : null;
    const cat = m?.classificacao || "Não informado";
    const motivo = m?.nome || "Sem motivo registrado";
    if (!tree[cat]) tree[cat] = {};
    tree[cat][motivo] = (tree[cat][motivo] || 0) + 1;
  });

  const classifications = Object.entries(tree)
    .map(([cat, motivos]) => ({
      cat,
      total: Object.values(motivos).reduce((s, v) => s + v, 0),
      motivos: Object.entries(motivos).sort((a, b) => b[1] - a[1]),
    }))
    .sort((a, b) => b.total - a.total);

  const grandTotal = cancelados.length;

  const toggle = (cat) => setExpanded(prev => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 text-sm">Cancelamentos por Classificação e Motivo</h3>
        <p className="text-xs text-slate-400 mt-0.5">{grandTotal} cancelamentos no período selecionado</p>
      </div>

      {classifications.length === 0 ? (
        <p className="text-sm text-slate-400 italic py-6 text-center">Nenhum cancelamento com motivo registrado no período</p>
      ) : (
        <div className="border border-slate-100 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 border-b border-slate-100">
            <div className="col-span-7 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Classificação / Motivo</div>
            <div className="col-span-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-center">Qtd.</div>
            <div className="col-span-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 text-center">% do Total</div>
          </div>

          {classifications.map(({ cat, total, motivos }) => {
            const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
            const isOpen = expanded[cat];
            return (
              <div key={cat}>
                {/* Classification row */}
                <button
                  onClick={() => toggle(cat)}
                  className="w-full grid grid-cols-12 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100 text-left"
                >
                  <div className="col-span-7 flex items-center gap-2">
                    {isOpen
                      ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      : <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    }
                    <span className="text-sm font-semibold text-slate-800">{cat}</span>
                  </div>
                  <div className="col-span-2 text-sm font-bold text-slate-800 text-center">{total}</div>
                  <div className="col-span-3 flex items-center justify-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-600 w-8 text-right">{pct}%</span>
                  </div>
                </button>

                {/* Motivo rows */}
                {isOpen && motivos.map(([motivo, count]) => {
                  const mPct = grandTotal > 0 ? Math.round((count / grandTotal) * 100) : 0;
                  return (
                    <div key={motivo} className="grid grid-cols-12 px-4 py-2 bg-slate-50/50 border-b border-slate-50 hover:bg-slate-50">
                      <div className="col-span-7 pl-8 text-xs text-slate-600">{motivo}</div>
                      <div className="col-span-2 text-xs font-medium text-slate-700 text-center">{count}</div>
                      <div className="col-span-3 flex items-center justify-center gap-2">
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-red-300 rounded-full" style={{ width: `${mPct}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">{mPct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Total row */}
          <div className="grid grid-cols-12 px-4 py-3 bg-slate-100">
            <div className="col-span-7 text-xs font-bold text-slate-700 uppercase tracking-wider pl-6">Total</div>
            <div className="col-span-2 text-sm font-bold text-slate-900 text-center">{grandTotal}</div>
            <div className="col-span-3 text-center text-xs font-bold text-slate-600">100%</div>
          </div>
        </div>
      )}
    </div>
  );
}