import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Check, X, Search, PowerOff, Power } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { nome: "", familia: "", marca: "", multa: "NAO", produto_multa_id: "", produto_multa_nome: "" };

function Row({ plan, onEdit, onToggle }) {
  const inactive = plan.ativo === false;
  return (
    <tr className={`border-b border-slate-100 transition-colors ${inactive ? "opacity-50 bg-slate-50" : "hover:bg-slate-50"}`}>
      <td className="py-2.5 px-3 text-sm text-slate-800">{plan.nome}</td>
      <td className="py-2.5 px-3 text-sm text-slate-600">{plan.familia}</td>
      <td className="py-2.5 px-3 text-sm text-slate-600">{plan.marca}</td>
      <td className="py-2.5 px-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.multa === "SIM" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}>
          {plan.multa === "SIM" ? "Sim" : "Não"}
        </span>
      </td>
      <td className="py-2.5 px-3 text-sm text-slate-500">
        {plan.multa === "SIM" && (
          <span className={plan.produto_multa_id ? "text-green-700 font-medium text-xs" : "text-amber-600 text-xs"}>
            {plan.produto_multa_id ? `✅ ${plan.produto_multa_nome || `ID: ${plan.produto_multa_id}`}` : "⚠️ Não configurado"}
          </span>
        )}
      </td>
      <td className="py-2.5 px-3 text-right">
        <div className="flex justify-end gap-1">
          {!inactive && (
            <button onClick={() => onEdit(plan)} className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onToggle(plan)}
            title={inactive ? "Reativar" : "Inativar"}
            className={`p-1.5 rounded transition-colors ${inactive ? "hover:bg-green-50 text-slate-400 hover:text-green-600" : "hover:bg-orange-50 text-slate-400 hover:text-orange-600"}`}
          >
            {inactive ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
          </button>
        </div>
      </td>
    </tr>
  );
}

function EditRow({ plan, onSave, onCancel }) {
  const [form, setForm] = useState({ ...plan });
  const [produtos, setProdutos] = useState([]);
  const [loadingProd, setLoadingProd] = useState(false);
  const set = (k) => (v) => setForm(prev => ({ ...prev, [k]: v }));

  const carregarProdutos = async () => {
    setLoadingProd(true);
    try {
      const res = await base44.functions.invoke('vindiIntegration', { action: 'listar_produtos' });
      setProdutos(res.data?.produtos || []);
    } catch (e) {
      toast.error("Erro ao carregar produtos");
    }
    setLoadingProd(false);
  };

  return (
    <tr className="border-b border-blue-100 bg-blue-50/40">
      <td className="py-1.5 px-3"><Input value={form.nome} onChange={e => set("nome")(e.target.value)} className="h-7 text-sm" /></td>
      <td className="py-1.5 px-3"><Input value={form.familia} onChange={e => set("familia")(e.target.value)} className="h-7 text-sm" /></td>
      <td className="py-1.5 px-3"><Input value={form.marca} onChange={e => set("marca")(e.target.value)} className="h-7 text-sm" /></td>
      <td className="py-1.5 px-3">
        <Select value={form.multa} onValueChange={set("multa")}>
          <SelectTrigger className="h-7 text-sm w-20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="SIM">Sim</SelectItem>
            <SelectItem value="NAO">Não</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="py-1.5 px-3">
        {form.multa === "SIM" && (
          <div className="flex gap-1 items-center flex-wrap">
            {produtos.length > 0 ? (
              <select
                value={form.produto_multa_id || ""}
                onChange={e => {
                  const id = e.target.value;
                  const p = produtos.find(p => String(p.id) === id);
                  setForm(prev => ({ ...prev, produto_multa_id: id ? Number(id) : null, produto_multa_nome: p?.name || "" }));
                }}
                className="h-7 text-xs border border-slate-200 rounded px-1 bg-white min-w-32"
              >
                <option value="">Selecione...</option>
                {produtos.filter(p => p.status === 'active').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <button type="button" onClick={carregarProdutos} disabled={loadingProd}
                className="text-xs text-blue-500 hover:text-blue-700 underline">
                {loadingProd ? 'Carregando...' : 'Carregar produtos Vindi'}
              </button>
            )}
            {form.produto_multa_id && (
              <span className="text-[10px] text-green-700">✅ ID {form.produto_multa_id}</span>
            )}
          </div>
        )}
      </td>
      <td className="py-1.5 px-3 text-right">
        <div className="flex justify-end gap-1">
          <button onClick={() => onSave(form)} className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={onCancel} className="p-1.5 rounded hover:bg-slate-100 text-slate-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function PlanConfigs() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["plan-configs"],
    queryFn: () => base44.entities.PlanConfig.list("-created_date", 500),
  });

  const saveMutation = useMutation({
    mutationFn: (form) => form.id
      ? base44.entities.PlanConfig.update(form.id, form)
      : base44.entities.PlanConfig.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plan-configs"] });
      setEditing(null);
      toast.success("Plano salvo!");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (plan) => base44.entities.PlanConfig.update(plan.id, { ativo: plan.ativo === false ? true : false }),
    onSuccess: (_, plan) => {
      qc.invalidateQueries({ queryKey: ["plan-configs"] });
      toast.success(plan.ativo === false ? "Plano reativado!" : "Plano inativado!");
    },
  });

  const filtered = plans
    .filter(p => showInactive ? p.ativo === false : p.ativo !== false)
    .filter(p => !search || p.nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.marca?.toLowerCase().includes(search.toLowerCase()) ||
      p.familia?.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Buscar plano, marca ou família..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
            showInactive ? "bg-orange-50 border-orange-300 text-orange-700" : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
          }`}
        >
          {showInactive ? "Ver ativos" : "Ver inativos"}
        </button>
        {!showInactive && (
          <Button size="sm" onClick={() => setEditing(EMPTY)} disabled={editing !== null} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-3.5 h-3.5" /> Novo Plano
          </Button>
        )}
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Plano</th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Família</th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Marca</th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Multa</th>
              <th className="py-2.5 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Produto Multa (Vindi)</th>
              <th className="py-2.5 px-3" />
            </tr>
          </thead>
          <tbody>
            {editing && !editing.id && (
              <EditRow plan={editing} onSave={(f) => saveMutation.mutate(f)} onCancel={() => setEditing(null)} />
            )}
            {isLoading ? (
              <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">Nenhum plano encontrado.</td></tr>
            ) : filtered.map(plan =>
              editing?.id === plan.id
                ? <EditRow key={plan.id} plan={editing} onSave={(f) => saveMutation.mutate(f)} onCancel={() => setEditing(null)} />
                : <Row key={plan.id} plan={plan} onEdit={setEditing} onToggle={(p) => toggleMutation.mutate(p)} />
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">{filtered.length} plano(s) encontrado(s)</p>
    </div>
  );
}