// Utilitário para converter meses <-> texto legível
export function mesesParaTexto(meses) {
  if (!meses || meses <= 0) return "";
  const anos = Math.floor(meses / 12);
  const m = meses % 12;
  if (anos === 0) return m === 1 ? "1 mês" : `${m} meses`;
  if (m === 0) return anos === 1 ? "1 ano" : `${anos} anos`;
  const anosStr = anos === 1 ? "1 ano" : `${anos} anos`;
  const mesesStr = m === 1 ? "1 mês" : `${m} meses`;
  return `${anosStr} e ${mesesStr}`;
}

// Gera todas as opções de 1 mês até 60 meses (5 anos)
export function gerarOpcoes() {
  const opts = [];
  for (let i = 1; i <= 60; i++) {
    opts.push({ meses: i, label: mesesParaTexto(i) });
  }
  return opts;
}

// Tenta converter texto digitado em número de meses
// Aceita: "1", "12", "1 ano", "2 anos", "1 ano e 6 meses", "18 meses"
export function textoParaMeses(texto) {
  if (!texto) return null;
  const t = texto.toLowerCase().trim();

  // Só número
  const soNum = t.match(/^(\d+)$/);
  if (soNum) return parseInt(soNum[1]);

  // "X meses"
  const mesesOnly = t.match(/^(\d+)\s*m/);
  if (mesesOnly && !t.includes("ano")) return parseInt(mesesOnly[1]);

  // "X anos e Y meses" ou "X anos"
  const anosMatch = t.match(/(\d+)\s*ano/);
  const mesesMatch = t.match(/(\d+)\s*m[eê]s/);
  const anos = anosMatch ? parseInt(anosMatch[1]) : 0;
  const meses = mesesMatch ? parseInt(mesesMatch[1]) : 0;
  if (anos > 0 || meses > 0) return anos * 12 + meses;

  return null;
}