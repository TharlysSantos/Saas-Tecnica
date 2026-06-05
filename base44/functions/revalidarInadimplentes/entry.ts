import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VINDI_BASE = 'https://sandbox-app.vindi.com.br/api/v1';

function vindiHeaders() {
  const key = Deno.env.get('VINDI_API_KEY');
  const encoded = btoa(`${key}:`);
  return {
    'Authorization': `Basic ${encoded}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

async function vindiGet(path) {
  const res = await fetch(`${VINDI_BASE}${path}`, { headers: vindiHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.errors?.[0]?.message || `Vindi error ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Busca todos os cancelamentos com inadimplente=sim e status_store=bloqueado
    const bloqueados = await base44.asServiceRole.entities.RetentionRequest.filter({
      request_type: 'cancelamento',
      inadimplente: 'sim',
      status_store: 'bloqueado',
    });

    if (!bloqueados || bloqueados.length === 0) {
      return Response.json({ message: 'Nenhum cliente bloqueado para revalidar.', reprocessados: 0 });
    }

    let reprocessados = 0;
    const detalhes = [];

    for (const req of bloqueados) {
      if (!req.id_assinatura) continue;

      try {
        // Busca assinatura na Vindi para obter customer_id
        const subData = await vindiGet(`/subscriptions/${req.id_assinatura}`);
        const customerId = subData?.subscription?.customer?.id;
        if (!customerId) continue;

        // Verifica faturas em aberto (pending, waiting, overdue)
        const billData = await vindiGet(
          `/bills?customer_id=${customerId}&status[]=pending&status[]=waiting&status[]=overdue&per_page=20`
        );
        const billsAberto = billData?.bills || [];

        if (billsAberto.length === 0) {
          // Cliente quitou pendência — mover para reprocessar
          await base44.asServiceRole.entities.RetentionRequest.update(req.id, {
            inadimplente: 'nao',
            status_store: 'reprocessar',
          });
          reprocessados++;
          detalhes.push({ id: req.id, razao_social: req.razao_social, acao: 'reprocessar' });
        } else {
          detalhes.push({ id: req.id, razao_social: req.razao_social, acao: 'mantido_bloqueado', bills_aberto: billsAberto.length });
        }
      } catch (e) {
        detalhes.push({ id: req.id, razao_social: req.razao_social, acao: 'erro', erro: e.message });
      }
    }

    return Response.json({
      message: `Revalidação concluída. ${reprocessados} cliente(s) liberado(s) para migração.`,
      total_verificados: bloqueados.length,
      reprocessados,
      detalhes,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});