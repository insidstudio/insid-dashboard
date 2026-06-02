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

  // --- Crescimento (follows via chamada dedicada com breakdown=follow_type) ---
  // A API retorna FOLLOWER + NON_FOLLOWER = total de follows do período
  const followsBreakdownData = followsRaw?.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
  const novosSeguidores = followsBreakdownData.reduce((acc, r) => acc + (r.value ?? 0), 0);
  // A API v25 não expõe unfollows separadamente — retornamos null para indicar indisponível
  const netFollowChange = netFollowsRaw?.data?.[0]?.total_value?.value ?? null;
  const unfollows = null;
  const seguidoresTotal = accountInfo?.followers_count ?? 0;

  // --- Alcance ---
  const contasAlcancadas = getInsightValue(insights, 'reach');
  const impressoes = getInsightValue(insights, 'views');

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

  // --- Weekly Engagement (últimas 4 semanas) ---
  const weeklyData = [];
  for (let i = 3; i >= 0; i--) {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 7);

    const weekMedia = allMedia.filter(m => {
      const ts = new Date(m.timestamp).getTime();
      return ts >= weekStart.getTime() && ts < weekEnd.getTime();
    });

    const weekCurtidas = weekMedia.reduce((acc, m) => acc + (m.like_count ?? 0), 0);
    const weekSaves = weekMedia.reduce((acc, m) => acc + getMediaInsightValue(mediaInsightsMap[m.id] ?? [], 'saved'), 0);
    const weekShares = weekMedia.reduce((acc, m) => acc + getMediaInsightValue(mediaInsightsMap[m.id] ?? [], 'shares'), 0);

    const d = new Date(weekEnd);
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    weeklyData.push({ label, curtidas: weekCurtidas, saves: weekSaves, shares: weekShares, posts: weekMedia.length });
  }

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
    alcance: { contasAlcancadas, impressoes },
    engajamento: { curtidas, comentarios, salvamentos, compartilhamentos, interacoesTotal, taxaEngajamento },
    acoesPerfil: { toquesLinkBio },
    conteudo: { reels: reels.length, carrosseis: carousels.length, postsEstaticos: images.length, stories: storiesCount },
    reelsPerformance: { mediaViews, mediaCurtidas, mediaSaves, mediaShares },
    storiesPerformance: { alcanceMedio, retencaoPct, respostas },
    audiencia: { pctMulheres, pctHomens, faixaEtaria, cidades },
    topPosts,
    weeklyData,
    contentPerformance,
    postingHeatmap,
  };
}
