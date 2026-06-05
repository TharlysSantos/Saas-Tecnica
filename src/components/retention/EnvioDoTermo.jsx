import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, Stamp, Loader2, FileText, ArrowLeft, X, ShieldAlert, History, Eye, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const formatDate = (d) => {
  if (!d) return null;
  return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
};

const todayStr = () => new Date().toISOString().split("T")[0];

const getDataCancelamento = (req) => req.data_cancelamento_efetivo || req.data_ex_assinante || null;

const dataCancelamentoChegou = (req) => {
  const data = getDataCancelamento(req);
  if (!data) return false;
  return todayStr() >= data;
};

const multaResolvida = (req) => {
  if (req.possui_multa !== "sim") return true;
  if (req.cobra_multa === "nao") return true;
  return !!req.multa_bill_id;
};

const getValidations = (req) => [
  { id: "responsavel", label: "Analista responsável definido", ok: !!req.responsavel },
  { id: "motivo", label: "Motivo de cancelamento definido", ok: !!req.conclusao_motivo_id },
  { id: "data_cancelamento", label: "Data de cancelamento preenchida", ok: !!getDataCancelamento(req) },
  { id: "data_chegou", label: `Data de cancelamento já chegou (${formatDate(getDataCancelamento(req)) || "—"})`, ok: dataCancelamentoChegou(req) },
  { id: "sem_faturas", label: "Sem faturas em aberto", ok: !req.vindi_data?.open_bills || req.vindi_data.open_bills === 0 },
  { id: "multa", label: "Situação da multa resolvida", ok: multaResolvida(req) },
  { id: "inadimplente", label: "Cliente adimplente", ok: req.inadimplente !== "sim" },
];

const getFamiliaInfo = (familia) => {
  const f = (familia || "").toLowerCase();
  if (f.includes("kairos")) {
    return { nomeSoftware: f.includes("pec") ? "Kairos PECs" : "Kairos", tipoTermo: "kairos" };
  }
  if (f.includes("md com") || f.includes("md común") || f.includes("md comune")) {
    return { nomeSoftware: f.includes("pec") ? "MD Comune PEC" : "MD Comune", tipoTermo: "kairos" };
  }
  if (f.includes("parking") || f.includes("rb texto") || f.includes("servcom") || f.includes("acesso") || f.includes("estacionamento")) {
    const nomeSoftware =
      f.includes("parking") ? "Parking Dimep" :
      f.includes("rb texto") ? "RB Texto Madis" :
      f.includes("servcom") ? "Servcom Dimep" :
      f.includes("acesso dimep") ? "Acesso Dimep" :
      f.includes("acesso madis") ? "Acesso Madis" :
      f.includes("estacionamento") ? "Estacionamento Madis" : familia;
    return { nomeSoftware, tipoTermo: "parking" };
  }
  return { nomeSoftware: familia || "Software", tipoTermo: "kairos" };
};

function gerarTermo(req) {
  const data = formatDate(getDataCancelamento(req)) || "___/___/______";
  const familia = req.familia || "";
  const { nomeSoftware, tipoTermo } = getFamiliaInfo(familia);
  const razaoSocial = req.razao_social || "___________________";
  const cnpjContratante = (req.cnpj || "").replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5") || "___________________";
  const cidadeEstado = [req.cidade, req.estado].filter(Boolean).join(" / ") || "___________________";
  const endereco = req.endereco || "___________________";
  const cep = req.cep ? `CEP: ${req.cep}` : "CEP: ___________";

  const cabecalho = `TERMO DE RESCISÃO DE CONTRATO DE SOFTWARE\n\nPartes Contratantes:\n\nContratada: "D-SAAS TECNOLOGIA EM DESENVOLVIMENTO DE SOFTWARE LTDA", com sede no município de "Extrema", Estado de "MG", na Estrada Municipal da "Represa 917 – DOS PESSEGUEIROS", CEP: "37640-000", inscrita sob o CNPJ/CPF n° "46.220.369/0002-91".\n\nContratante: "${razaoSocial}" com sede no município de "${cidadeEstado}" na "${endereco}" - "${cep}" inscrita no CNPJ/CPF sob o n° "${cnpjContratante}"\n\nObjeto: Este termo formaliza a rescisão da assinatura de licença do uso do software "${nomeSoftware}"`;

  const rodape = `\nE, por estarem assim justas e acordadas, as partes assinam o presente termo de forma digital.\n\nSão Paulo, "${data}".\n\nContratante: "${razaoSocial}"\nCNPJ/CPF: "${cnpjContratante}"\n\nContratada: D-SAAS TECNOLOGIA EM DESENVOLVIMENTO DE SOFTWARE LTDA\nCNPJ: 46.220.369/0002-91`;

  if (tipoTermo === "kairos") {
    return `${cabecalho}\n\n1. Rescisão Contratual: As partes, de comum acordo, resolvem rescindir o contrato de prestação de serviços de software em "${data}".\n\n2. Informações Importantes Após o Cancelamento: Após o cancelamento da assinatura, o acesso ao sistema será limitado, permitindo que os clientes realizem consultas e extração de relatórios de períodos já encerrados. O acesso ficará restrito, sendo que somente o usuário master terá permissão para acessar.\n\n3. Período de Disponibilidade de Dados: Os dados estarão disponíveis para consulta por até 12 meses após o cancelamento da assinatura.\n\n4. Considerações Adicionais:\n  • O plano disponibilizado após o cancelamento possui acesso e recursos limitados.\n  • O backup de dados cadastrais, marcações e tratativas de ponto deverá ser realizado pelo cliente, emitindo relatórios e armazenando os arquivos internamente.\n  • O acesso ao Suporte e Atendimento também será limitado. Caso necessário, será preciso contratar um "Chamado Avulso" através do site www.tagus-tec.com.br.\n\n5. Confidencialidade: As partes comprometem-se a manter a confidencialidade sobre todas as informações obtidas durante a vigência do contrato original.\n\n6. Foro: Fica eleito o Foro Central da Comarca da Capital de São Paulo para dirimir quaisquer questões decorrentes deste termo.${rodape}`;
  }
  return `${cabecalho}\n\n1. Rescisão Contratual: As partes, de comum acordo, resolvem rescindir o contrato de prestação de serviços de software em "${data}".\n\n2. CONTRATANTE não terá mais acesso ao sistema, incluindo login, navegação, consultas ou qualquer tipo de operação;\nFica expressamente estabelecido que não será possível realizar visualização de dados, extração de relatórios ou qualquer recuperação de informações diretamente na plataforma;\nÉ de responsabilidade do CONTRATANTE, antes da data de rescisão, realizar a extração e guarda de quaisquer dados que julgar necessários.\n\n3. Confidencialidade: As partes comprometem-se a manter a confidencialidade sobre todas as informações obtidas durante a vigência da assinatura original.\n\n4. Foro: Fica eleito o Foro Central da Comarca da Capital de São Paulo para dirimir quaisquer questões decorrentes deste termo.${rodape}`;
}

const formatDateBR = (d) => {
  if (!d) return "—";
  try { return new Date(d + "T00:00:00").toLocaleDateString("pt-BR"); } catch { return d; }
};

const gerarHistoricoVindi = (req) => {
  const hoje = new Date().toLocaleDateString("pt-BR");
  const dataSolicitacao = req.created_date
    ? new Date(req.created_date).toLocaleDateString("pt-BR")
    : "—";
  const dataCancelamento = formatDateBR(req.data_cancelamento_efetivo || req.data_ex_assinante);
  const statusStore = req.status_store === "ex_assinante" ? "Sim" : req.status_store === "bloqueado" ? "Bloqueado (inadimplente)" : "—";

  return `CANCELAMENTO DA ASSINATURA
Data da solicitação: ${dataSolicitacao}
Solicitante do cancelamento: ${req.solicitante || "—"}
Motivo: ${req.motivo || "—"}
Real motivo: ${req.motivo_real || "—"}
Inativado na Store: ${statusStore}
Oficialização do Cancelamento: ${hoje}`;
};

function HistoricoModal({ req, onClose }) {
  const [enviando, setEnviando] = useState(false);
  const texto = gerarHistoricoVindi(req);

  const handleEnviar = async () => {
    if (!req.id_assinatura) {
      toast.error("ID de assinatura não encontrado para este cliente.");
      return;
    }
    setEnviando(true);
    try {
      await base44.functions.invoke("vindiIntegration", {
        action: "adicionar_observacao",
        subscription_id: String(req.id_assinatura),
        observacao: texto,
      });
      toast.success("Histórico registrado na Vindi!");
      onClose();
    } catch (e) {
      toast.error("Erro ao registrar: " + e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <p className="font-semibold text-slate-800">📋 Histórico Vindi</p>
            <p className="text-xs text-slate-400">{req.razao_social}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2">✕</button>
        </div>
        <div className="px-6 py-4">
          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-4">{texto}</pre>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(texto); toast.success("Copiado!"); }} className="text-xs">
            Copiar
          </Button>
          <Button size="sm" onClick={handleEnviar} disabled={enviando || !req.id_assinatura} className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
            {enviando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <History className="w-3.5 h-3.5" />}
            Registrar na Vindi
          </Button>
        </div>
      </div>
    </div>
  );
}

const LOGO_URL = "https://media.base44.com/images/public/69aae81f416f0a7fc846ab74/f1cf6be15_01-D-Saaslogotipo20241.png";

function gerarTermoHTML(req) {
  const texto = gerarTermo(req);
  // Converte o texto plano em HTML formatado com logo
  const paragrafos = texto.split('\n\n').map(p => {
    const trimmed = p.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('TERMO DE RESCISÃO')) {
      return `<h1 style="font-size:18px;font-weight:700;text-align:center;margin:24px 0 8px;color:#1e293b;">${trimmed}</h1>`;
    }
    if (trimmed.startsWith('Partes Contratantes:')) {
      return `<h2 style="font-size:13px;font-weight:700;margin:16px 0 4px;color:#1e293b;">Partes Contratantes:</h2>`;
    }
    if (/^\d+\./.test(trimmed)) {
      const [first, ...rest] = trimmed.split('\n');
      const body = rest.length > 0
        ? `<strong>${first}</strong><br/>${rest.map(l => l.startsWith('  •') ? `&nbsp;&nbsp;&nbsp;• ${l.replace('  •','').trim()}<br/>` : `${l}<br/>`).join('')}`
        : `<strong>${first}</strong>`;
      return `<p style="margin:10px 0;font-size:12px;line-height:1.7;color:#334155;">${body}</p>`;
    }
    return `<p style="margin:6px 0;font-size:12px;line-height:1.7;color:#334155;">${trimmed.replace(/\n/g, '<br/>')}</p>`;
  }).join('');

  return `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:32px;background:#fff;">
      <div style="text-align:center;margin-bottom:24px;padding-bottom:20px;border-bottom:2px solid #1e293b;">
        <img src="${LOGO_URL}" alt="D-SAAS" style="height:48px;object-fit:contain;" />
      </div>
      ${paragrafos}
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="font-size:10px;color:#94a3b8;">D-SAAS TECNOLOGIA EM DESENVOLVIMENTO DE SOFTWARE LTDA · CNPJ: 46.220.369/0002-91</p>
        <p style="font-size:10px;color:#94a3b8;">Estrada Municipal da Represa 917 – DOS PESSEGUEIROS, Extrema/MG · CEP: 37640-000</p>
      </div>
    </div>`;
}

function TermoModal({ req, onClose }) {
  const htmlContent = gerarTermoHTML(req);
  const iframeRef = React.useRef(null);

  const handleCopyHTML = () => {
    // Copia o HTML formatado para a área de transferência (para colar em editors rich text como Freshdesk)
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const clipItem = new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([gerarTermo(req)], { type: 'text/plain' }) });
    navigator.clipboard.write([clipItem])
      .then(() => toast.success("Termo copiado! Cole diretamente no Freshdesk."))
      .catch(() => {
        // Fallback: copia texto puro
        navigator.clipboard.writeText(gerarTermo(req));
        toast.success("Texto do termo copiado!");
      });
  };

  const handlePrint = () => {
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>Termo de Rescisão - ${req.razao_social}</title><style>body{margin:0;padding:0;background:#fff;}</style></head><body>${htmlContent}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <p className="font-semibold text-slate-800">📄 Termo de Rescisão</p>
            <p className="text-xs text-slate-400">{req.razao_social} · {req.familia || "—"} · Ticket #{req.id_freshworks || "—"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint} variant="outline" className="text-xs gap-1.5">
              🖨️ Imprimir / PDF
            </Button>
            <Button size="sm" onClick={handleCopyHTML} className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              📋 Copiar para Freshdesk
            </Button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold px-2">✕</button>
          </div>
        </div>

        {/* Preview do termo com logo */}
        <div className="overflow-y-auto flex-1 bg-slate-100 p-4">
          <div className="bg-white rounded-lg shadow-sm mx-auto"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-500">
            💡 Clique em <strong>"Copiar para Freshdesk"</strong> e cole diretamente na resposta pública do ticket #{req.id_freshworks || "—"} — o formatação e logo serão preservados.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function EnvioDoTermo() {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [processing, setProcessing] = useState(false);
  const [termoReq, setTermoReq] = useState(null);
  const [historicoReq, setHistoricoReq] = useState(null);
  const [expandedPendencias, setExpandedPendencias] = useState(new Set());
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["requests-to-officiate"],
    queryFn: () => base44.entities.RetentionRequest.filter({ request_type: "cancelamento" }, "-created_date", 300),
  });

  const pending = requests.filter(r => r.status_processo === "retido");

  // Separar prontos (sem pendências) e forçados (com pendências)
  const prontos = pending.filter(r => getValidations(r).every(v => v.ok));
  const forcados = pending.filter(r => !getValidations(r).every(v => v.ok));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["requests-to-officiate"] });
    setSelectedIds(new Set());
  };

  const handleOficializar = async () => {
    const selecionados = pending.filter(r => selectedIds.has(r.id));
    if (selecionados.length === 0) return;
    setProcessing(true);
    let historicoOk = 0;
    let historicoErr = 0;
    for (const req of selecionados) {
      // Registra histórico na Vindi se tiver id_assinatura
      if (req.id_assinatura) {
        try {
          await base44.functions.invoke("vindiIntegration", {
            action: "adicionar_observacao",
            subscription_id: String(req.id_assinatura),
            observacao: gerarHistoricoVindi(req),
          });
          historicoOk++;
        } catch { historicoErr++; }
      }
      await base44.entities.RetentionRequest.update(req.id, { status_processo: "concluido" });
    }
    const msg = historicoOk > 0
      ? `${selecionados.length} cancelamento(s) oficializado(s)! Histórico registrado na Vindi para ${historicoOk} cliente(s).${historicoErr > 0 ? ` (${historicoErr} falharam)` : ""}`
      : `${selecionados.length} cancelamento(s) oficializado(s)!`;
    toast.success(msg);
    setProcessing(false);
    invalidate();
  };

  const handleVoltarExecucao = async () => {
    const selecionados = pending.filter(r => selectedIds.has(r.id));
    if (selecionados.length === 0) return;
    setProcessing(true);
    for (const req of selecionados) {
      await base44.entities.RetentionRequest.update(req.id, { status_processo: "em_execucao" });
    }
    toast.success(`${selecionados.length} cliente(s) retornado(s) para Execução.`);
    setProcessing(false);
    invalidate();
  };

  const toggleExpand = (id) => {
    setExpandedPendencias(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allIds = pending.map(r => r.id);
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const renderRow = (req, isForcado = false) => {
    const validations = getValidations(req);
    const failCount = validations.filter(v => !v.ok).length;
    const isSelected = selectedIds.has(req.id);
    const isExpanded = expandedPendencias.has(req.id);
    const { tipoTermo } = getFamiliaInfo(req.familia);

    return (
      <div
        key={req.id}
        className={`px-4 py-3 transition-colors ${
          isForcado
            ? "bg-red-50 border-l-4 border-red-500"
            : isSelected
            ? "bg-orange-50 border-l-4 border-orange-400"
            : "hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelect(req.id)}
            className="w-4 h-4 rounded border-slate-300 text-orange-500 flex-shrink-0 cursor-pointer"
          />

          {isForcado
            ? <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
            : <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          }

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={`text-sm font-semibold truncate ${isForcado ? "text-red-800" : "text-slate-800"}`}>
                {req.razao_social}
              </p>
              <span className="text-xs text-slate-400 font-mono">{req.cnpj}</span>
              {(req.vindi_customer_id || req.vindi_data?.customer_id) && (
                <a
                  href={`https://sandbox-app.vindi.com.br/admin/customers/${req.vindi_customer_id || req.vindi_data?.customer_id}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] bg-blue-50 border border-blue-200 text-blue-600 rounded hover:bg-blue-100 transition-colors font-semibold flex-shrink-0"
                >
                  <ExternalLink className="w-3 h-3" /> Vindi
                </a>
              )}
              {req.familia && (
                <span className={`px-1.5 py-0.5 text-[10px] rounded font-semibold ${
                  tipoTermo === "kairos" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                }`}>
                  {req.familia}
                </span>
              )}
              {isForcado && (
                <span className="px-2 py-0.5 text-[10px] rounded font-bold bg-red-100 text-red-700 border border-red-300">
                  ⚠️ FORÇADO — {failCount} pendência(s)
                </span>
              )}
              {!isForcado && (
                <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-semibold">Pronto</span>
              )}
            </div>

            {isForcado && (
              <div className="mt-1">
                <button
                  onClick={() => toggleExpand(req.id)}
                  className="text-[10px] text-red-500 underline hover:text-red-700"
                >
                  Ver pendências {isExpanded ? "▲" : "▼"}
                </button>
                {isExpanded && (
                  <div className="mt-1.5 space-y-0.5">
                    {validations.filter(v => !v.ok).map(v => (
                      <div key={v.id} className="flex items-center gap-1.5">
                        <XCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <span className="text-xs text-red-600">{v.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHistoricoReq(req)}
              className="h-7 text-xs gap-1 border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <History className="w-3 h-3" />
              Histórico
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTermoReq(req)}
              className="h-7 text-xs gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <FileText className="w-3 h-3" />
              Termo
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {termoReq && <TermoModal req={termoReq} onClose={() => setTermoReq(null)} />}
      {historicoReq && <HistoricoModal req={historicoReq} onClose={() => setHistoricoReq(null)} />}

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Oficialização</h2>
          <p className="text-sm text-slate-500">Oficialize o cancelamento enviando os clientes para Concluído.</p>
        </div>

        {/* Barra flutuante de seleção */}
        {selectedIds.size > 0 && (
          <div className="sticky top-2 z-30 bg-slate-900 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg">
            <span className="text-sm font-medium">{selectedIds.size} cliente(s) selecionado(s)</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleVoltarExecucao}
                disabled={processing}
                variant="outline"
                className="border-slate-300 text-slate-800 hover:bg-slate-100 gap-1.5 text-xs"
              >
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                Voltar para Execução
              </Button>
              <Button
                size="sm"
                onClick={handleOficializar}
                disabled={processing}
                className="bg-green-500 hover:bg-green-600 text-white gap-1.5 text-xs"
              >
                {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Stamp className="w-3.5 h-3.5" />}
                Confirmar Oficialização
              </Button>
              <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-white ml-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : pending.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-300" />
            <p className="font-medium">Nenhum cancelamento aguardando oficialização.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {/* Cabeçalho com selecionar todos */}
            <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-slate-300 cursor-pointer"
              />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Selecionar todos ({pending.length})
              </span>
              <span className="ml-auto text-xs text-slate-400">
                {prontos.length} pronto(s) · {forcados.length} com pendência(s)
              </span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
              {/* Prontos primeiro */}
              {prontos.map(req => renderRow(req, false))}
              {/* Forçados destacados no final */}
              {forcados.map(req => renderRow(req, true))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}