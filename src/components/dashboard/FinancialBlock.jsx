import React from "react";
import { DollarSign, AlertCircle, TrendingDown } from "lucide-react";

function FinCard({ title, value, icon: Icon, color, bg, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bg}`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

const fmt = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FinancialBlock({ requests }) {
  const inadimplentes = requests.filter(r => r.inadimplente === "sim");

  // Multas vencidas: possui_multa=sim E cobra_multa=nao (não serão cobradas = vencidas/perdidas)
  const multasVencidas = requests.filter(r => r.possui_multa === "sim" && r.cobra_multa === "nao");
  const totalMultasVencidas = multasVencidas.reduce((s, r) => s + (r.valor_multa_calculado || r.valor_multa || 0), 0);

  const totalMensalidade = requests.reduce((s, r) => s + (r.valor_mensalidade || 0), 0);
  const ticketMedio = requests.length > 0 ? totalMensalidade / requests.length : 0;

  const mrrRisco = requests
    .filter(r => !["processo_finalizado", "retido"].includes(r.status_processo))
    .reduce((s, r) => s + (r.valor_mensalidade || 0), 0);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-slate-900 text-sm">Impacto Financeiro</h3>
        <p className="text-xs text-slate-400 mt-0.5">Indicadores financeiros do período</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FinCard
          title="Multas Vencidas"
          value={fmt(totalMultasVencidas)}
          icon={TrendingDown}
          color="text-red-600"
          bg="bg-red-50"
          sub={`${multasVencidas.length} multas não cobradas`}
        />
        <FinCard
          title="Inadimplentes"
          value={inadimplentes.length}
          icon={AlertCircle}
          color="text-orange-600"
          bg="bg-orange-50"
          sub={`${requests.length > 0 ? Math.round((inadimplentes.length / requests.length) * 100) : 0}% das solicitações`}
        />
        <FinCard
          title="Ticket Médio"
          value={fmt(ticketMedio)}
          icon={DollarSign}
          color="text-slate-600"
          bg="bg-slate-100"
          sub={`Baseado em ${requests.length} solicitações`}
        />
      </div>
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="px-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">MRR em Risco</p>
            <p className="text-2xl font-bold text-red-600">{fmt(mrrRisco)}</p>
            <p className="text-xs text-slate-400 mt-1">Mensalidades de processos ativos</p>
          </div>
          <div className="px-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">MRR Total no Período</p>
            <p className="text-2xl font-bold text-slate-900">{fmt(totalMensalidade)}</p>
            <p className="text-xs text-slate-400 mt-1">Soma de todas as mensalidades</p>
          </div>
        </div>
      </div>
    </div>
  );
}