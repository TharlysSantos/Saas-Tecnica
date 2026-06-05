import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { jsPDF } from 'npm:jspdf@4.0.0';

function formatDate(dateStr) {
  if (!dateStr) return '___/___/______';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function formatCurrency(val) {
  if (!val) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { request_id } = await req.json();
  if (!request_id) return Response.json({ error: 'request_id obrigatório' }, { status: 400 });

  const requests = await base44.asServiceRole.entities.RetentionRequest.filter({ id: request_id });
  const req_data = requests[0];
  if (!req_data) return Response.json({ error: 'Solicitação não encontrada' }, { status: 404 });

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageW, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMO DE CANCELAMENTO DE ASSINATURA', pageW / 2, 16, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('D-SAAS Sistemas', pageW / 2, 25, { align: 'center' });

  // Reset text color
  doc.setTextColor(30, 41, 59);

  let y = 50;

  const section = (title) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 5, pageW - margin * 2, 10, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 2, y + 2);
    y += 10;
  };

  const row = (label, value, indent = 0) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, margin + indent, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '—'), margin + indent + 55, y);
    y += 7;
  };

  // Dados do cliente
  section('1. DADOS DO CONTRATANTE');
  y += 3;
  row('Razão Social', req_data.razao_social);
  row('CNPJ/CPF', req_data.cnpj);
  row('E-mail', req_data.email);
  row('Telefone', req_data.telefone);
  if (req_data.cidade) row('Cidade', `${req_data.cidade} - CEP: ${req_data.cep || ''}`);
  y += 5;

  // Dados da assinatura
  section('2. DADOS DA ASSINATURA');
  y += 3;
  row('ID Assinatura', req_data.id_assinatura);
  row('Plano', req_data.plano_contratado);
  row('Produto', req_data.produto);
  row('Valor Mensalidade', formatCurrency(req_data.valor_mensalidade));
  row('Ciclos Faturados', req_data.ciclos_faturados);
  y += 5;

  // Condições de cancelamento
  section('3. CONDIÇÕES DO CANCELAMENTO');
  y += 3;
  row('Data de Efetivação', formatDate(req_data.data_cancelamento_efetivo || req_data.data_efetivacao));
  row('Passível de Multa', req_data.passivel_multa === 'sim' ? 'Sim' : 'Não');
  if (req_data.passivel_multa === 'sim') {
    row('Ciclos Faltantes', req_data.ciclos_faltantes || 0);
    row('Valor da Multa', formatCurrency(req_data.valor_multa_calculado || req_data.valor_multa));
  }
  row('Cobra Multa', req_data.cobra_multa === 'sim' ? 'Sim' : 'Não');
  if (req_data.cobra_multa === 'sim') {
    row('Valor Cobrado', formatCurrency(req_data.valor_multa));
  }
  y += 5;

  // Motivo
  section('4. MOTIVO DO CANCELAMENTO');
  y += 3;
  const motivoText = req_data.motivo || req_data.conclusao_resumo || '—';
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(motivoText, pageW - margin * 2 - 10);
  doc.text(lines, margin + 5, y);
  y += lines.length * 6 + 5;

  // Equipamento
  if (req_data.possui_equipamento) {
    section('5. DEVOLUÇÃO DE EQUIPAMENTO');
    y += 3;
    row('Possui Equipamento', 'Sim');
    row('Equipamento Devolvido', req_data.equipamento_devolvido ? 'Sim' : 'Não');
    y += 5;
  }

  // Assinaturas
  y = Math.max(y + 10, 220);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageW / 2 - 10, y);
  doc.line(pageW / 2 + 10, y, pageW - margin, y);
  doc.setFontSize(9);
  doc.text('Representante D-SAAS', margin, y + 6);
  doc.text('Cliente / Contratante', pageW / 2 + 10, y + 6);

  // Data de geração
  y += 18;
  const now = new Date();
  const dataGeracao = now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`Documento gerado em: ${dataGeracao} (horário de Brasília)`, margin, y);

  const pdfBytes = doc.output('arraybuffer');

  // Upload do PDF
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const formData = new FormData();
  formData.append('file', blob, `termo_cancelamento_${req_data.cnpj?.replace(/\D/g,'')}_${Date.now()}.pdf`);

  const uploadRes = await fetch('https://api.base44.com/api/apps/' + Deno.env.get('BASE44_APP_ID') + '/storage/upload', {
    method: 'POST',
    body: formData,
    headers: { 'x-base44-app-id': Deno.env.get('BASE44_APP_ID') },
  });

  let link_termo = null;
  if (uploadRes.ok) {
    const uploadData = await uploadRes.json();
    link_termo = uploadData.file_url || uploadData.url;
  }

  // Salva link no request
  await base44.asServiceRole.entities.RetentionRequest.update(request_id, {
    link_termo,
    status_processo: 'processo_finalizado',
  });

  // Registra comunicação
  await base44.asServiceRole.entities.Comunicacao.create({
    request_id,
    tipo_template: 'termo',
    canal: 'sistema',
    assunto: `Termo de cancelamento gerado - ${req_data.razao_social}`,
    corpo: `Termo gerado por ${user.full_name} em ${dataGeracao}`,
    status_envio: 'enviado',
    link_anexo: link_termo,
    autor_nome: user.full_name,
    autor_email: user.email,
  });

  // Retorna PDF diretamente se upload falhou
  if (!link_termo) {
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=termo_cancelamento_${req_data.cnpj?.replace(/\D/g,'')}.pdf`,
      },
    });
  }

  return Response.json({ success: true, link_termo });
});