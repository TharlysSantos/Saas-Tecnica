import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, Upload, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { mesesParaTexto, gerarOpcoes, textoParaMeses } from "./TempoAssinatura";

function PlanoAuxiliarField({ label, value, onSave, planos }) {
  const [saving, setSaving] = useState(false);

  const handleSave = async (newValue) => {
    setSaving(true);
    await onSave(newValue);
    setSaving(false);
  };

  return (
    <div className="rounded-lg px-3 py-2 border-2 border-blue-300 bg-blue-50 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">{label}</p>
      <Select value={value || ""} onValueChange={handleSave} disabled={saving}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Selecione um plano..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>Nenhum</SelectItem>
          {planos.map((p) => (
            <SelectItem key={p.id} value={p.nome}>{p.nome} ({p.marca})</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EditField({ label, value, onSave, type = "number", highlight = true }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(type === "number" ? (val === "" ? null : Number(val)) : val);
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div
        className={`rounded-lg px-3 py-2 border-2 cursor-pointer transition-all group ${
          highlight
            ? "border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100/50"
            : "border-slate-200 bg-white hover:border-slate-300"
        }`}
        onClick={() => { setVal(value ?? ""); setEditing(true); }}
        title="Clique para editar"
      >
        <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold mb-0.5 flex items-center gap-1">
          {label}
          <span className="text-[8px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">✎ editar</span>
        </p>
        <p className="text-sm font-semibold text-slate-800">{value != null && value !== "" ? value : <span className="italic text-slate-400">—</span>}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg px-3 py-2 border-2 border-blue-500 bg-blue-50 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">{label}</p>
      <Input
        type={type}
        value={val}
        autoFocus
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        className="h-7 text-sm"
      />
      <div className="flex gap-1">
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-6 px-2 text-xs">Cancelar</Button>
      </div>
    </div>
  );
}

function DateField({ label, value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(val || null);
    setSaving(false);
    setEditing(false);
  };

  const display = value
    ? new Date(value + "T00:00:00").toLocaleDateString("pt-BR")
    : null;

  if (!editing) {
    return (
      <div
        className="rounded-lg px-3 py-2 border-2 border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100/50 cursor-pointer transition-all group"
        onClick={() => { setVal(value ?? ""); setEditing(true); }}
      >
        <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold mb-0.5 flex items-center gap-1">
          {label}
          <span className="text-[8px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">✎ editar</span>
        </p>
        <p className="text-sm font-semibold text-slate-800">{display || <span className="italic text-slate-400">—</span>}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg px-3 py-2 border-2 border-blue-500 bg-blue-50 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">{label}</p>
      <Input type="date" value={val} autoFocus onChange={(e) => setVal(e.target.value)} className="h-7 text-sm" />
      <div className="flex gap-1">
        <Button size="sm" onClick={handleSave} disabled={saving} className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1">
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-6 px-2 text-xs">Cancelar</Button>
      </div>
    </div>
  );
}

function TempoAssinaturaField({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const opcoes = gerarOpcoes();
  const display = mesesParaTexto(value);
  const filtradas = input.trim()
    ? opcoes.filter(o => o.label.toLowerCase().includes(input.toLowerCase()) || String(o.meses).startsWith(input))
    : opcoes.slice(0, 20);

  const handleSave = async (meses) => {
    setSaving(true);
    await onSave(meses);
    setSaving(false);
    setEditing(false);
    setInput("");
  };

  if (!editing) {
    return (
      <div
        className="rounded-lg px-3 py-2 border-2 border-blue-300 bg-blue-50 hover:border-blue-400 hover:bg-blue-100/50 cursor-pointer transition-all group"
        onClick={() => { setInput(""); setEditing(true); }}
        title="Clique para editar"
      >
        <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold mb-0.5 flex items-center gap-1">
          Tempo de Assinatura
          <span className="text-[8px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">✎ editar</span>
        </p>
        <p className="text-sm font-semibold text-slate-800">{display || <span className="italic text-slate-400">—</span>}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg px-3 py-2 border-2 border-blue-500 bg-blue-50 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Tempo de Assinatura</p>
      <Input
        autoFocus
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Ex: 1, 12, 1 ano e 6 meses..."
        className="h-7 text-sm"
      />
      <div className="max-h-36 overflow-y-auto border border-blue-200 rounded-md bg-white divide-y divide-slate-100">
        {filtradas.map(o => (
          <button
            key={o.meses}
            type="button"
            disabled={saving}
            onClick={() => handleSave(o.meses)}
            className="w-full text-left px-3 py-1.5 text-sm hover:bg-blue-50 transition-colors"
          >
            {o.label}
          </button>
        ))}
        {filtradas.length === 0 && (
          <p className="px-3 py-2 text-xs text-slate-400 italic">Nenhuma opção</p>
        )}
      </div>
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)} className="h-6 px-2 text-xs">Cancelar</Button>
      </div>
    </div>
  );
}

function TermoField({ requestId, possui_termo, link_termo, onSaved }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.RetentionRequest.update(requestId, { possui_termo: true, link_termo: file_url });
    onSaved?.({ possui_termo: true, link_termo: file_url });
    toast.success("Termo enviado!");
    setUploading(false);
  };

  return (
    <div className="rounded-lg px-3 py-2 border-2 border-blue-300 bg-blue-50 space-y-2">
      <p className="text-[10px] uppercase tracking-wider text-blue-600 font-semibold">Possui Termo?</p>
      <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
        {possui_termo ? "✓ Sim" : <span className="italic text-slate-400">Não</span>}
        {link_termo && (
          <a href={link_termo} target="_blank" rel="noreferrer" className="text-blue-500 underline text-xs flex items-center gap-1">
            Ver arquivo <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </p>
      <label className={`flex items-center gap-1.5 cursor-pointer text-xs px-2 py-1 rounded border border-blue-300 bg-white hover:bg-blue-50 w-fit transition-colors ${uploading ? "opacity-60 cursor-not-allowed" : ""}`}>
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-blue-600" />}
        {uploading ? "Enviando..." : "Upload do Termo"}
        <input type="file" className="hidden" disabled={uploading} onChange={handleUpload} accept=".pdf,.doc,.docx,.png,.jpg" />
      </label>
    </div>
  );
}

export default function TriagemFields({ data, requestId, onSaved }) {
  const [planos, setPlanos] = useState([]);
  const [loading, setLoading] = useState(true);
  const save = async (field, value) => {
    await base44.entities.RetentionRequest.update(requestId, { [field]: value });
    onSaved?.({ [field]: value });
  };

  useEffect(() => {
    base44.entities.PlanoAuxiliar.filter({ ativo: true }, "nome", 200)
      .then((p) => { setPlanos(p); setLoading(false); })
      .catch(() => { setPlanos([]); setLoading(false); });
  }, []);

  return (
    <div className="mt-3 rounded-xl border-2 border-blue-200 bg-blue-50/30 p-4 space-y-3">
      <p className="text-[10px] uppercase tracking-wider text-blue-700 font-bold flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
        Campos de Triagem — clique para editar
      </p>
      <div className="grid grid-cols-2 gap-3">
        {loading ? (
          <div className="h-8 bg-blue-100 rounded animate-pulse" />
        ) : (
          <PlanoAuxiliarField label="Plano Auxiliar" value={data.plano_auxiliar} onSave={(v) => save("plano_auxiliar", v)} planos={planos} />
        )}
        <EditField label="Qtde Funcionários" value={data.qtde_funcionarios} type="number" onSave={(v) => save("qtde_funcionarios", v)} />
        <TempoAssinaturaField value={data.tempo_contrato} onSave={(v) => save("tempo_contrato", v)} />
        {data.possui_multa === "sim" && (
          <EditField label="Ciclos Faltantes" value={data.ciclos_faltantes} type="number" onSave={(v) => save("ciclos_faltantes", v)} />
        )}
        <DateField label="Data Opcional p/ Cancelamento" value={data.data_ex_assinante} onSave={(v) => save("data_ex_assinante", v)} />
        <div className="col-span-2">
          <TermoField
            requestId={requestId}
            possui_termo={data.possui_termo}
            link_termo={data.link_termo}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  );
}