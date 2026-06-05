import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { to, destinatario, subject, body, analyistName, analyistEmail, requestId } = await req.json();

    if (!to || !subject || !body || !requestId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Registra a comunicação na base para rastreabilidade
    await base44.entities.Comunicacao.create({
      request_id: requestId,
      tipo_template: 'retencao',
      canal: 'email',
      destinatario: to,
      assunto: subject,
      corpo: body,
      status_envio: 'pendente',
      autor_nome: analyistName || user.full_name,
      autor_email: analyistEmail || user.email,
    });

    return Response.json({ success: true, message: 'Email salvo como pendente (enviar manualmente ou configurar RESEND_API_KEY para automático)' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});