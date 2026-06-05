import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DuvidaResponseForm({ data, onChange, currentUser }) {
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);

  const buildTemplate = () => {
    const solicitante = data.solicitante || "Cliente";
    const analista = currentUser?.full_name || "nosso atendimento";
    return `Olá, ${solicitante}! 👋

Segue retorno sobre a dúvida questionada.

[Insira aqui a resposta para a dúvida]

Fico à disposição para um maior esclarecimento. 😊

Atenciosamente,
${analista}`;
  };

  useEffect(() => {
    if (!emailBody) {
      setEmailBody(buildTemplate());
    }
  }, []);

  const handleSend = async () => {
    if (!emailBody.trim()) {
      toast.error("Corpo do e-mail não pode estar vazio");
      return;
    }
    setSending(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: `Retorno sobre sua dúvida — ${data.razao_social}`,
        body: emailBody,
      });
      toast.success("E-mail de resposta enviado com sucesso!");
      // Salvar no histórico de comunicações
      await base44.entities.Comunicacao.create({
        request_id: data.id,
        tipo_template: "duvida",
        canal: "email",
        destinatario: data.email,
        assunto: `Retorno sobre sua dúvida — ${data.razao_social}`,
        corpo: emailBody,
        status_envio: "enviado",
        autor_nome: currentUser?.full_name || "Sistema",
        autor_email: currentUser?.email || "",
      });
      // Marcar como concluído automaticamente
      await base44.entities.RetentionRequest.update(data.id, {
        status_processo: "concluido",
      });
      toast.success("Dúvida respondida e processo finalizado! ✅");
    } catch (error) {
      toast.error("Erro ao enviar e-mail");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
          <Mail className="w-4 h-4" /> Resposta para Dúvida do Cliente
        </p>
        <p className="text-xs text-blue-600 mt-1">Responda a dúvida e envie por e-mail ao cliente.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Corpo do E-mail</label>
          <button
            type="button"
            onClick={() => setEmailBody(buildTemplate())}
            className="text-xs text-blue-500 hover:text-blue-700 underline"
          >
            🔄 Restaurar template
          </button>
        </div>
        <Textarea
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          className="text-sm min-h-48"
          placeholder="Edite o template com sua resposta para a dúvida..."
        />
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button
          onClick={handleSend}
          disabled={sending}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8"
          size="sm"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
          Enviar Resposta
        </Button>
        <p className="text-xs text-slate-500">Para: <span className="font-medium">{data.email}</span></p>
      </div>
    </div>
  );
}