// recomendacoes.js — regras de "continuar / melhorar / parar"
//
// Extraído do ui.js para que o dashboard e o PDF partam exatamente do mesmo
// cálculo. Antes a lógica vivia só no renderAnalysis e o PDF não tinha a seção,
// então o relatório entregue ao cliente saía sem os aprendizados.
//
// Devolve só dados (com <strong> no texto, que os dois renderizadores usam).

const REF_SAVE_RATE = 2;    // %
const REF_SHARE_RATE = 1;   // %
const REF_ENGAJAMENTO = 3;  // %

function num(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.', ',') + 'K';
  return n.toLocaleString('pt-BR');
}

function dec(v) {
  return Number(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

export function computeRecomendacoes(data) {
  const { engajamento, alcance, crescimento, contentPerformance, storiesPerformance } = data ?? {};

  const reach = alcance?.contasAlcancadas ?? 0;
  const saves = engajamento?.salvamentos ?? 0;
  const shares = engajamento?.compartilhamentos ?? 0;
  const taxaEng = engajamento?.taxaEngajamento ?? 0;
  const novosSegs = crescimento?.novosSeguidores ?? 0;

  const saveRate = reach > 0 ? Math.round((saves / reach) * 1000) / 10 : 0;
  const shareRate = reach > 0 ? Math.round((shares / reach) * 1000) / 10 : 0;

  const cp = contentPerformance ?? {};
  const formats = [
    { name: 'Reels', avgViews: cp.reels?.avgViews ?? 0, avgSaves: cp.reels?.avgSaves ?? 0, count: cp.reels?.count ?? 0 },
    { name: 'Carrosséis', avgViews: cp.carrosseis?.avgViews ?? 0, avgSaves: cp.carrosseis?.avgSaves ?? 0, count: cp.carrosseis?.count ?? 0 },
    { name: 'Posts', avgViews: cp.posts?.avgViews ?? 0, avgSaves: cp.posts?.avgSaves ?? 0, count: cp.posts?.count ?? 0 },
  ].filter(f => f.count > 0);

  const bestReach = formats.length > 0 ? formats.reduce((b, f) => f.avgViews > b.avgViews ? f : b, formats[0]) : null;
  const bestSaves = formats.length > 0 ? formats.reduce((b, f) => f.avgSaves > b.avgSaves ? f : b, formats[0]) : null;
  const worstReach = formats.length > 1 ? [...formats].sort((a, b) => a.avgViews - b.avgViews)[0] : null;

  const continuar = [];
  const melhorar = [];
  const parar = [];

  // --- Continuar ---
  if (bestReach && formats.length > 1) {
    continuar.push(`<strong>${bestReach.name}</strong> lideram em alcance médio (${num(bestReach.avgViews)} por publicação) — continuar priorizando esse formato.`);
  }
  if (saveRate >= REF_SAVE_RATE) {
    continuar.push(`Save rate em <strong>${dec(saveRate)}%</strong> — acima da referência de ${REF_SAVE_RATE}%. O conteúdo está gerando autoridade. Manter a abordagem.`);
  }
  if (taxaEng >= REF_ENGAJAMENTO) {
    continuar.push(`Taxa de engajamento em <strong>${dec(taxaEng)}%</strong> — dentro do benchmark ideal. Manter frequência e qualidade.`);
  }
  if ((storiesPerformance?.retencaoPct ?? 0) >= 70) {
    continuar.push(`Retenção de stories em <strong>${storiesPerformance.retencaoPct}%</strong> — sequências funcionando bem. Continuar com stories regulares.`);
  }
  if (novosSegs > 0) {
    continuar.push(`<strong>${num(novosSegs)} novos seguidores</strong> no período — a estratégia de atração está funcionando.`);
  }

  // --- Melhorar ---
  if (saveRate < REF_SAVE_RATE && reach > 0) {
    melhorar.push(`Save rate em <strong>${dec(saveRate)}%</strong> (referência: acima de ${REF_SAVE_RATE}%) — criar conteúdos mais didáticos, completos ou com passo a passo para estimular salvamentos.`);
  }
  if (shareRate < REF_SHARE_RATE && reach > 0) {
    melhorar.push(`Share rate em <strong>${dec(shareRate)}%</strong> (referência: acima de ${REF_SHARE_RATE}%) — apostar em conteúdos de opinião forte, listas e comparações que o público queira compartilhar.`);
  }
  if (taxaEng > 0 && taxaEng < REF_ENGAJAMENTO) {
    melhorar.push(`Taxa de engajamento em <strong>${dec(taxaEng)}%</strong> — abaixo do ideal. Revisar CTAs e incluir perguntas nos posts para estimular comentários.`);
  }
  if ((storiesPerformance?.retencaoPct ?? 0) > 0 && storiesPerformance.retencaoPct < 60) {
    melhorar.push(`Retenção de stories em <strong>${storiesPerformance.retencaoPct}%</strong> — reduzir para 3-5 stories por sequência e usar enquetes e perguntas para prender a atenção.`);
  }
  if (bestSaves && bestSaves.name !== bestReach?.name) {
    melhorar.push(`<strong>${bestSaves.name}</strong> geram mais salvamentos mas não lideram em alcance — testar aumentar a frequência desse formato para combinar autoridade com distribuição.`);
  }

  // --- Parar ---
  if (worstReach && bestReach && bestReach.avgViews > 0 && worstReach.avgViews < bestReach.avgViews * 0.35 && worstReach.name !== bestReach.name) {
    parar.push(`<strong>${worstReach.name}</strong> têm alcance médio de ${num(worstReach.avgViews)} vs. ${num(bestReach.avgViews)} dos ${bestReach.name} — reduzir a frequência e redirecionar o esforço para o formato que mais performa.`);
  }
  if (novosSegs <= 0 && (crescimento?.seguidoresTotal ?? 0) > 0) {
    parar.push(`Crescimento de seguidores <strong>estagnado</strong> no período — rever a estratégia de atração. Testar ganchos mais fortes nos primeiros 3 segundos dos reels.`);
  }
  if (shareRate === 0 && reach > 200) {
    parar.push(`<strong>Zero compartilhamentos</strong> no período — evitar conteúdos genéricos ou sem ponto de vista. Todo post deve ter um posicionamento claro ou informação exclusiva.`);
  }

  if (continuar.length === 0) continuar.push('Continue monitorando mensalmente para identificar padrões ao longo do tempo.');
  if (melhorar.length === 0) melhorar.push('Nenhuma queda crítica identificada. Teste novos formatos e compare nos próximos meses.');
  if (parar.length === 0) parar.push('Nenhum padrão negativo relevante identificado neste período.');

  return {
    continuar, melhorar, parar,
    saveRate, shareRate, taxaEng, bestReach,
    referencias: { saveRate: REF_SAVE_RATE, shareRate: REF_SHARE_RATE, engajamento: REF_ENGAJAMENTO },
  };
}
