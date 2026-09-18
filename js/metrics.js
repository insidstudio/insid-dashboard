import * as api from './api.js';


function getDateRange(days = 30, customSince = null, customUntil = null) {
  if (customSince && customUntil) {
    const since = new Date(customSince);
    since.setHours(0, 0, 0, 0);
    const until = new Date(customUntil);
    until.setHours(23, 59, 59, 999);
    return {
      since: Math.floor(since.getTime() / 1000),
      until: Math.floor(until.getTime() / 1000),
    };
  }
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - days);
  return {
    since: Math.floor(since.getTime() / 1000),
    until: Math.floor(until.getTime() / 1000),
  };
}

function filterMediaByPeriod(mediaList, sinceTimestamp) {
  const sinceMs = sinceTimestamp * 1000;
  return (mediaList ?? []).filter(m => new Date(m.timestamp).getTime() >= sinceMs);
}

function getInsightValue(insightsData, metricName) {
  const metric = insightsData?.find(m => m.name === metricName);
  return metric?.total_value?.value ?? 0;
}

function getInsightBreakdown(insightsData, metricName) {
  const metric = insightsData?.find(m => m.name === metricName);
  return metric?.total_value?.breakdowns?.[0]?.results ?? [];
}

function getMediaInsightValue(insightsData, metricName) {
  const metric = insightsData?.find(m => m.name === metricName);
  return metric?.values?.[0]?.value ?? 0;
}

function average(values) {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function avgStat(arr, fn) {
  return arr.length > 0 ? Math.round(arr.reduce((acc, m) => acc + fn(m), 0) / arr.length) : 0;
}

/**
 * KPIs comparaveis de um periodo arbitrario.
 *
 * Usado para o periodo ANTERIOR, que alimenta o comparativo "+143 | +2,0%".
 * So busca o que da para obter barato: insights de conta (1 chamada) mais
 * curtidas/comentarios das midias que ja temos em maos. Salvamentos e
 * compartilhamentos exigiriam uma chamada por post do periodo anterior, o que
 * dobraria o custo do relatorio inteiro - ficam de fora de proposito.
 */
async function fetchPeriodKPIs(since, until, allMedia) {
  const [insightsResult, followsResult] = await Promise.allSettled([
    api.fetchAccountInsights(since, until),
    api.fetchNetFollows(since, until),
  ]);

  const insights = insightsResult.status === 'fulfilled' ? (insightsResult.value?.data ?? []) : [];
  const followsRaw = followsResult.status === 'fulfilled' ? followsResult.value : null;

  const sinceMs = since * 1000;
  const untilMs = until * 1000;
  const midias = (allMedia ?? []).filter(m => {
    const ts = new Date(m.timestamp).getTime();
    return ts >= sinceMs && ts < untilMs;
  });

  const alcance = getInsightValue(insights, 'reach');
  const interacoes = getInsightValue(insights, 'total_interactions');

  return {
    alcance,
    impressoes: getInsightValue(insights, 'views'),
    visitasPerfil: getInsightValue(insights, 'profile_views'),
    toquesLinkBio: getInsightValue(insights, 'profile_links_taps'),
    novosSeguidores: getInsightValue(followsRaw?.data ?? [], 'follows_and_unfollows'),
    interacoesTotal: interacoes,
    curtidas: midias.reduce((acc, m) => acc + (m.like_count ?? 0), 0),
    comentarios: midias.reduce((acc, m) => acc + (m.comments_count ?? 0), 0),
    posts: midias.length,
    taxaEngajamento: alcance > 0 ? Math.round((interacoes / alcance) * 1000) / 10 : 0,
  };
}

/**
 * Variacao percentual entre dois valores, para os selos "+2,0%".
 *
 * Devolve null (e nao 0 ou 100) quando nao da para comparar: sem base anterior
 * qualquer porcentagem seria inventada, e a UI precisa saber a diferenca para
 * mostrar "-" em vez de um numero falso.
 */
function variacao(atual, anterior) {
  if (anterior == null || anterior === 0) return null;
  if (atual == null) return null;
  return Math.round(((atual - anterior) / Math.abs(anterior)) * 1000) / 10;
}

export async function fetchAllMetrics(days = 30, customSince = null, customUntil = null) {
  const { since, until } = getDateRange(days, customSince, customUntil);
  const sinceDate = new Date(since * 1000);
  const untilDate = new Date(until * 1000);

  const [
    accountInfoResult,
    accountInsightsResult,
    demographicsGenderResult,
    demographicsAgeResult,
    demographicsCityResult,
    mediaResult,
    storiesResult,
    followsBreakdownResult,
    netFollowsResult,
    reachByFollowTypeResult,
  ] = await Promise.allSettled([
    api.fetchAccountInfo(),
    api.fetchAccountInsights(since, until),
    api.fetchDemographics('gender'),
    api.fetchDemographics('age'),
    api.fetchDemographics('city'),
    api.fetchMedia(50),
    api.fetchStories(),
    api.fetchFollowsBreakdown(since, until),
    api.fetchNetFollows(since, until),
    api.fetchReachByFollowType(since, until),
  ]);

  const accountInfo = accountInfoResult.status === 'fulfilled' ? accountInfoResult.value : null;
  const accountInsightsRaw = accountInsightsResult.status === 'fulfilled' ? accountInsightsResult.value : null;
  const demographicsGenderRaw = demographicsGenderResult.status === 'fulfilled' ? demographicsGenderResult.value : null;
  const demographicsAgeRaw = demographicsAgeResult.status === 'fulfilled' ? demographicsAgeResult.value : null;
  const demographicsCityRaw = demographicsCityResult.status === 'fulfilled' ? demographicsCityResult.value : null;
  const mediaRaw = mediaResult.status === 'fulfilled' ? mediaResult.value : null;
  const storiesRaw = storiesResult.status === 'fulfilled' ? storiesResult.value : null;
  const followsRaw = followsBreakdownResult.status === 'fulfilled' ? followsBreakdownResult.value : null;
  const netFollowsRaw = netFollowsResult.status === 'fulfilled' ? netFollowsResult.value : null;
  const reachByFollowTypeRaw = reachByFollowTypeResult.status === 'fulfilled' ? reachByFollowTypeResult.value : null;

  const insights = accountInsightsRaw?.data ?? [];
  const allMedia = mediaRaw?.data ?? [];
  const allStories = storiesRaw?.data ?? [];

  const periodMedia = filterMediaByPeriod(allMedia, since);

  const reels = periodMedia.filter(m => m.media_product_type === 'REELS');
  const carousels = periodMedia.filter(m => m.media_type === 'CAROUSEL_ALBUM');
  const images = periodMedia.filter(m => m.media_type === 'IMAGE' && m.media_product_type !== 'REELS');

  const mediaInsightsResults = await Promise.allSettled(
    periodMedia.map(m => api.fetchMediaInsights(m.id))
  );

  const storyInsightsResults = await Promise.allSettled(
    allStories.map(s => api.fetchStoryInsights(s.id))
  );

  const mediaInsightsMap = {};
  periodMedia.forEach((m, idx) => {
    const result = mediaInsightsResults[idx];
    mediaInsightsMap[m.id] = result.status === 'fulfilled' ? (result.value?.data ?? []) : [];
  });

  const storyInsightsMap = {};
  allStories.forEach((s, idx) => {
    const result = storyInsightsResults[idx];
    storyInsightsMap[s.id] = result.status === 'fulfilled' ? (result.value?.data ?? []) : [];
  });

  // --- Crescimento ---
  const followsBreakdownData = followsRaw?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
  const netFollowChange = netFollowsRaw?.data?.[0]?.total_value?.value ?? null;

  // follow_type breakdown: dimension_values = ['FOLLOW'] ou ['UNFOLLOW']
  const followEntry = followsBreakdownData.find(r => r.dimension_values?.includes('FOLLOWER') || r.dimension_values?.includes('FOLLOW'));
  const unfollowEntry = followsBreakdownData.find(r => r.dimension_values?.includes('NON_FOLLOWER') || r.dimension_values?.includes('UNFOLLOW'));

  let novosSeguidores, unfollows;
  if (followEntry !== undefined || unfollowEntry !== undefined) {
    novosSeguidores = followEntry?.value ?? 0;
    unfollows = unfollowEntry?.value ?? null;
  } else {
    // Fallback FOLLOWER/NON_FOLLOWER: ambos sao follows, derivamos unfollows pela variacao liquida
    novosSeguidores = followsBreakdownData.reduce((acc, r) => acc + (r.value ?? 0), 0);
    unfollows = (netFollowChange !== null && novosSeguidores > 0)
      ? Math.max(0, novosSeguidores - netFollowChange)
      : null;
  }
  const seguidoresTotal = accountInfo?.followers_count ?? 0;

  // --- Alcance ---
  const contasAlcancadas = getInsightValue(insights, 'reach');
  const impressoes = getInsightValue(insights, 'views');

  // --- Alcance: seguidores x nao seguidores ---
  // Nem toda conta devolve esse breakdown; sem ele os campos ficam null e a UI
  // omite a secao em vez de mostrar zero, que seria lido como "nao furou a bolha".
  const reachBreakdown = reachByFollowTypeRaw?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
  const reachSeguidores = reachBreakdown.find(r => r.dimension_values?.includes('FOLLOWER'))?.value ?? null;
  const reachNaoSeguidores = reachBreakdown.find(r => r.dimension_values?.includes('NON_FOLLOWER'))?.value ?? null;
  const reachTipoTotal = (reachSeguidores ?? 0) + (reachNaoSeguidores ?? 0);
  const alcancePorTipo = reachTipoTotal > 0
    ? {
        seguidores: reachSeguidores ?? 0,
        naoSeguidores: reachNaoSeguidores ?? 0,
        pctSeguidores: Math.round(((reachSeguidores ?? 0) / reachTipoTotal) * 1000) / 10,
        pctNaoSeguidores: Math.round(((reachNaoSeguidores ?? 0) / reachTipoTotal) * 1000) / 10,
      }
    : null;

  // --- Engajamento ---
  const curtidas = periodMedia.reduce((acc, m) => acc + (m.like_count ?? 0), 0);
  const comentarios = periodMedia.reduce((acc, m) => acc + (m.comments_count ?? 0), 0);
  const salvamentos = periodMedia.reduce((acc, m) => acc + getMediaInsightValue(mediaInsightsMap[m.id], 'saved'), 0);
  const compartilhamentos = periodMedia.reduce((acc, m) => acc + getMediaInsightValue(mediaInsightsMap[m.id], 'shares'), 0);
  const interacoesTotal = getInsightValue(insights, 'total_interactions');
  const reach = contasAlcancadas;
  const taxaEngajamento = reach > 0 ? Math.round((interacoesTotal / reach) * 1000) / 10 : 0;

  // --- Ações no Perfil ---
  const toquesLinkBio = getInsightValue(insights, 'profile_links_taps');
  const visitasPerfil = getInsightValue(insights, 'profile_views');

  // --- Conteúdo Publicado ---
  const storiesCount = allStories.length;

  // --- Performance Reels ---
  let mediaViews = 0, mediaCurtidas = 0, mediaSaves = 0, mediaShares = 0;
  if (reels.length > 0) {
    mediaViews = average(reels.map(r => getMediaInsightValue(mediaInsightsMap[r.id], 'views')));
    mediaCurtidas = average(reels.map(r => r.like_count ?? 0));
    mediaSaves = average(reels.map(r => getMediaInsightValue(mediaInsightsMap[r.id], 'saved')));
    mediaShares = average(reels.map(r => getMediaInsightValue(mediaInsightsMap[r.id], 'shares')));
  }

  // --- Performance Stories ---
  let alcanceMedio = 0, retencaoPct = 0, respostas = 0;
  if (allStories.length > 0) {
    const storyReachValues = allStories.map(s => getMediaInsightValue(storyInsightsMap[s.id], 'reach'));
    alcanceMedio = average(storyReachValues);
    respostas = allStories.reduce((acc, s) => acc + getMediaInsightValue(storyInsightsMap[s.id], 'replies'), 0);
    if (allStories.length >= 2) {
      const firstStoryReach = storyReachValues[0];
      const lastStoryReach = storyReachValues[storyReachValues.length - 1];
      retencaoPct = firstStoryReach > 0 ? Math.min(100, Math.round((lastStoryReach / firstStoryReach) * 100)) : 0;
    }
  }

  // --- Audiência ---
  const genderData = demographicsGenderRaw?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
  const ageData = demographicsAgeRaw?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
  const cityData = demographicsCityRaw?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];

  const genderTotal = genderData.reduce((acc, r) => acc + (r.value ?? 0), 0);
  const fResult = genderData.find(r => r.dimension_values?.includes('F'));
  const mResult = genderData.find(r => r.dimension_values?.includes('M'));
  const pctMulheres = genderTotal > 0 && fResult ? Math.round(((fResult.value ?? 0) / genderTotal) * 1000) / 10 : 0;
  const pctHomens = genderTotal > 0 && mResult ? Math.round(((mResult.value ?? 0) / genderTotal) * 1000) / 10 : 0;

  let faixaEtaria = null;
  if (ageData.length > 0) {
    const topAge = ageData.reduce((best, r) => (r.value ?? 0) > (best.value ?? 0) ? r : best, ageData[0]);
    faixaEtaria = topAge?.dimension_values?.[0] ?? null;
  }

  let cidades = [];
  if (cityData.length > 0) {
    const cityTotal = cityData.reduce((acc, r) => acc + (r.value ?? 0), 0);
    const sorted = [...cityData].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    cidades = sorted.slice(0, 3).map(r => ({
      nome: r.dimension_values?.[0] ?? '',
      pct: cityTotal > 0 ? Math.round(((r.value ?? 0) / cityTotal) * 1000) / 10 : 0,
    }));
  }

  // --- Top Posts ---
  const enrichedMedia = periodMedia.map(m => {
    const ins = mediaInsightsMap[m.id] ?? [];
    const saves = getMediaInsightValue(ins, 'saved');
    const shares = getMediaInsightValue(ins, 'shares');
    const views = getMediaInsightValue(ins, 'views');
    return {
      ...m,
      saves,
      shares,
      views,
      media_url: m.media_url ?? null,
      thumbnail_url: m.thumbnail_url ?? null,
      totalInteractions: (m.like_count ?? 0) + (m.comments_count ?? 0) + saves + shares,
    };
  });

  const topPosts = [...enrichedMedia]
    .sort((a, b) => b.totalInteractions - a.totalInteractions)
    .slice(0, 6);

  // --- Engajamento médio diário (janela = período selecionado, com média móvel) ---
  const DAY_MS = 24 * 60 * 60 * 1000;

  const trendEnd = new Date(untilDate);
  trendEnd.setHours(0, 0, 0, 0);
  const trendStart = new Date(sinceDate);
  trendStart.setHours(0, 0, 0, 0);

  // Acompanha o filtro do topo (7d / 14d / 30d / 90d / intervalo custom).
  const TREND_DAYS = Math.max(1, Math.round((trendEnd.getTime() - trendStart.getTime()) / DAY_MS));
  // Suavização proporcional: períodos curtos ficariam achatados com janela de 7 dias.
  const TREND_WINDOW = TREND_DAYS <= 14 ? 3 : (TREND_DAYS <= 30 ? 7 : 14);

  const dayKey = dt => `${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()}`;

  const engByDay = {};
  enrichedMedia.forEach(m => {
    const key = dayKey(new Date(m.timestamp));
    if (!engByDay[key]) engByDay[key] = { total: 0, count: 0 };
    engByDay[key].total += m.totalInteractions ?? 0;
    engByDay[key].count += 1;
  });

  const engagementTrend = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const day = new Date(trendEnd.getTime() - i * DAY_MS);

    // Média móvel: engajamento por post no dia e nos anteriores da janela.
    let windowEng = 0;
    let windowPosts = 0;
    for (let w = 0; w < TREND_WINDOW; w++) {
      const bucket = engByDay[dayKey(new Date(day.getTime() - w * DAY_MS))];
      if (bucket) {
        windowEng += bucket.total;
        windowPosts += bucket.count;
      }
    }

    engagementTrend.push({
      label: `${day.getDate()}/${day.getMonth() + 1}`,
      mediaEngajamento: windowPosts > 0 ? Math.round(windowEng / windowPosts) : 0,
      postsNaJanela: windowPosts,
      postsNoDia: engByDay[dayKey(day)]?.count ?? 0,
    });
  }

  // Crescimento entre o primeiro e o último ponto com dados.
  const trendComDados = engagementTrend.filter(p => p.postsNaJanela > 0);
  const trendInicio = trendComDados[0]?.mediaEngajamento ?? 0;
  const trendFim = trendComDados[trendComDados.length - 1]?.mediaEngajamento ?? 0;

  const engagementTrendMeta = {
    dias: TREND_DAYS,
    janela: TREND_WINDOW,
    variacaoPct: trendInicio > 0
      ? Math.round(((trendFim - trendInicio) / trendInicio) * 1000) / 10
      : null,
  };

  // --- Content Performance por tipo ---
  const getIns = m => mediaInsightsMap[m.id] ?? [];
  const contentPerformance = {
    reels: {
      count: reels.length,
      avgViews: avgStat(reels, m => getMediaInsightValue(getIns(m), 'views')),
      avgLikes: avgStat(reels, m => m.like_count ?? 0),
      avgSaves: avgStat(reels, m => getMediaInsightValue(getIns(m), 'saved')),
    },
    carrosseis: {
      count: carousels.length,
      avgViews: avgStat(carousels, m => getMediaInsightValue(getIns(m), 'reach')),
      avgLikes: avgStat(carousels, m => m.like_count ?? 0),
      avgSaves: avgStat(carousels, m => getMediaInsightValue(getIns(m), 'saved')),
    },
    posts: {
      count: images.length,
      avgViews: avgStat(images, m => getMediaInsightValue(getIns(m), 'reach')),
      avgLikes: avgStat(images, m => m.like_count ?? 0),
      avgSaves: avgStat(images, m => getMediaInsightValue(getIns(m), 'saved')),
    },
  };

  // --- Heatmap: melhor horário de postagem ---
  const heatmapGrid = {};
  enrichedMedia.forEach(m => {
    const ts = new Date(m.timestamp);
    const day = ts.getDay();
    const hour = ts.getHours();
    const key = `${day}-${hour}`;
    if (!heatmapGrid[key]) heatmapGrid[key] = { totalEng: 0, count: 0 };
    heatmapGrid[key].totalEng += m.totalInteractions ?? ((m.like_count ?? 0) + (m.comments_count ?? 0));
    heatmapGrid[key].count += 1;
  });

  const postingHeatmap = [];
  for (const [key, val] of Object.entries(heatmapGrid)) {
    const [day, hour] = key.split('-').map(Number);
    postingHeatmap.push({ day, hour, avgEng: Math.round(val.totalEng / val.count), count: val.count });
  }

  // --- Comparativo com o periodo ANTERIOR ---
  // Periodo imediatamente anterior, de mesma duracao. Buscado na API (e nao do
  // historico de coletas) para que cliente novo tenha comparativo ja na primeira
  // abertura, sem depender de alguem ter aberto o dashboard antes.
  const duracaoSegundos = until - since;
  let periodoAnterior = null;
  try {
    periodoAnterior = await fetchPeriodKPIs(since - duracaoSegundos, since, allMedia);
  } catch {
    periodoAnterior = null;
  }

  const atualParaComparar = {
    alcance: contasAlcancadas,
    impressoes,
    visitasPerfil,
    toquesLinkBio,
    novosSeguidores,
    interacoesTotal,
    curtidas,
    comentarios,
    taxaEngajamento,
  };

  const comparativo = {};
  if (periodoAnterior) {
    for (const chave of Object.keys(atualParaComparar)) {
      comparativo[chave] = {
        anterior: periodoAnterior[chave] ?? null,
        absoluto: periodoAnterior[chave] != null ? atualParaComparar[chave] - periodoAnterior[chave] : null,
        pct: variacao(atualParaComparar[chave], periodoAnterior[chave]),
      };
    }
  }

  // --- Jornada do publico ---
  // Deliberadamente SEM percentual entre etapas: a API nao liga uma visita ao
  // perfil ao alcance que a originou (a pessoa pode ter vindo da busca ou de um
  // post antigo), entao uma "taxa de conversao" aqui seria causalidade inventada.
  const jornada = [
    { etapa: 'Pessoas alcançadas', valor: contasAlcancadas },
    { etapa: 'Visitas ao perfil', valor: visitasPerfil },
    { etapa: 'Novos seguidores', valor: novosSeguidores ?? 0 },
    { etapa: 'Cliques no link', valor: toquesLinkBio },
  ];

  // --- Tabela comparavel por formato ---
  // Usa 'reach' para todos os formatos (o contentPerformance usa 'views' nos
  // Reels), senao as linhas da tabela nao seriam comparaveis entre si.
  const linhaFormato = (nome, lista) => {
    if (lista.length === 0) return null;
    const alcanceMed = avgStat(lista, m => getMediaInsightValue(getIns(m), 'reach'));
    const interMed = avgStat(lista, m => getMediaInsightValue(getIns(m), 'total_interactions'));
    return {
      nome,
      posts: lista.length,
      alcanceMedio: alcanceMed,
      engajamentoPct: alcanceMed > 0 ? Math.round((interMed / alcanceMed) * 1000) / 10 : 0,
      salvamentosMedio: avgStat(lista, m => getMediaInsightValue(getIns(m), 'saved')),
      compartilhamentosMedio: avgStat(lista, m => getMediaInsightValue(getIns(m), 'shares')),
    };
  };

  const formatosTabela = [
    linhaFormato('Reels', reels),
    linhaFormato('Carrossel', carousels),
    linhaFormato('Estático', images),
  ].filter(Boolean);

  // --- Resumo executivo ---
  // Montado a partir dos numeros ja calculados. Nao ha interpretacao aqui:
  // cada frase so existe se o dado que a sustenta existir.
  const melhorFormatoAlcance = formatosTabela.length > 0
    ? formatosTabela.reduce((b, f) => f.alcanceMedio > b.alcanceMedio ? f : b, formatosTabela[0])
    : null;

  const frases = [];
  const sinal = v => v >= 0 ? '+' : '';
  // Decimais em pt-BR: 45.2 vira 45,2 no texto que o cliente le.
  const pct = v => `${sinal(v)}${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

  if (comparativo.alcance?.pct != null) {
    frases.push(`O alcance variou ${pct(comparativo.alcance.pct)} em relação ao período anterior, chegando a ${contasAlcancadas.toLocaleString('pt-BR')} contas.`);
  } else {
    frases.push(`O perfil alcançou ${contasAlcancadas.toLocaleString('pt-BR')} contas no período.`);
  }

  if (novosSeguidores != null && comparativo.novosSeguidores?.pct != null) {
    frases.push(`Entraram ${novosSeguidores.toLocaleString('pt-BR')} novos seguidores (${pct(comparativo.novosSeguidores.pct)} vs. período anterior).`);
  } else if (novosSeguidores != null) {
    frases.push(`Entraram ${novosSeguidores.toLocaleString('pt-BR')} novos seguidores no período.`);
  }

  if (melhorFormatoAlcance) {
    frases.push(`${melhorFormatoAlcance.nome} foi o formato de maior alcance médio, com ${melhorFormatoAlcance.alcanceMedio.toLocaleString('pt-BR')} contas por publicação.`);
  }

  if (alcancePorTipo) {
    frases.push(`${alcancePorTipo.pctNaoSeguidores.toLocaleString('pt-BR')}% do alcance veio de quem ainda não segue o perfil.`);
  }

  frases.push(`A taxa de engajamento do período foi de ${taxaEngajamento.toLocaleString('pt-BR')}%.`);

  const resumoExecutivo = {
    frases,
    temComparativo: Boolean(periodoAnterior),
  };

  return {
    account: {
      username: accountInfo?.username ?? null,
      name: accountInfo?.name ?? null,
      profilePicture: accountInfo?.profile_picture_url ?? null,
    },
    periodo: {
      desde: sinceDate.toLocaleDateString('pt-BR'),
      ate: untilDate.toLocaleDateString('pt-BR'),
      dias: days,
    },
    crescimento: { seguidoresTotal, novosSeguidores, unfollows },
    alcance: { contasAlcancadas, impressoes, alcancePorTipo },
    engajamento: { curtidas, comentarios, salvamentos, compartilhamentos, interacoesTotal, taxaEngajamento },
    acoesPerfil: { toquesLinkBio, visitasPerfil },
    conteudo: { reels: reels.length, carrosseis: carousels.length, postsEstaticos: images.length, stories: storiesCount },
    reelsPerformance: { mediaViews, mediaCurtidas, mediaSaves, mediaShares },
    storiesPerformance: { alcanceMedio, retencaoPct, respostas },
    audiencia: { pctMulheres, pctHomens, faixaEtaria, cidades },
    topPosts,
    engagementTrend,
    engagementTrendMeta,
    comparativo,
    periodoAnterior,
    jornada,
    formatosTabela,
    resumoExecutivo,
    contentPerformance,
    postingHeatmap,
  };
}
