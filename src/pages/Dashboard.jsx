import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { subDays, subMonths, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfYesterday, endOfYesterday, parseISO, isAfter, isBefore, isEqual } from "date-fns";

import RetentionModal from "../components/retention/RetentionModal";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import OverviewCards from "../components/dashboard/OverviewCards";

import BottlenecksBlock from "../components/dashboard/BottlenecksBlock";
import RetentionAnalysis from "../components/dashboard/RetentionAnalysis";
import FinancialBlock from "../components/dashboard/FinancialBlock";
import TeamPerformance from "../components/dashboard/TeamPerformance";
import IntelligenceBlock from "../components/dashboard/IntelligenceBlock";

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [period, setPeriod] = useState("30days");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [requestType, setRequestType] = useState("all");
  const queryClient = useQueryClient();

  const { data: allRequests = [], isLoading, refetch } = useQuery({
    queryKey: ["retention-requests-dashboard"],
    queryFn: () => base44.entities.RetentionRequest.list("-created_date", 500),
    refetchInterval: 60000,
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["request-actions-dashboard"],
    queryFn: () => base44.entities.RequestAction.list("-created_date", 1000),
    refetchInterval: 60000,
  });

  const { data: reasons = [] } = useQuery({
    queryKey: ["cancellation-reasons"],
    queryFn: () => base44.entities.CancellationReason.filter({ ativo: true }),
  });

  const { cutoffStart, cutoffEnd } = useMemo(() => {
    const now = new Date();
    if (period === "today") return { cutoffStart: startOfDay(now), cutoffEnd: endOfDay(now) };
    if (period === "yesterday") return { cutoffStart: startOfYesterday(), cutoffEnd: endOfYesterday() };
    if (period === "7days") return { cutoffStart: subDays(now, 7), cutoffEnd: now };
    if (period === "30days") return { cutoffStart: subDays(now, 30), cutoffEnd: now };
    if (period === "current_month") return { cutoffStart: startOfMonth(now), cutoffEnd: endOfMonth(now) };
    if (period === "last_month") {
      const lastMonth = subMonths(now, 1);
      return { cutoffStart: startOfMonth(lastMonth), cutoffEnd: endOfMonth(lastMonth) };
    }
    if (period === "custom" && customRange.start && customRange.end) {
      return {
        cutoffStart: startOfDay(parseISO(customRange.start)),
        cutoffEnd: endOfDay(parseISO(customRange.end)),
      };
    }
    return { cutoffStart: null, cutoffEnd: null };
  }, [period, customRange]);

  const requests = useMemo(() => {
    let filtered = allRequests;
    if (cutoffStart) {
      filtered = filtered.filter(r => {
        const d = r.created_date ? parseISO(r.created_date) : null;
        if (!d) return false;
        return (isAfter(d, cutoffStart) || isEqual(d, cutoffStart)) &&
               (!cutoffEnd || isBefore(d, cutoffEnd) || isEqual(d, cutoffEnd));
      });
    }
    if (requestType !== "all") {
      filtered = filtered.filter(r => r.request_type === requestType);
    }
    return filtered;
  }, [allRequests, cutoffStart, cutoffEnd, requestType]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Gestão de cancelamentos e retenção de assinaturas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5 text-slate-600">
            <RefreshCw className="w-3.5 h-3.5" /> Atualizar
          </Button>

        </div>
      </div>

      {/* Filters */}
      <DashboardFilters period={period} setPeriod={setPeriod} requestType={requestType} setRequestType={setRequestType} customRange={customRange} setCustomRange={setCustomRange} />

      {/* 1. Overview Cards */}
      <OverviewCards requests={requests} isLoading={isLoading} actions={actions} />

      {/* 3. Gargalos */}
      <BottlenecksBlock requests={requests} actions={actions} />

      {/* 5+6. Cancelamentos + Retenção */}
      <RetentionAnalysis requests={requests} reasons={reasons} />

      {/* 7. Financeiro */}
      <FinancialBlock requests={requests} />

      {/* 8. Performance do Time */}
      <TeamPerformance requests={requests} actions={actions} />

      {/* 9+10. Inteligência + Ciclo de Vida */}
      <IntelligenceBlock requests={requests} reasons={reasons} actions={actions} />

      <RetentionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["retention-requests-dashboard"] });
          setModalOpen(false);
        }}
      />
    </div>
  );
}