import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SemRetornoEmailForm({ req, analyistName, analyistEmail }) {
  const [emailBody, setEmailBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const template = `Olá, ${req.solicitante} 👋

Tudo bem? Sou ${analyistName}, faço parte do time de Sucesso do Cliente da Área do Assinante da D-SAAS. 📞

Recebemos sua solicitação de cancelamento; porém, ao realizarmos a tentativa de contato através do telefone ${req.telefone}, não obtivemos sucesso. 😔

Para dar andamento ao processo de cancelamento da sua assinatura de forma segura e alinhada, o contato telefônico é uma etapa importante, pois nos permite confirmar algumas informações, esclarecer possíveis dúvidas e garantir que todo o processo ocorra corretamente, sem impactos futuros. ✅

Por gentileza, poderia nos retornar informando:

📱 Um telefone atualizado para contato; e
🕐 O melhor horário para falarmos com você?

Assim que recebermos seu retorno, priorizaremos o contato para dar sequência ao atendimento. 🚀

Caso prefira, você também pode entrar em contato diretamente conosco pelo telefone (11) 5199-1999 ramal 4015. 📲

Atenciosamente,
${analyistName}
D-SAAS - Sucesso do Cliente`;
    setEmailBody(template);
  }, [req.solicitante, analyistName, req.telefone]);

  const handleSend = async () => {
    if (!emailBody.trim()) {
      toast.error("Preencha o email antes de enviar");
      return;
    }
    if (!req.email) {
      toast.error("Email do cliente não está preenchido");
      return;
    }

    setSending(true);
    try {
      await base44.functions.invoke("enviarEmailSemRetorno", {
        to: req.email,
        destinatario: req.solicitante,
        subject: `Confirmação de contato - ${req.razao_social}`,
        body: emailBody,
        analyistName: analyistName,
        analyistEmail: analyistEmail,
        requestId: req.id,
      });
      toast.success("Email registrado com sucesso! Salvo para envio manual. ✉️");
    } catch (e) {
      toast.error("Erro ao registrar email: " + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-red-700 uppercase tracking-wider">📧 Email para o Cliente</span>
      </div>
      <textarea
        value={emailBody}
        onChange={(e) => setEmailBody(e.target.value)}
        className="w-full h-48 p-2 text-xs border border-red-200 rounded-md font-mono bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-red-400"
      />
      <Button
        size="sm"
        onClick={handleSend}
        disabled={sending}
        className="w-full h-8 text-xs gap-1.5 bg-red-600 hover:bg-red-700 text-white"
      >
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "📧"}
        {sending ? "Enviando..." : "Enviar Email"}
      </Button>
    </div>
  );
}