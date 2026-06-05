import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Search, Phone, Mail, AlertTriangle, Clock, CheckCheck, X } from "lucide-react";
import EnvioDoTermo from "../components/retention/EnvioDoTermo";
import WorkflowBoard from "../components/retention/WorkflowBoard";
import { toast } from "sonner";

const formatSP = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
};

const isOverdue = (date) => date && new Date(date) < new Date() && !isToday(date);
const isToday = (date) => {
  if (!date) return false;
  return new Date(date).toDateString() === new Date().toDateString();
};

export default function Actions() {
  const [searchParams] = useSearchParams();
  const subPage = searchParams.get("sub") || "workflow";
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [marking, setMarking] = useState(false);
  const queryClient = useQueryClient();

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["actions-with-proximo-contato"],
    queryFn: () => base44.entities.RequestAction.list("-data_proximo_contato", 500),
  });

  const { data: requests = [] } = useQuery({
    queryKey: ["retention-requests-map"],
    queryFn: () => base44.entities.RetentionRequest.list("-created_date", 200),
  });

  const requestMap = {};
  requests.forEach((r) => { requestMap[r.id] = r; });

  const withContato = actions.filter((a) => !!a.data_proximo_contato);

  const latestByRequest = {};
  withContato.forEach((a) => {
    if (!latestByRequest[a.request_id]) latestByRequest[a.request_id] = a;
  });

  let items = Object.values(latestByRequest);

  if (search) {
    items = items.filter((a) => {
      const req = requestMap[a.request_id];
      return (
        req?.razao_social?.toLowerCase().includes(search.toLowerCase()) ||
        req?.cnpj?.includes(search) ||
        a.descricao?.toLowerCase().includes(search.toLowerCase())
      );
    });
  }

  items.sort((a, b) => new Date(a.data_proximo_contato) - new Date(b.data_proximo_contato));

  const overdue = items.filter((a) => isOverdue(a.data_proximo_contato));
  const today = items.filter((a) => isToday(a.data_proximo_contato));
  const future = items.filter((a) => !isOverdue(a.data_proximo_contato) && !isToday(a.data_proximo_contato));

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((a) => a.id)));
    }
  };

  const clearSelection = () => setSelected(new Set());

  const handleMarkDone = async () => {
    setMarking(true);
    const me = await base44.auth.me().catch(() => null);
    const selectedActions = items.filter((a) => selected.has(a.id));

    await Promise.all(
      selectedActions.map((a) =>
        base44.entities.RequestAction.create({
          request_id: a.request_id,
          descricao: "Contato realizado (marcado em lote)",
          canal: a.canal || "telefone",
          autor_nome: me?.full_name || "",
          autor_email: me?.email || "",
        })
      )
    );

    toast.success(`${selected.size} contato(s) marcado(s) como realizado!`);
    setSelected(new Set());
    setMarking(false);
    queryClient.invalidateQueries({ queryKey: ["actions-with-proximo-contato"] });
  };

  const ActionCard = ({ action }) => {
    const req = requestMap[action.request_id];
    const overdueFl = isOverdue(action.data_proximo_contato);
    const todayFl = isToday(action.data_proximo_contato);
    const isChecked = selected.has(action.id);

    return (
      <div
        onClick={() => toggleSelect(action.id)}
        className={`bg-white rounded-xl border p-4 space-y-3 cursor-pointer transition-all ${
          isChecked ? "border-blue-400 ring-2 ring-blue-200 bg-blue-50/20" :
          overdueFl ? "border-red-200 bg-red-50/30 hover:border-red-300" :
          todayFl ? "border-amber-200 bg-amber-50/30 hover:border-amber-300" :
          "border-slate-200 hover:border-slate-300"
        }`}
      >
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isChecked}
            onCheckedChange={() => toggleSelect(action.id)}
            onClick={(e) => e.stopPropagation()}
            className="mt-0.5 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{req?.razao_social || "—"}</p>
                <p className="text-xs text-slate-400">{req?.cnpj}</p>
              </div>
              {action.canal === "telefone" ? (
                <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  <Phone className="w-3 h-3" /> Telefone
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  <Mail className="w-3 h-3" /> E-mail
                </span>
              )}
            </div>

            <p className="text-sm text-slate-600 line-clamp-2 mt-2">{action.descricao}</p>

            <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg w-fit mt-2 ${
              overdueFl ? "bg-red-100 text-red-700" :
              todayFl ? "bg-amber-100 text-amber-700" :
              "bg-blue-50 text-blue-600"
            }`}>
              {overdueFl ? <AlertTriangle className="w-3.5 h-3.5" /> : todayFl ? <Clock className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
              {formatSP(action.data_proximo_contato)}
            </div>

            {action.autor_nome && (
              <p className="text-[11px] text-slate-400 mt-1">Registrado por: {action.autor_nome}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const Section = ({ title, items: sectionItems, emptyMsg, colorClass }) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className={`text-sm font-semibold ${colorClass}`}>{title}</h2>
        <Badge className="bg-slate-100 text-slate-600 text-[10px]">{sectionItems.length}</Badge>
      </div>
      {sectionItems.length === 0 ? (
        <p className="text-sm text-slate-400 italic">{emptyMsg}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sectionItems.map((a) => <ActionCard key={a.id} action={a} />)}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Contatos */}
      {subPage === "contatos" && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Contatos</h1>
              <p className="text-sm text-slate-500 mt-1">Próximos contatos agendados com clientes</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={toggleSelectAll} className="gap-2 text-slate-600">
                <CheckCheck className="w-4 h-4" />
                {selected.size === items.length && items.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
              </Button>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input placeholder="Buscar empresa ou CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
          </div>

          {selected.size > 0 && (
            <div className="sticky top-4 z-30 flex items-center justify-between bg-slate-900 text-white rounded-xl px-5 py-3 shadow-lg">
              <span className="text-sm font-medium">{selected.size} ação(ões) selecionada(s)</span>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleMarkDone} disabled={marking} className="bg-green-500 hover:bg-green-600 text-white gap-2">
                  <CheckCheck className="w-4 h-4" />
                  {marking ? "Marcando..." : "Marcar como Realizado"}
                </Button>
                <button onClick={clearSelection} className="text-slate-400 hover:text-white ml-2"><X className="w-4 h-4" /></button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-36 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-10">
              <Section title="⚠️ Atrasados" items={overdue} emptyMsg="Nenhuma ação atrasada." colorClass="text-red-600" />
              <Section title="📅 Hoje" items={today} emptyMsg="Nenhuma ação para hoje." colorClass="text-amber-600" />
              <Section title="🔜 Próximos" items={future} emptyMsg="Nenhuma ação futura agendada." colorClass="text-blue-600" />
            </div>
          )}
        </>
      )}

      {/* Oficializar Cancelamento */}
      {subPage === "oficializar" && <EnvioDoTermo />}

      {/* Workflow */}
      {subPage === "workflow" && <WorkflowBoard />}
    </div>
  );
}