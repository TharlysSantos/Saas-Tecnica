import React from "react";
import { FileText, XCircle, ShieldCheck, Clock, RefreshCw } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

function KpiCard({ title, value, icon: Icon, color, bg, subtitle }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bg)}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}

export default function OverviewCards({ requests, isLoading, actions = [] }) {
  if (isLoading) return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {Array(5).fill(0).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 h-28 animate-pulse" />
      ))}
    </div>
  );

  const now = new Date();

  // Em Processo: tudo diferente de cancelado (processo_finalizado) e retidos
  const emProcesso = requests.filter(r =>
    !["processo_finalizado", "retido"].includes(r.status_processo)
  ).length;

  // Cancelados: processo_finalizado OU sem contato há +7 dias (fora de processo_finalizado e retido)
  const semRetorno7dias = requests.filter(r => {
    if (["processo_finalizado", "retido"].includes(r.status_processo)) return false;
    const lastAction = actions
      .filter(a => a.request_id === r.id)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
    const ref = lastAction?.created_date || r.created_date;
    return ref && differenceInDays(now, parseISO(ref)) >= 7;
  });
  const cancelados = requests.filter(r => r.status_processo === "processo_finalizado").length;
  const totalCancelados = cancelados + semRetorno7dias.length;

  // Retidos: status retido, tipo_retencao sem_alteracao ou null
  const retidos = requests.filter(r =>
    r.status_processo === "retido" && r.tipo_retencao !== "negociado"
  ).length;

  // Reativados: retido com tipo_retencao negociado
  const reativados = requests.filter(r =>
    r.status_processo === "retido" && r.tipo_retencao === "negociado"
  ).length;

  const totalFinalizados = cancelados + retidos + reativados;
  const taxaRetencao = totalFinalizados > 0
    ? Math.round(((retidos + reativados) / totalFinalizados) * 100)
    : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Em Processo"
          value={emProcesso}
          icon={Clock}
          color="text-blue-600"
          bg="bg-blue-50"
          subtitle="Ativos, não finalizados"
        />
        <KpiCard
          title="Cancelados"
          value={totalCancelados}
          icon={XCircle}
          color="text-red-600"
          bg="bg-red-50"
          subtitle={`${cancelados} finalizados + ${semRetorno7dias.length} sem retorno +7d`}
        />
        <KpiCard
          title="Retidos"
          value={retidos}
          icon={ShieldCheck}
          color="text-green-600"
          bg="bg-green-50"
          subtitle="Mantidos sem negociação"
        />
        <KpiCard
          title="Reativados"
          value={reativados}
          icon={RefreshCw}
          color="text-purple-600"
          bg="bg-purple-50"
          subtitle="Retidos com negociação"
        />
      </div>
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 flex items-center justify-between shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Taxa de Retenção</p>
          <p className="text-sm text-blue-200 mt-0.5">{retidos + reativados} retidos / {totalFinalizados} finalizados</p>
        </div>
        <p className="text-4xl font-bold text-white">{taxaRetencao}%</p>
      </div>
    </div>
  );
}