import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const periods = [
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "current_month", label: "Mês atual" },
  { value: "last_month", label: "Mês anterior" },
  { value: "custom", label: "Período customizado" },
];

export default function DashboardFilters({ period, setPeriod, requestType, setRequestType, customRange, setCustomRange }) {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <Filter className="w-3.5 h-3.5" /> Filtros
      </div>

      <div className="flex flex-wrap gap-1">
        {periods.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              period === p.value
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <Input
            type="date"
            value={customRange.start}
            onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
            className="h-7 text-xs w-36 border-slate-200"
          />
          <span className="text-xs text-slate-400">até</span>
          <Input
            type="date"
            value={customRange.end}
            onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
            className="h-7 text-xs w-36 border-slate-200"
          />
        </div>
      )}

      <div className="w-px h-5 bg-slate-200" />

      <Select value={requestType} onValueChange={setRequestType}>
        <SelectTrigger className="h-8 text-xs w-44 border-slate-200">
          <SelectValue placeholder="Tipo de solicitação" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os tipos</SelectItem>
          <SelectItem value="cancelamento">Cancelamento</SelectItem>
          <SelectItem value="downgrade">Downgrade</SelectItem>
          <SelectItem value="duvidas">Dúvidas</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}