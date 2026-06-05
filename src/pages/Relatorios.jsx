import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, FileText, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

const fmtDate = (d) => {
  if (!d) return "";
  try { return new Date(d + "T00:00:00").toLocaleDateString("pt-BR"); } catch { return d; }
};

const fmtDateTime = (d) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("pt-BR"); } catch { return d; }
};

const mesReferencia = (d) => {
  if (!d) return "";
  try {
    const dt = new Date(d + "T00:00:00");
    return dt.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  } catch { return d; }
};

const downloadExcel = (filename, headers, rows) => {
  const wsData = [headers, ...rows.map(row => row.map(v => v == null ? "" : v))];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, filename);
};

const STATUS_LABELS = {
  triagem: "Triagem",
  em_tratativa: "Em Tratativa",
  em_retencao_contato: "Em Retenção/Contato",
  aguardando_cliente: "Aguardando Cliente",
  aguardando_prazo: "Aguardando Prazo",
  aguardando_pagamento: "Aguardando Pagamento",
  em_execucao: "Em Execução",
  processo_finalizado: "Processo Finalizado",
  retido: "Retido",
  concluido: "Concluído",
};

const REQUEST_TYPE_LABELS = {
  cancelamento: "Cancelamento",
  downgrade: "Downgrade",
  duvidas: "Dúvidas",
};

export default function Relatorios() {
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [exporting, setExporting] = useState(null);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["relatorios-requests"],
    queryFn: () => base44.entities.RetentionRequest.list("-created_date", 1000),
  });

  const { data: motivosOptions = [] } = useQuery({
    queryKey: ["cancellation-reasons-relatorio"],
    queryFn: () => base44.entities.CancellationReason.list("nome", 200),
  });

  const { data: categoriasOptions = [] } = useQuery({
    queryKey: ["reason-categories-relatorio"],
    queryFn: () => base44.entities.ReasonCategory.list("nome", 200),
  });

  const motivoMap = {};
  motivosOptions.forEach(m => { motivoMap[m.id] = m; });

  const categoriaMap = {};
  categoriasOptions.forEach(c => { categoriaMap[c.id] = c; });

  const encontrarCategoria = (motivoId) => {
    if (!motivoId) return null;
    return categoriasOptions.find(cat => cat.motivos_ids?.includes(motivoId));
  };

  const filteredRequests = requests.filter(r => {
    const dataCancelamento = r.data_cancelamento_efetivo || r.data_ex_assinante || "";
    if (filterDateFrom && dataCancelamento && dataCancelamento < filterDateFrom) return false;
    if (filterDateTo && dataCancelamento && dataCancelamento > filterDateTo) return false;
    return true;
  });

  const handleExportCompleto = () => {
    setExporting("completo");
    const headers = [
      "ID", "Tipo de Solicitação", "Status do Processo",
      "Data de Abertura", "Responsável",
      "CNPJ", "Razão Social", "Solicitante", "Telefone", "E-mail",
      "Endereço", "Bairro", "Cidade", "Estado", "CEP",
      "Motivo", "Solicitação", "ID Assinatura",
      "Plano Contratado", "Plano Auxiliar", "Marca", "Família",
      "Condição de Pagamento", "Valor Mensalidade",
      "Qtde Funcionários", "Ciclos Faturados", "Tempo de Contrato (meses)", "Ciclos Faltantes",
      "Inadimplente", "Passível de Multa", "Possui Multa", "Cobra Multa",
      "Valor Multa Calculado", "Valor Multa",
      "Canal de Contato",
      "Data Cancelamento Efetivo", "Data Ex-Assinante",
      "Status Store",
      "Classificação Motivação", "Motivação (Motivo)",
      "Resultado Retenção", "Retorno Futuro",
      "Resumo Conclusão", "Próximas Ações",
      "Possui Termo", "Link Termo",
      "Motivo Real", "Negociação Realizada",
      "Observações",
      "ID Freshworks",
    ];

    const rows = filteredRequests.map(r => {
      const motivo = motivoMap[r.conclusao_motivo_id];
      const categoria = encontrarCategoria(r.conclusao_motivo_id);
      return [
        r.id,
        REQUEST_TYPE_LABELS[r.request_type] || r.request_type,
        STATUS_LABELS[r.status_processo] || r.status_processo,
        fmtDateTime(r.created_date),
        r.responsavel,
        r.cnpj,
        r.razao_social,
        r.solicitante,
        r.telefone,
        r.email,
        r.endereco,
        r.bairro,
        r.cidade,
        r.estado,
        r.cep,
        r.motivo,
        r.solicitacao,
        r.id_assinatura,
        r.plano_contratado,
        r.plano_auxiliar,
        r.marca,
        r.familia,
        r.condicao_pagamento,
        r.valor_mensalidade,
        r.qtde_funcionarios,
        r.ciclos_faturados,
        r.tempo_contrato,
        r.ciclos_faltantes,
        r.inadimplente === "sim" ? "Sim" : r.inadimplente === "nao" ? "Não" : "",
        r.passivel_multa === "sim" ? "Sim" : r.passivel_multa === "nao" ? "Não" : r.passivel_multa === "em_analise" ? "Em Análise" : "",
        r.possui_multa === "sim" ? "Sim" : r.possui_multa === "nao" ? "Não" : "",
        r.cobra_multa === "sim" ? "Sim" : r.cobra_multa === "nao" ? "Não" : "",
        r.valor_multa_calculado,
        r.valor_multa,
        r.canal_contato,
        fmtDate(r.data_cancelamento_efetivo),
        fmtDate(r.data_ex_assinante),
        r.status_store,
        categoria?.nome || r.classificacao_motivacao,
        motivo?.nome || "",
        r.resultado_retencao,
        r.retorno_futuro === "sim" ? "Sim" : r.retorno_futuro === "nao" ? "Não" : "",
        r.conclusao_resumo,
        r.conclusao_proximas_acoes,
        r.possui_termo ? "Sim" : "Não",
        r.link_termo,
        r.motivo_real,
        r.negociacao_realizada,
        r.observacoes,
        r.id_freshworks,
      ];
    });

    downloadExcel(`relatorio-completo-${new Date().toISOString().split("T")[0]}.xlsx`, headers, rows);
    setExporting(null);
  };

  const handleExportCancelamentos = () => {
    setExporting("cancelamentos");

    const cancelamentos = filteredRequests.filter(r => r.request_type === "cancelamento");

    const headers = [
      "Data do Cancelamento",
      "Data da Solicitação",
      "Mês de Referência do Cancelamento",
      "CNPJ",
      "Razão Social do Cliente",
      "Produto",
      "Marca",
      "Valores Mensais",
      "Motivo Sinalizado pelo Cliente",
      "Motivação",
      "Status",
      "Classificação",
      "Tempo de Contrato",
      "Quantidade de Funcionários",
      "Plano do Cliente",
    ];

    const rows = cancelamentos.map(r => {
      const motivo = motivoMap[r.conclusao_motivo_id];
      const categoria = encontrarCategoria(r.conclusao_motivo_id);
      const dataCancelamento = r.data_cancelamento_efetivo || r.data_ex_assinante || "";
      return [
        fmtDate(dataCancelamento),
        fmtDateTime(r.created_date),
        mesReferencia(dataCancelamento),
        r.cnpj,
        r.razao_social,
        r.familia,
        r.marca,
        r.valor_mensalidade,
        r.motivo,
        motivo?.nome || "",
        STATUS_LABELS[r.status_processo] || r.status_processo,
        categoria?.nome || r.classificacao_motivacao || "",
        r.tempo_contrato ? `${r.tempo_contrato} meses` : "",
        r.qtde_funcionarios,
        r.plano_contratado,
      ];
    });

    downloadExcel(`relatorio-cancelamentos-${new Date().toISOString().split("T")[0]}.xlsx`, headers, rows);
    setExporting(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-sm text-slate-500 mt-1">Exporte os dados das solicitações em formato CSV</p>
      </div>

      {/* Filtros de data */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Filtrar por data de cancelamento</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-6">De</span>
            <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-8 text-sm w-44" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-6">Até</span>
            <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-8 text-sm w-44" />
          </div>
          {(filterDateFrom || filterDateTo) && (
            <button onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }} className="text-xs text-slate-400 hover:text-red-500 underline">
              Limpar filtro
            </button>
          )}
        </div>
        <p className="text-xs text-slate-400">
          {isLoading ? "Carregando..." : `${filteredRequests.length} solicitação(ões) encontrada(s)`}
        </p>
      </div>

      {/* Cards de relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Relatório Completo */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Relatório Completo</h2>
              <p className="text-xs text-slate-500 mt-0.5">Todas as informações de todas as solicitações (cancelamentos, downgrades e dúvidas)</p>
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-0.5">
            <p>• Dados do cliente (CNPJ, Razão Social, contato, endereço)</p>
            <p>• Dados da assinatura (plano, valor, ciclos, multa)</p>
            <p>• Status, resultado, motivação e observações</p>
            <p>• Datas e responsáveis</p>
          </div>

          <Button
            onClick={handleExportCompleto}
            disabled={isLoading || exporting === "completo"}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {exporting === "completo" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting === "completo" ? "Exportando..." : "Exportar XLSX"}
          </Button>
        </div>

        {/* Relatório de Cancelamentos */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 hover:shadow-md transition-shadow">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Relatório de Cancelamentos</h2>
              <p className="text-xs text-slate-500 mt-0.5">Visão consolidada focada nos cancelamentos, com métricas estratégicas</p>
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-0.5">
            <p>• Data do cancelamento e da solicitação</p>
            <p>• Mês de referência do cancelamento</p>
            <p>• CNPJ, Razão Social, Produto, Marca</p>
            <p>• Valores Mensais, Motivação, Status, Classificação</p>
            <p>• Tempo de Contrato, Qtde Funcionários, Plano</p>
          </div>

          <Button
            onClick={handleExportCancelamentos}
            disabled={isLoading || exporting === "cancelamentos"}
            className="w-full bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            {exporting === "cancelamentos" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting === "cancelamentos" ? "Exportando..." : "Exportar XLSX"}
          </Button>
        </div>

      </div>
    </div>
  );
}