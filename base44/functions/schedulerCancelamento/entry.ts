import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const VINDI_BASE = 'https://app.vindi.com.br/api/v1';

function vindiHeaders() {
  const key = Deno.env.get('VINDI_API_KEY');
  const encoded = btoa(`${key}:`);
  return {
    'Authorization': `Basic ${encoded}`,
    'Content-Type': 'application/json',
  };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Pode ser chamado pelo scheduler (sem user) ou por admin
  let user = null;
  try { user = await base44.auth.me(); } catch {}
  if (user && user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  const hoje = new Date();
  const hojeStr = hoje.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD

  // Busca solicitações com data_cancelamento_efetivo == hoje e status aguardando_cancelamento_vindi
  const solicitacoes = await base44.asServiceRole.entities.RetentionRequest.filter({
    data_cancelamento_efetivo: hojeStr,
    status_processo: 'aguardando_cancelamento_vindi',
    inadimplente: 'nao',
  });

  const resultados = [];

  for (const sol of solicitacoes) {
    if (!sol.id_assinatura) {
      resultados.push({ id: sol.id, status: 'pulado', motivo: 'Sem id_assinatura' });
      continue;
    }

    // Chama API Vindi para cancelar
    const res = await fetch(`${VINDI_BASE}/subscriptions/${sol.id_assinatura}`, {
      method: 'PUT',
      headers: vindiHeaders(),
      body: JSON.stringify({ status: 'canceled' }),
    });

    const data = await res.json();

    if (res.ok) {
      // Atualiza status para finalizado
      await base44.asServiceRole.entities.RetentionRequest.update(sol.id, {
        status_processo: 'processo_finalizado',
      });

      // Log
      await base44.asServiceRole.entities.Comunicacao.create({
        request_id: sol.id,
        tipo_template: 'cancelamento',
        canal: 'sistema',
        assunto: `Cancelamento automático executado - ${sol.razao_social}`,
        corpo: `Cancelamento agendado executado pelo scheduler em ${hojeStr}. Sub Vindi: ${sol.id_assinatura}`,
        status_envio: 'enviado',
        autor_nome: 'Sistema Automático',
        autor_email: 'sistema@d-saas.com.br',
      });

      resultados.push({ id: sol.id, razao_social: sol.razao_social, status: 'cancelado' });
    } else {
      resultados.push({ id: sol.id, razao_social: sol.razao_social, status: 'erro', detalhe: data?.errors?.[0]?.message });
    }
  }

  return Response.json({
    data_processamento: hojeStr,
    total_processados: solicitacoes.length,
    resultados,
  });
});