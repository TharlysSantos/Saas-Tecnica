import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

async function vindiPut(path, body) {
  const res = await fetch(`${VINDI_BASE}${path}`, {
    method: 'PUT',
    headers: vindiHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.errors?.[0]?.message || `Vindi error ${res.status}`);
  return data;
}

Deno.serve(async (req) => {
  try {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, cnpj, subscription_id, justificativa, customer_id } = body;

  // Helper: processar dados de uma assinatura + cliente
  async function processarAssinatura(sub, customer) {
    const planName = sub.plan?.name || '';

    // Paraleliza: PlanConfig + product_items + inadimplência
    const [planConfigs, piData, billsOverdue] = await Promise.all([
      base44.asServiceRole.entities.PlanConfig.filter({ nome: planName }),
      vindiGet(`/subscriptions/${sub.id}/product_items`),
      sub.status !== 'past_due'
        ? vindiGet(`/bills?customer_id=${customer.id}&status[]=overdue&per_page=1`).catch(() => ({ bills: [] }))
        : Promise.resolve({ bills: [{ id: 'past_due' }] }),
    ]);

    // PlanConfig
    let marca = '', familia = '', possuiMulta = false;
    if (planConfigs && planConfigs.length > 0) {
      marca = planConfigs[0].marca || '';
      familia = planConfigs[0].familia || '';
      possuiMulta = (planConfigs[0].multa || '').toUpperCase() === 'SIM';
    }

    // Product items: soma todos os produtos recorrentes ativos da assinatura
    const productItems = piData.product_items || [];
    let valorMensal = productItems.reduce((acc, item) => {
      const preco = parseFloat(item.pricing_schema?.price) || 0;
      const qtd = parseInt(item.quantity) || 1;
      return acc + (preco * qtd);
    }, 0);

    // Fallback: valor do plano
    if (!valorMensal) {
      valorMensal = parseFloat(sub.plan?.price) || 0;
    }


    // Inadimplente
    const inadimplente = sub.status === 'past_due' || (billsOverdue.bills || []).length > 0;

    // Ciclos faturados
    let ciclosFaturados = sub.current_period?.cycle || sub.current_cycle?.cycle || 0;
    if (!ciclosFaturados && billsPagas) {
      ciclosFaturados = billsPagas.meta?.total_count || (billsPagas.bills || []).length;
    }

    // Tempo de contrato em meses
    const hoje = new Date();
    const dataInicio = sub.start_at ? new Date(sub.start_at) : null;
    const mesesContrato = dataInicio
      ? (hoje.getFullYear() - dataInicio.getFullYear()) * 12 + (hoje.getMonth() - dataInicio.getMonth())
      : 0;

    // Ciclos faltantes (baseado em end_at se existir)
    const dataFimContrato = sub.end_at ? new Date(sub.end_at) : null;
    let ciclosFaltantes = 0;
    if (dataFimContrato && dataFimContrato > hoje) {
      const diffDias = Math.ceil((dataFimContrato - hoje) / (1000 * 60 * 60 * 24));
      ciclosFaltantes = Math.ceil(diffDias / 30);
    }

    // Calcular data de cancelamento efetivo
    const proximaCobranca = sub.next_billing_at ? new Date(sub.next_billing_at) : null;

    function nearestStandardDay(deadlineDate) {
      const year = deadlineDate.getUTCFullYear();
      const month = deadlineDate.getUTCMonth();
      const maxDay = deadlineDate.getUTCDate() - 2;
      const candidates = [9, 19, 29].filter(d => d <= maxDay);
      if (candidates.length > 0) {
        return new Date(Date.UTC(year, month, candidates[candidates.length - 1]));
      }
      const pm = month - 1 < 0 ? 11 : month - 1;
      const py = month - 1 < 0 ? year - 1 : year;
      return new Date(Date.UTC(py, pm, 29));
    }

    let dataCancelamentoEfetivo = null;
    if (proximaCobranca) {
      if (possuiMulta) {
        dataCancelamentoEfetivo = nearestStandardDay(proximaCobranca).toISOString().split('T')[0];
      } else {
        const year = proximaCobranca.getUTCFullYear();
        const month = proximaCobranca.getUTCMonth();
        const day = proximaCobranca.getUTCDate();
        const secondBilling = new Date(Date.UTC(year, month + 1, day));
        dataCancelamentoEfetivo = nearestStandardDay(secondBilling).toISOString().split('T')[0];
      }
    }

    const valorMultaCalculado = ciclosFaltantes * valorMensal * 0.5;

    // Endereço
    const addr = customer.address || {};
    const endereco = [addr.street, addr.number, addr.additional_details].filter(Boolean).join(', ');
    const bairro = addr.neighborhood || '';
    const cidade = addr.city || '';
    const estado = addr.state || '';
    const cep = addr.zipcode || '';

    const ic = sub.interval_count;
    const condicaoPagamento = ic == 12 ? 'Anual' : 'Mensal';



    return {
      found: true,
      customer_id: customer.id,
      subscription: { id: sub.id, status: sub.status, plan: sub.plan, start_at: sub.start_at, end_at: sub.end_at, next_billing_at: sub.next_billing_at, interval_count: sub.interval_count, customer: { id: customer.id } },
      inadimplente,
      ciclos_faturados: ciclosFaturados,
      ciclos_faltantes: ciclosFaltantes,
      meses_contrato: mesesContrato,
      data_cancelamento_efetivo: dataCancelamentoEfetivo,
      valor_multa_calculado: valorMultaCalculado,
      valor_mensalidade: valorMensal,
      marca,
      familia,
      possui_multa: possuiMulta ? 'sim' : 'nao',
      endereco,
      bairro,
      cidade,
      estado,
      cep,
      condicao_pagamento: condicaoPagamento,
    };
  }

  // 1. Buscar por CNPJ/CPF — percorre TODAS as páginas sem filtro e filtra localmente
  if (action === 'buscar_por_cnpj') {
    const sanitized = cnpj.replace(/\D/g, '');
    const VALID_STATUSES = ['active', 'past_due', 'future'];

    // Passo 1: percorre páginas de customers sem filtro buscando cliente ATIVO com esse CNPJ
    // Tenta primeiro filtro por registry_code para reduzir páginas a percorrer
    // Busca todos os clientes com esse CNPJ — tenta query= primeiro (mais rápido)
    let todosClientes = [];
    const vistos = new Set();

    const addClientes = (lista) => {
      for (const cust of (lista || [])) {
        const registry = (cust.registry_code || '').replace(/\D/g, '');
        const doc = (cust.document || '').replace(/\D/g, '');
        if ((registry === sanitized || doc === sanitized) && !vistos.has(cust.id)) {
          vistos.add(cust.id);
          todosClientes.push(cust);
        }
      }
    };

    // 1ª tentativa: query=registry_code: (busca semântica rápida da Vindi)
    const [qSearch, rSearch, dSearch] = await Promise.all([
      vindiGet(`/customers?query=registry_code:${sanitized}&per_page=50`).catch(() => ({ customers: [] })),
      vindiGet(`/customers?registry_code=${sanitized}&per_page=50`).catch(() => ({ customers: [] })),
      vindiGet(`/customers?document=${sanitized}&per_page=50`).catch(() => ({ customers: [] })),
    ]);
    addClientes(qSearch.customers);
    addClientes(rSearch.customers);
    addClientes(dSearch.customers);

    // Fallback: paginação completa se não achou por nenhum filtro
    if (!todosClientes.length) {
      let page = 1;
      while (page <= 10) {
        const data = await vindiGet(`/customers?page=${page}&per_page=50`);
        const customers = data.customers || [];
        if (customers.length === 0) break;
        addClientes(customers);
        if (todosClientes.length > 0) break; // achou, para imediatamente
        page++;
      }
    }

    console.error('🔍 DEBUG buscar_por_cnpj:', { sanitized, clientes: todosClientes.map(c => ({ id: c.id, status: c.status })) });

    if (!todosClientes.length) return Response.json({ found: false, message: 'Cliente não encontrado na Vindi' });

    // Usa o primeiro cliente encontrado (prioriza active, depois qualquer um)
    const clienteAtivo = todosClientes.find(c => c.status === 'active') || todosClientes[0];

    // Passo 2: percorre páginas de subscriptions filtrando pelo customer_id do cliente encontrado
    const assinaturasEncontradas = [];
    let pageSub = 1;
    while (pageSub <= 10) {
      const dataSubs = await vindiGet(`/subscriptions?page=${pageSub}&per_page=50`);
      const subscriptions = dataSubs.subscriptions || [];
      if (subscriptions.length === 0) break;

      for (const sub of subscriptions) {
        if (
          sub.customer &&
          String(sub.customer.id) === String(clienteAtivo.id) &&
          VALID_STATUSES.includes(sub.status)
        ) {
          assinaturasEncontradas.push({ sub, customer: clienteAtivo });
        }
      }
      pageSub++;
    }

    console.error('🔍 DEBUG assinaturas encontradas:', assinaturasEncontradas.length);

    if (!assinaturasEncontradas.length) {
      return Response.json({
        found: true,
        customer: clienteAtivo,
        subscriptions: [],
        message: 'Nenhuma assinatura ativa encontrada para este CNPJ. Tente buscar pelo ID do cliente Vindi.',
        skip_customer_id: true
      });
    }

    if (assinaturasEncontradas.length === 1) {
      const { sub, customer } = assinaturasEncontradas[0];
      const fullSubData = await vindiGet(`/subscriptions/${sub.id}`);
      return Response.json(await processarAssinatura(fullSubData.subscription || sub, customer));
    }

    // Múltiplas assinaturas
    return Response.json({
      found: true,
      multiple: true,
      customer: clienteAtivo,
      subscriptions: assinaturasEncontradas.map(({ sub, customer }) => ({
        id: sub.id,
        plan_name: sub.plan?.name || 'Plano desconhecido',
        status: sub.status,
        start_at: sub.start_at,
        end_at: sub.end_at,
        customer_name: customer.name,
        customer_id: customer.id,
        amount: sub.plan?.price || null,
      }))
    });
  }

  // 1c. Buscar assinaturas de um customer_id específico (após seleção de cliente)
  if (action === 'buscar_por_customer_id') {
    const custResp = await vindiGet(`/customers/${customer_id}`);
    const customer = custResp.customer;
    if (!customer) return Response.json({ found: false, message: 'Cliente não encontrado' });

    const VALID_STATUSES = ['active', 'past_due', 'future'];
    const targetId = String(customer_id);

    // Percorre páginas filtrando SOMENTE assinaturas deste customer
    const assinaturasEncontradas = [];
    let pageSub = 1;
    while (pageSub <= 20) {
      const dataSubs = await vindiGet(`/subscriptions?page=${pageSub}&per_page=50&sort_by=created_at&sort_order=desc`);
      const subs = dataSubs.subscriptions || [];
      if (subs.length === 0) break;
      for (const sub of subs) {
        if (String(sub.customer?.id) === targetId && VALID_STATUSES.includes(sub.status)) {
          assinaturasEncontradas.push(sub);
        }
      }
      pageSub++;
    }

    if (!assinaturasEncontradas.length) return Response.json({ found: true, customer, subscriptions: [], message: 'Nenhuma assinatura ativa encontrada' });
    if (assinaturasEncontradas.length > 1) {
      return Response.json({ found: true, multiple: true, customer, subscriptions: assinaturasEncontradas.map(s => ({ id: s.id, plan_name: s.plan?.name || 'Plano desconhecido', status: s.status, start_at: s.start_at, end_at: s.end_at, customer_name: customer.name })) });
    }
    const fullSubData = await vindiGet(`/subscriptions/${assinaturasEncontradas[0].id}`);
    return Response.json(await processarAssinatura(fullSubData.subscription || assinaturasEncontradas[0], customer));
  }

  // 1b. Buscar por ID de assinatura diretamente
  if (action === 'buscar_por_id_assinatura') {
    if (!subscription_id) return Response.json({ found: false, message: 'ID de assinatura obrigatório' });
    const subData = await vindiGet(`/subscriptions/${subscription_id}`);
    const sub = subData.subscription;
    if (!sub) return Response.json({ found: false, message: 'Assinatura não encontrada' });

    // Paraleliza busca do cliente com processamento
    const custData = await vindiGet(`/customers/${sub.customer.id}`);
    const customer = custData.customer;

    return Response.json(await processarAssinatura(sub, customer));
  }

  // 2. Cancelar assinatura
  if (action === 'cancelar_assinatura') {
    if (!subscription_id) return Response.json({ error: 'subscription_id obrigatório' }, { status: 400 });

    // Verifica inadimplência antes de cancelar
    const subData = await vindiGet(`/subscriptions/${subscription_id}`);
    const sub = subData.subscription;
    const billData = await vindiGet(`/bills?customer_id=${sub.customer?.id}&status[]=pending&status[]=waiting`);
    const billsEmAberto = billData.bills || [];

    if (billsEmAberto.length > 0 && user.role !== 'admin') {
      return Response.json({
        error: 'BLOQUEIO: Cliente inadimplente. Apenas o usuário master pode forçar cancelamento.',
        inadimplente: true,
        bills: billsEmAberto,
      }, { status: 403 });
    }

    if (billsEmAberto.length > 0 && user.role === 'admin') {
      if (!justificativa) {
        return Response.json({ error: 'Justificativa obrigatória para forçar cancelamento com inadimplência.' }, { status: 400 });
      }
    }

    const result = await vindiPut(`/subscriptions/${subscription_id}`, { status: 'canceled' });

    // Log da operação
    await base44.asServiceRole.entities.Comunicacao.create({
      request_id: '',
      tipo_template: 'cancelamento',
      canal: 'sistema',
      assunto: `Cancelamento Vindi executado - Sub ${subscription_id}`,
      corpo: justificativa ? `Força cancelamento por admin. Justificativa: ${justificativa}` : 'Cancelamento executado via sistema.',
      status_envio: 'enviado',
      autor_nome: user.full_name,
      autor_email: user.email,
    });

    return Response.json({ success: true, subscription: result.subscription });
  }

  // 3. Listar faturas em aberto (pending, waiting, overdue)
  if (action === 'faturas_em_aberto') {
    const { cnpj, customer_id, bill_id_target } = body;
    
    if (customer_id) {
      const VALID_STATUSES = ['pending', 'overdue', 'waiting', 'scheduled'];
      const targetId = String(customer_id);
      let allBills = [];
      let page = 1;
      let foundCustomer = false;
      let done = false;

      while (!done) {
        const billData = await vindiGet(`/bills?customer_id=${customer_id}&per_page=50&page=${page}&sort_by=id&sort_order=desc`);
        const pageBills = billData.bills || [];
        if (!pageBills.length) break;

        for (const bill of pageBills) {
          const billCustomerId = String(bill.customer?.id || '');
          if (billCustomerId === targetId) {
            foundCustomer = true;
            allBills.push(bill);
          } else if (foundCustomer) {
            // Bloco do cliente terminou — para tudo
            done = true;
            break;
          }
        }

        if (pageBills.length < 50) break; // última página
        page++;
      }

      const bills = allBills
        .filter(b => VALID_STATUSES.includes(b.status) && !(b.status === 'pending' && !b.due_at))
        .map(b => ({
          id: b.id,
          status: b.status,
          due_at: b.due_at,
          amount: b.amount,
          url: b.url || null,
          subscription_id: b.subscription?.id || null,
          customer_id: targetId,
        }));

      return Response.json({ bills, found: bills.length > 0, total: bills.length });
    }
    
    if (cnpj) {
      // Sanitiza CNPJ
      const sanitized = cnpj.replace(/\D/g, '');
      
      // Se passou bill_id_target, busca direto essa fatura para descobrir qual customer
      if (bill_id_target) {
        const targetBillData = await vindiGet(`/bills/${bill_id_target}`);
        const targetBill = targetBillData.bill;
        if (!targetBill) {
          return Response.json({ bills: [], found: false, message: `Fatura ${bill_id_target} não encontrada` });
        }
        const targetCustomerId = targetBill.customer?.id;
        return Response.json({
          bills: [{
            id: targetBill.id,
            status: targetBill.status,
            due_at: targetBill.due_at,
            amount: targetBill.amount,
            url: targetBill.url || null,
            subscription_id: targetBill.subscription?.id || null,
            customer_id: targetCustomerId,
            customer_name: targetBill.customer?.name,
          }],
          found: true,
          total: 1
        });
      }
      
      // Primeiro, tenta encontrar uma assinatura ATIVA por CNPJ
      // Isso resolve o problema de múltiplos clientes com o mesmo CNPJ
      const custData = await vindiGet(`/customers?document=${sanitized}&per_page=100`).catch(() => ({ customers: [] }));
      let targetCustomers = (custData.customers || []).filter(c => (c.document || '').replace(/\D/g, '') === sanitized);
      
      // Se não encontrou por document, tenta por registry_code
      if (targetCustomers.length === 0) {
        const custData2 = await vindiGet(`/customers?registry_code=${sanitized}&per_page=100`).catch(() => ({ customers: [] }));
        targetCustomers = (custData2.customers || []).filter(c => (c.registry_code || '').replace(/\D/g, '') === sanitized);
      }

      if (targetCustomers.length === 0) {
        return Response.json({ bills: [], found: false, message: 'Nenhum cliente encontrado com esse CNPJ' });
      }

      // Busca faturas de TODOS os clientes com esse CNPJ
      const allBills = [];
      for (const cust of targetCustomers) {
        const billData = await vindiGet(`/bills?customer_id=${cust.id}&per_page=100&sort_by=due_at&sort_order=asc`);
        const custBills = (billData.bills || [])
          .filter(b => ['pending', 'waiting', 'overdue'].includes(b.status))
          .map(b => ({
            id: b.id,
            status: b.status,
            due_at: b.due_at,
            amount: b.amount,
            url: b.url || null,
            subscription_id: b.subscription?.id || null,
            customer_id: cust.id,
            customer_name: cust.name,
          }));
        allBills.push(...custBills);
      }

      // Remove duplicatas por bill ID
      const uniqueBills = Array.from(new Map(allBills.map(b => [b.id, b])).values());

      return Response.json({ 
        bills: uniqueBills, 
        found: uniqueBills.length > 0, 
        total: uniqueBills.length,
        customers_found: targetCustomers.length
      });
    }

    return Response.json({ bills: [], found: false, message: 'CNPJ ou customer_id obrigatório' });
  }

  // 3b. Buscar fatura específica por ID
  if (action === 'buscar_fatura_por_id') {
    const { bill_id } = body;
    if (!bill_id) return Response.json({ error: 'bill_id obrigatório' }, { status: 400 });

    const billData = await vindiGet(`/bills/${bill_id}`);
    const bill = billData.bill;

    if (!bill) return Response.json({ found: false, message: 'Fatura não encontrada' });

    return Response.json({
      found: true,
      bill: {
        id: bill.id,
        status: bill.status,
        due_at: bill.due_at,
        amount: bill.amount,
        url: bill.url || null,
        subscription_id: bill.subscription?.id || null,
        customer_id: bill.customer?.id || null,
        customer_name: bill.customer?.name || null,
      }
    });
  }

  // 4. Listar produtos cadastrados na Vindi
  if (action === 'listar_produtos') {
    const prodData = await vindiGet(`/products?per_page=50&sort_by=name&sort_order=asc`);
    const produtos = (prodData.products || []).map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      status: p.status,
      pricing: p.pricing_schema?.price,
    }));
    return Response.json({ produtos });
  }

  // 5. Agendar multa contratual como cobrança avulsa
  if (action === 'agendar_multa') {
    const { valor_multa, product_id, payment_method_code, due_at, billing_at } = body;

    const pmCode = payment_method_code || 'bank_slip_itau_shopline';
    const dueDateStr = due_at || (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; })();
    const billingDateStr = billing_at || new Date().toISOString().split('T')[0];

    console.log('agendar_multa customer_id recebido:', customer_id, '| billing_at:', billingDateStr, '| due_at:', dueDateStr);

    const billPayload = {
      customer_id: Number(customer_id),
      payment_method_code: pmCode,
      due_at: dueDateStr,
      billing_at: billingDateStr,
      bill_items: [{
        product_id,
        amount: valor_multa,
        description: 'Multa contratual',
      }],
    };

    if (!billPayload.customer_id) return Response.json({ error: 'customer_id obrigatório' }, { status: 400 });
    if (!billPayload.bill_items[0].product_id) return Response.json({ error: 'product_id obrigatório' }, { status: 400 });
    if (!billPayload.bill_items[0].amount) return Response.json({ error: 'valor_multa obrigatório' }, { status: 400 });

    console.log('agendar_multa payload:', JSON.stringify(billPayload));
    const res2 = await fetch(`${VINDI_BASE}/bills`, {
      method: 'POST',
      headers: vindiHeaders(),
      body: JSON.stringify(billPayload),
    });
    const billData = await res2.json();
    console.log('agendar_multa response:', res2.status, JSON.stringify(billData));

    // Vindi retorna 201 mesmo com bill criada - trata sucesso mesmo que haja campos extras com erro
    const bill = billData.bill;
    if ((res2.status === 200 || res2.status === 201) && bill?.id) {
      return Response.json({
        success: true,
        bill_id: bill.id,
        due_at: bill.due_at,
        url: bill.url || null,
        amount: bill.amount,
        customer_id: bill.customer?.id,
        customer_name: bill.customer?.name,
      });
    }

    if (!res2.ok) {
      const errMsg = billData?.errors?.map(e => e.message).join('; ') || JSON.stringify(billData) || `Vindi error ${res2.status}`;
      throw new Error(errMsg);
    }
  }

  // 6. Adicionar observação/nota na assinatura da Vindi
  if (action === 'adicionar_observacao') {
    const { observacao } = body;
    if (!subscription_id) return Response.json({ error: 'subscription_id obrigatório' }, { status: 400 });
    if (!observacao) return Response.json({ error: 'observacao obrigatória' }, { status: 400 });

    // Busca o customer_id da assinatura
    const subData = await vindiGet(`/subscriptions/${subscription_id}`);
    const customerId = subData.subscription?.customer?.id;
    if (!customerId) return Response.json({ error: 'Cliente não encontrado na assinatura' }, { status: 400 });

    // Busca as notas atuais do cliente para não sobrescrever
    const custData = await vindiGet(`/customers/${customerId}`);
    const notasAtuais = custData.customer?.notes || '';
    const novaObservacao = notasAtuais
      ? `${notasAtuais}\n\n---\n${observacao}`
      : observacao;

    // Atualiza o campo notes do cliente via PUT /customers/:id
    const result = await vindiPut(`/customers/${customerId}`, { notes: novaObservacao });

    return Response.json({ success: true, notes: result.customer?.notes });
  }

  // DEBUG: product_items bruto
  if (action === 'debug_product_items') {
    if (!subscription_id) return Response.json({ error: 'subscription_id obrigatório' }, { status: 400 });
    const piData = await vindiGet(`/subscriptions/${subscription_id}/product_items`);
    return Response.json({ product_items: piData.product_items, raw: piData });
  }

  // DEBUG: Dados brutos completos de uma assinatura
  if (action === 'debug_assinatura') {
    if (!subscription_id) return Response.json({ error: 'subscription_id obrigatório' }, { status: 400 });
    const [subData, piData] = await Promise.all([
      vindiGet(`/subscriptions/${subscription_id}`),
      vindiGet(`/subscriptions/${subscription_id}/product_items`),
    ]);
    const sub = subData.subscription;
    if (!sub) return Response.json({ found: false });
    const [custData, billsPagas, billsOverdue] = await Promise.all([
      vindiGet(`/customers/${sub.customer.id}`),
      vindiGet(`/bills?subscription_id=${subscription_id}&status[]=paid&per_page=5&sort_by=created_at&sort_order=desc`),
      vindiGet(`/bills?customer_id=${sub.customer.id}&status[]=overdue&per_page=5`),
    ]);
    return Response.json({ subscription: sub, customer: custData.customer, product_items: piData.product_items, bills_pagas: billsPagas.bills, bills_overdue: billsOverdue.bills });
  }

  // DEBUG: Listar TODAS as faturas sem filtro
  if (action === 'listar_todas_faturas') {
    const { customer_id } = body;
    if (!customer_id) return Response.json({ error: 'customer_id obrigatório' }, { status: 400 });

    const billData = await vindiGet(`/bills?customer_id=${customer_id}&per_page=100`);
    const bills = (billData.bills || []).map(b => ({
      id: b.id,
      status: b.status,
      due_at: b.due_at,
      amount: b.amount,
      subscription_id: b.subscription?.id || null,
    }));
    
    return Response.json({ bills, total: bills.length });
  }

  return Response.json({ error: 'Ação desconhecida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});