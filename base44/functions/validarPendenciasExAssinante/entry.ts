import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const VINDI_API_KEY = Deno.env.get('VINDI_API_KEY');

async function vindiGet(path) {
  const res = await fetch(`https://api.vindi.com.br/v1${path}`, {
    headers: { 'Authorization': `Bearer ${VINDI_API_KEY}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Vindi API error: ${res.status}`);
  return res.json();
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day);
}

async function verificarPendenciasCliente(customerId) {
  try {
    const billsRes = await vindiGet(`/customers/${customerId}/bills?status=open,overdue&per_page=100`);
    const bills = billsRes.bills || [];
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const pendenciasVencidas = bills.filter(b => {
      const vencimento = parseDate(b.due_at);
      return vencimento && vencimento < hoje;
    });
    
    const pendenciasAVencer = bills.filter(b => {
      const vencimento = parseDate(b.due_at);
      return vencimento && vencimento >= hoje;
    });
    
    return {
      temPendenciaVencida: pendenciasVencidas.length > 0,
      temPendenciaAVencer: pendenciasAVencer.length > 0,
      totalPendencias: bills.length,
      bills: bills,
    };
  } catch (e) {
    console.error(`Erro ao verificar pendências do cliente ${customerId}:`, e.message);
    return null;
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Busca todos os casos em processo_finalizado (Ex-Assinante stage)
    const exAssinanteCases = await base44.entities.RetentionRequest.filter({
      status_processo: 'processo_finalizado'
    }, '-updated_date', 500);

    const resultados = [];

    for (const request of exAssinanteCases) {
      try {
        // Tenta obter o customer_id
        let customerId = request.vindi_customer_id 
          || request.vindi_data?.customer_id
          || request.vindi_data?.customer?.id;

        if (!customerId) {
          resultados.push({
            id: request.id,
            razao_social: request.razao_social,
            status: 'erro',
            motivo: 'Sem customer_id na Vindi',
          });
          continue;
        }

        // Verifica pendências
        const pendencias = await verificarPendenciasCliente(customerId);
        
        if (!pendencias) {
          resultados.push({
            id: request.id,
            razao_social: request.razao_social,
            status: 'erro',
            motivo: 'Erro ao buscar pendências na Vindi',
          });
          continue;
        }

        // Lógica de atualização de status
        let novoStatus = request.status_store;
        const inadimplente = pendencias.temPendenciaVencida || pendencias.temPendenciaAVencer;
        const novoInadimplente = inadimplente ? 'sim' : 'nao';

        // Se estava adimplente e tem pendência vencida -> bloqueado
        if (request.inadimplente !== 'sim' && inadimplente) {
          novoStatus = 'bloqueado';
        }
        // Se estava bloqueado (inadimplente) e ficou adimplente -> reprocessar
        else if (request.inadimplente === 'sim' && !inadimplente) {
          novoStatus = 'reprocessar';
        }
        // Se não tem pendência -> ex_assinante
        else if (!inadimplente) {
          novoStatus = 'ex_assinante';
        }
        // Se tem pendência e já estava bloqueado -> mantém bloqueado
        else if (inadimplente && request.status_store === 'bloqueado') {
          novoStatus = 'bloqueado';
        }

        // Atualiza o registro se houve mudança
        if (novoStatus !== request.status_store || novoInadimplente !== request.inadimplente) {
          await base44.entities.RetentionRequest.update(request.id, {
            status_store: novoStatus,
            inadimplente: novoInadimplente,
          });

          resultados.push({
            id: request.id,
            razao_social: request.razao_social,
            status: 'atualizado',
            statusAnterior: request.status_store,
            novoStatus: novoStatus,
            inadimplementeAnterior: request.inadimplente,
            novoInadimplente: novoInadimplente,
            temPendencia: inadimplente,
          });
        } else {
          resultados.push({
            id: request.id,
            razao_social: request.razao_social,
            status: 'sem_mudanca',
            statusAtual: novoStatus,
            inadimplementeAtual: novoInadimplente,
          });
        }
      } catch (err) {
        resultados.push({
          id: request.id,
          razao_social: request.razao_social,
          status: 'erro',
          motivo: err.message,
        });
      }
    }

    return Response.json({
      processados: exAssinanteCases.length,
      resultados: resultados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});