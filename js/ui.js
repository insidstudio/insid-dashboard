// ============================================================
//  ui.js — Render helpers for the Instagram Dashboard
// ============================================================

import { computeRecomendacoes } from './recomendacoes.js';

let _chartInstances = {};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.', ',') + 'K';
  return n.toLocaleString('pt-BR');
}

function animateCounter(el) {
  const raw = parseFloat(el.dataset.counter ?? '0');
  const suffix = el.dataset.suffix ?? '';
  const isFloat = el.dataset.float === 'true';
  const duration = 700;
  const start = Date.now();

  function tick() {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = raw * eased;

    if (isFloat) {
      el.textContent = current.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + suffix;
    } else {
      el.textContent = formatNumber(Math.round(current)) + suffix;
    }

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function animateAllCounters() {
  document.querySelectorAll('[data-counter]').forEach(el => animateCounter(el));
}

/** Decimal no padrao pt-BR: 1.1 vira "1,1". */
function dec(v) {
  return Number(v ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function trendHtml(value, label = '') {
  if (value === 0 || value == null) return '';
  const dir = value > 0 ? 'up' : 'down';
  const arrow = value > 0 ? '↑' : '↓';
  return `<span class="metric-trend ${dir}">${arrow} ${Math.abs(value)}% ${escapeHtml(label)}</span>`;
}

/**
 * Selo "+143 · +2,0%" comparando com o período anterior.
 *
 * Só renderiza quando há base de comparação: sem período anterior, `pct` vem
 * null e o card fica sem selo, em vez de exibir "+100%" ou "0%", que seriam
 * lidos como fato pelo cliente.
 */
function comparativoHtml(cmp) {
  if (!cmp || cmp.pct == null) return '';
  // Variação zero vira selo neutro: "↑ +0 · 0%" sugere alta onde não houve nenhuma.
  if (cmp.pct === 0) return '<span class="metric-trend neutral">sem variação</span>';
  const dir = cmp.pct > 0 ? 'up' : 'down';
  const seta = cmp.pct > 0 ? '↑' : '↓';
  const abs = cmp.absoluto != null && cmp.absoluto !== 0
    ? (cmp.absoluto > 0 ? '+' : '−') + Math.abs(cmp.absoluto).toLocaleString('pt-BR') + ' · '
    : '';
  const pct = Math.abs(cmp.pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return `<span class="metric-trend ${dir}">${seta} ${abs}${pct}%</span>`;
}

function metricCard({ icon, value, label, cssClass = '', suffix = '', isFloat = false, trend = null, cmp = null }) {
  const numVal = typeof value === 'number' ? value : 0;
  const displayVal = typeof value === 'string' ? escapeHtml(value) : formatNumber(numVal);
  const classAttr = cssClass ? ` ${escapeHtml(cssClass)}` : '';
  const dataAttr = typeof value === 'number'
    ? `data-counter="${numVal}" data-suffix="${escapeHtml(suffix)}"${isFloat ? ' data-float="true"' : ''}`
    : '';

  return `<div class="metric-card">
    ${icon ? `<div class="metric-icon">${escapeHtml(icon)}</div>` : ''}
    <span class="metric-value${classAttr}" ${dataAttr}>${displayVal}${escapeHtml(suffix)}</span>
    <span class="metric-label">${escapeHtml(label)}</span>
    ${cmp ? comparativoHtml(cmp) : (trend !== null ? trendHtml(trend) : '')}
  </div>`;
}

function sectionWrap(eyebrow, title, content, extraClass = '') {
  return `<div class="section ${extraClass}">
    <div class="section-header">
      <div>
        <div class="section-eyebrow">${escapeHtml(eyebrow)}</div>
        <h2 class="section-title">${escapeHtml(title)}</h2>
      </div>
    </div>
    ${content}
  </div>`;
}

// ============================================================
//  HEADER
// ============================================================

export function renderHeader(data, days = 30, periodo = null, accounts = [], activeAccountId = null, isCustomRange = false) {
  const header = document.getElementById('header');
  if (!header) return;

  const { account, crescimento, alcance, engajamento } = data;
  const { username, name, profilePicture } = account ?? {};

  const initial = escapeHtml((username ?? 'U')[0].toUpperCase());
  const avatarSrc = profilePicture ? '/api/avatar?url=' + encodeURIComponent(profilePicture) : '';
  const avatarInner = profilePicture
    ? `<img src="${escapeHtml(avatarSrc)}" alt="${escapeHtml(username ?? '')}" onerror="this.replaceWith(document.createTextNode('${initial}'))">`
    : initial;

  const kpis = [
    { label: 'Seguidores', value: formatNumber(crescimento?.seguidoresTotal ?? 0) },
    { label: 'Engajamento', value: (engajamento?.taxaEngajamento ?? 0) + '%' },
    { label: 'Alcance', value: formatNumber(alcance?.contasAlcancadas ?? 0) },
    { label: 'Impressões', value: formatNumber(alcance?.impressoes ?? 0) },
  ];

  const kpisHtml = kpis.map((kpi, i) => {
    const divider = i < kpis.length - 1 ? '<div class="header-kpi-divider"></div>' : '';
    return `<div class="header-kpi">
      <span class="header-kpi-value">${escapeHtml(kpi.value)}</span>
      <span class="header-kpi-label">${escapeHtml(kpi.label)}</span>
    </div>${divider}`;
  }).join('');

  // Account switcher dropdown
  const accountItems = accounts.map(acc => {
    const isActive = acc.id === activeAccountId;
    const initial = (acc.username || acc.label || 'U')[0].toUpperCase();
    const thumbSrc = acc.profilePicture ? '/api/avatar?url=' + encodeURIComponent(acc.profilePicture) : '';
    const thumb = acc.profilePicture
      ? `<img src="${escapeHtml(thumbSrc)}" style="width:28px;height:28px;border-radius:50%;object-fit:cover" onerror="this.outerHTML='<span class=\\'acc-initial\\'>${escapeHtml(initial)}</span>'">`
      : `<span class="acc-initial">${escapeHtml(initial)}</span>`;
    return `<div class="acc-item${isActive ? ' active' : ''}" data-account-id="${escapeHtml(acc.id)}">
      <div class="acc-thumb">${thumb}</div>
      <span class="acc-label">${escapeHtml(acc.label || '@' + acc.username)}</span>
      ${isActive ? '<span class="acc-check">✓</span>' : ''}
    </div>`;
  }).join('');

  const switcherHtml = accounts.length > 0 ? `
    <div class="account-switcher" id="accountSwitcher">
      <button class="account-switcher-btn" id="accountSwitcherBtn">
        <div class="acc-thumb-sm">${avatarInner}</div>
        <span>@${escapeHtml(username ?? '')}</span>
        <span class="switcher-arrow">▾</span>
      </button>
      <div class="account-switcher-dropdown" id="accountSwitcherDropdown">
        ${accountItems}
        <div class="acc-divider"></div>
        <button class="acc-add-btn" id="btnAddAccount">+ Adicionar conta</button>
      </div>
    </div>` : '';

  header.innerHTML = `
    <div class="header-top">
      <div class="header-user">
        ${switcherHtml}
        <div>
          ${name ? `<div class="header-name">${escapeHtml(name)}</div>` : ''}
        </div>
      </div>
      <div class="header-actions">
        <span class="header-timestamp"></span>
        ${periodo ? `<span class="period-badge">${escapeHtml(periodo.desde)} → ${escapeHtml(periodo.ate)}</span>` : ''}
        <div class="date-filter">
          <button class="date-filter-btn ${!isCustomRange && days === 7 ? 'active' : ''}" data-days="7">7d</button>
          <button class="date-filter-btn ${!isCustomRange && days === 14 ? 'active' : ''}" data-days="14">14d</button>
          <button class="date-filter-btn ${!isCustomRange && days === 30 ? 'active' : ''}" data-days="30">30d</button>
          <button class="date-filter-btn ${!isCustomRange && days === 90 ? 'active' : ''}" data-days="90">90d</button>
          <button class="date-filter-btn ${isCustomRange ? 'active' : ''}" id="btnCustomRange">Personalizado</button>
        </div>
        <div class="custom-range-picker ${isCustomRange ? 'visible' : ''}" id="customRangePicker">
          <input type="date" id="dateFrom" class="date-input">
          <span class="date-separator">→</span>
          <input type="date" id="dateTo" class="date-input">
          <button class="btn btn-primary btn-sm" id="btnApplyRange">Aplicar</button>
        </div>
        <button class="btn btn-ghost" id="btnExport">⬇ HTML</button>
        <button class="btn btn-ghost" id="btnAiAnalysis">🤖 IA</button>
        <button class="btn btn-ghost" id="btnExportPdf">📄 PDF</button>
        <button class="btn btn-primary" id="btnRefresh">↻ Atualizar</button>
        <button class="btn btn-danger" id="btnDisconnect">Sair</button>
      </div>
    </div>
    <div class="header-kpis">${kpisHtml}</div>`;
}

// ============================================================
//  CHARTS
// ============================================================

/**
 * Le um token de cor do CSS.
 *
 * Os graficos passam a seguir a paleta definida em :root, entao trocar o tema
 * no CSS nao exige mexer em nenhuma cor aqui dentro.
 */
function token(nome, alternativa = '#55555C') {
  if (typeof getComputedStyle === 'undefined') return alternativa;
  const v = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  return v || alternativa;
}

/**
 * Destroi apenas os graficos indicados.
 *
 * Antes isto apagava TODOS os graficos. Como initCharts roda dentro de um
 * requestAnimationFrame e initEvolutionCharts roda quando a promise do
 * IndexedDB resolve, quem chegasse primeiro era apagado pelo outro — e os
 * quatro graficos de evolucao sumiam de forma intermitente.
 */
function destroyCharts(chaves) {
  chaves.forEach(k => {
    const c = _chartInstances[k];
    if (!c) return;
    try { c.destroy(); } catch (_) {}
    delete _chartInstances[k];
  });
}

const CHARTS_PERIODO = ['engagementTrend', 'content'];
const CHARTS_EVOLUCAO = ['evoFollowers', 'evoReach', 'evoEngagement', 'evoInteractions'];

function initCharts(engagementTrend, conteudo, trendMeta) {
  if (typeof Chart === 'undefined') return;

  destroyCharts(CHARTS_PERIODO);

  if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
  }

  Chart.defaults.color = token('--text-secondary');
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;

  const tooltipDefaults = {
    backgroundColor: token('--tooltip-bg'),
    titleColor: token('--tooltip-text'),
    bodyColor: token('--tooltip-body'),
    borderColor: token('--border-strong'),
    borderWidth: 1,
    padding: 10,
    cornerRadius: 10,
  };

  const gridColor = token('--chart-grid');
  const tickColor = token('--chart-tick');

  // Chart 1: Crescimento do engajamento médio (30 dias)
  const ctx1 = document.getElementById('chartEngagementTrend');
  if (ctx1 && engagementTrend?.length) {
    const lastIndex = engagementTrend.length - 1;
    const gradient = ctx1.getContext('2d').createLinearGradient(0, 0, 0, ctx1.height || 260);
    gradient.addColorStop(0, token('--chart-area'));
    gradient.addColorStop(1, 'rgba(46, 46, 50, 0)');

    _chartInstances.engagementTrend = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: engagementTrend.map(p => p.label),
        datasets: [{
          label: 'Engajamento médio por post',
          data: engagementTrend.map(p => p.mediaEngajamento),
          borderColor: token('--chart-1'),
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: ctx => ctx.dataIndex === lastIndex ? 4 : 0,
          pointHoverRadius: 5,
          pointBackgroundColor: token('--chart-1'),
          pointBorderColor: token('--bg'),
          pointBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        // Espaço à direita/topo para o rótulo do último ponto não ser cortado.
        layout: { padding: { right: 32, top: 14 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...tooltipDefaults,
            callbacks: {
              label: ctx => `${ctx.parsed.y} interações/post (média ${trendMeta?.janela ?? 7} dias)`,
              afterLabel: ctx => {
                const p = engagementTrend[ctx.dataIndex];
                return p?.postsNoDia ? `${p.postsNoDia} post(s) publicado(s)` : '';
              },
            },
          },
          datalabels: {
            display: ctx => ctx.dataIndex === lastIndex && ctx.dataset.data[ctx.dataIndex] > 0,
            anchor: 'end',
            align: 'top',
            offset: 4,
            clamp: true,
            color: token('--text-primary'),
            font: { size: 11, weight: '700' },
            formatter: v => v >= 1000 ? (v / 1000).toFixed(1).replace('.', ',') + 'K' : v,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: tickColor, autoSkip: true, maxTicksLimit: 7, maxRotation: 0 },
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor },
            ticks: { color: tickColor },
          },
        },
      },
    });
  }

  // Chart 2: Distribuição de conteúdo
  const ctx2 = document.getElementById('chartContent');
  if (ctx2) {
    const { reels = 0, carrosseis = 0, postsEstaticos = 0, stories = 0 } = conteudo ?? {};
    const total = reels + carrosseis + postsEstaticos + stories;
    _chartInstances.content = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: ['Reels', 'Carrosséis', 'Posts', 'Stories'],
        datasets: [{
          data: [reels, carrosseis, postsEstaticos, stories],
          backgroundColor: [token('--chart-1'), token('--chart-2'), token('--chart-3'), token('--chart-4')],
          borderColor: token('--bg'),
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { color: tickColor, boxWidth: 12, padding: 14 } },
          tooltip: tooltipDefaults,
          datalabels: {
            color: token('--bg'),
            font: { size: 11, weight: '700' },
            formatter: (v) => {
              const pct = total > 0 ? Math.round(v / total * 100) : 0;
              return pct >= 8 ? pct + '%' : '';
            },
          },
        },
      },
    });
  }
}

// ============================================================
//  TOP POSTS
// ============================================================

function typeLabel(m) {
  if (m.media_product_type === 'REELS') return 'Reel';
  if (m.media_type === 'CAROUSEL_ALBUM') return 'Carrossel';
  return 'Post';
}

function typeEmoji(m) {
  if (m.media_product_type === 'REELS') return '🎬';
  if (m.media_type === 'CAROUSEL_ALBUM') return '🖼';
  return '📷';
}

function renderTopPosts(topPosts) {
  if (!topPosts?.length) return '';

  const cards = topPosts.map(post => {
    const imgSrc = post.thumbnail_url || post.media_url || null;
    const thumb = imgSrc
      ? `<img src="${escapeHtml(imgSrc)}" alt="post" loading="lazy">`
      : `<span style="font-size:36px">${typeEmoji(post)}</span>`;

    const link = post.permalink ? escapeHtml(post.permalink) : '#';

    return `<a class="post-card" href="${link}" target="_blank" rel="noopener">
      <div class="post-thumb-wrap">
        ${thumb}
        <span class="post-type-badge">${typeLabel(post)}</span>
      </div>
      <div class="post-stats">
        <div class="post-stat">
          <span class="post-stat-value">${formatNumber(post.like_count ?? 0)}</span>
          <span class="post-stat-label">Curtidas</span>
        </div>
        <div class="post-stat">
          <span class="post-stat-value">${formatNumber(post.saves ?? 0)}</span>
          <span class="post-stat-label">Saves</span>
        </div>
        <div class="post-stat">
          <span class="post-stat-value">${formatNumber(post.shares ?? 0)}</span>
          <span class="post-stat-label">Shares</span>
        </div>
      </div>
    </a>`;
  }).join('');

  return sectionWrap('Melhores publicações', 'Top Posts', `<div class="posts-grid">${cards}</div>`);
}

// ============================================================
//  AUDIENCE
// ============================================================

function renderAudience(audiencia) {
  const { pctMulheres = 0, pctHomens = 0, faixaEtaria = null, cidades = [] } = audiencia ?? {};

  const genderCard = `<div class="glass-card">
    <div class="section-eyebrow">Gênero</div>
    <h3 class="section-title" style="font-size:17px;margin-bottom:20px">Audiência</h3>
    <div class="gender-bar-container">
      <div class="gender-row">
        <div class="gender-header">
          <span class="gender-label">Mulheres</span>
          <span class="gender-value female">${dec(pctMulheres)}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill female" style="width:${dec(pctMulheres)}%"></div>
        </div>
      </div>
      <div class="gender-row">
        <div class="gender-header">
          <span class="gender-label">Homens</span>
          <span class="gender-value male">${dec(pctHomens)}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill male" style="width:${dec(pctHomens)}%"></div>
        </div>
      </div>
    </div>
  </div>`;

  const cityItems = (cidades ?? []).map((c, i) => `
    <div class="city-item">
      <div class="city-row">
        <span class="city-rank">${i + 1}</span>
        <span class="city-name">${escapeHtml(c.nome)}</span>
        <span class="city-pct">${dec(c.pct)}%</span>
      </div>
      <div class="city-bar"><div class="city-bar-fill" style="width:${dec(c.pct)}%"></div></div>
    </div>`).join('');

  const citiesCard = `<div class="glass-card">
    <div class="section-eyebrow">Localização</div>
    <h3 class="section-title" style="font-size:17px;margin-bottom:20px">Top Cidades</h3>
    <div class="city-list">${cityItems || '<span style="color:var(--text-muted);font-size:13px">Sem dados</span>'}</div>
  </div>`;

  const ageCard = `<div class="glass-card" style="display:flex;flex-direction:column">
    <div class="section-eyebrow">Faixa etária</div>
    <h3 class="section-title" style="font-size:17px;margin-bottom:16px">Principal</h3>
    <div class="age-display">
      <div class="age-value">${escapeHtml(faixaEtaria ?? '—')}</div>
      <div class="age-label">Maior concentração<br>de seguidores</div>
    </div>
  </div>`;

  return `<div class="section">
    <div class="section-header">
      <div>
        <div class="section-eyebrow">Quem te segue</div>
        <h2 class="section-title">Audiência & Dados</h2>
      </div>
    </div>
    <div class="audience-grid">${genderCard}${citiesCard}${ageCard}</div>
  </div>`;
}

// ============================================================
//  ANALYSIS & RECOMMENDATIONS
// ============================================================

function renderAnalysis(data) {
  // Regras vivem em recomendacoes.js para que o PDF use exatamente as mesmas.
  const { continuar, melhorar, parar, saveRate, shareRate, taxaEng, bestReach, referencias } = computeRecomendacoes(data);

  const saveColor = saveRate >= 2 ? 'var(--positive)' : saveRate >= 1 ? '#8A6100' : 'var(--negative)';
  const shareColor = shareRate >= 1 ? 'var(--positive)' : shareRate >= 0.5 ? '#8A6100' : 'var(--negative)';
  const engColor = taxaEng >= 3 ? 'var(--positive)' : taxaEng >= 1.5 ? '#8A6100' : 'var(--negative)';

  const healthCards = `<div class="cards-row">
    <div class="metric-card">
      <div class="metric-icon">🔖</div>
      <span class="metric-value" style="color:${saveColor}">${dec(saveRate)}%</span>
      <span class="metric-label">Save Rate</span>
      <span class="metric-trend neutral" style="font-size:10px">referência: acima de ${referencias.saveRate}%</span>
    </div>
    <div class="metric-card">
      <div class="metric-icon">🔁</div>
      <span class="metric-value" style="color:${shareColor}">${dec(shareRate)}%</span>
      <span class="metric-label">Share Rate</span>
      <span class="metric-trend neutral" style="font-size:10px">referência: acima de ${referencias.shareRate}%</span>
    </div>
    <div class="metric-card">
      <div class="metric-icon">⚡</div>
      <span class="metric-value" style="color:${engColor}">${dec(taxaEng)}%</span>
      <span class="metric-label">Taxa de Engajamento</span>
      <span class="metric-trend neutral" style="font-size:10px">referência: acima de ${referencias.engajamento}%</span>
    </div>
    ${bestReach ? `<div class="metric-card">
      <div class="metric-icon">🏆</div>
      <span class="metric-value" style="font-size:18px">${escapeHtml(bestReach.name)}</span>
      <span class="metric-label">Melhor formato (alcance)</span>
      <span class="metric-trend neutral" style="font-size:10px">${formatNumber(bestReach.avgViews)} por publicação</span>
    </div>` : ''}
  </div>`;

  const makeList = items => items.map(i => `<li style="margin-bottom:10px;line-height:1.6;font-size:13px">${i}</li>`).join('');

  const recCards = `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:20px">
    <div class="metric-card" style="text-align:left;padding:28px 28px;align-self:start">
      <div style="font-size:24px;margin-bottom:10px">✅</div>
      <div style="font-weight:600;color:var(--positive);margin-bottom:16px;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Continuar fazendo</div>
      <ul style="padding-left:18px;margin:0;color:var(--text-secondary)">${makeList(continuar)}</ul>
    </div>
    <div class="metric-card" style="text-align:left;padding:28px 28px;align-self:start">
      <div style="font-size:24px;margin-bottom:10px">⚠️</div>
      <div style="font-weight:600;color:#8A6100;margin-bottom:16px;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Melhorar</div>
      <ul style="padding-left:18px;margin:0;color:var(--text-secondary)">${makeList(melhorar)}</ul>
    </div>
    <div class="metric-card" style="text-align:left;padding:28px 28px;align-self:start">
      <div style="font-size:24px;margin-bottom:10px">🛑</div>
      <div style="font-weight:600;color:var(--negative);margin-bottom:16px;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Parar de fazer</div>
      <ul style="padding-left:18px;margin:0;color:var(--text-secondary)">${makeList(parar)}</ul>
    </div>
  </div>`;

  return sectionWrap('Inteligência de dados', 'Análise & Recomendações', healthCards + recCards);
}

// ============================================================
//  POSTING HEATMAP
// ============================================================

function renderHeatmap(postingHeatmap) {
  if (!postingHeatmap || postingHeatmap.length === 0) return '';

  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'S\u00e1b'];
  const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

  const grid = {};
  let maxEng = 0;
  postingHeatmap.forEach(h => {
    const key = h.day + '-' + h.hour;
    grid[key] = h;
    if (h.avgEng > maxEng) maxEng = h.avgEng;
  });

  // Find best slot
  let bestSlot = null;
  postingHeatmap.forEach(h => {
    if (!bestSlot || h.avgEng > bestSlot.avgEng) bestSlot = h;
  });

  const headerCells = hours.map(h => '<div class="heatmap-header-cell">' + h + 'h</div>').join('');

  const rows = dayLabels.map((label, dayIdx) => {
    const cells = hours.map(hour => {
      const key = dayIdx + '-' + hour;
      const cell = grid[key];
      if (!cell) return '<div class="heatmap-cell empty"></div>';
      const intensity = maxEng > 0 ? Math.round((cell.avgEng / maxEng) * 100) : 0;
      const isBest = bestSlot && cell.day === bestSlot.day && cell.hour === bestSlot.hour;
      return '<div class="heatmap-cell' + (isBest ? ' best' : '') + '" style="--intensity:' + intensity + '%" title="' + label + ' ' + hour + 'h: ' + cell.avgEng + ' eng m\u00e9dio (' + cell.count + ' posts)">' + (cell.count > 0 ? cell.avgEng : '') + '</div>';
    }).join('');
    return '<div class="heatmap-row"><div class="heatmap-day-label">' + label + '</div>' + cells + '</div>';
  }).join('');

  const bestLabel = bestSlot ? dayLabels[bestSlot.day] + ' \u00e0s ' + bestSlot.hour + 'h (' + bestSlot.avgEng + ' eng m\u00e9dio)' : '';

  return sectionWrap('Quando postar', 'Melhor Hor\u00e1rio', '<div class="heatmap-wrap"><div class="heatmap-header"><div class="heatmap-day-label"></div>' + headerCells + '</div>' + rows + '</div>' + (bestLabel ? '<p class="heatmap-best">\u2b50 Melhor slot: <strong>' + bestLabel + '</strong></p>' : '') + '<p class="heatmap-legend"><span class="heatmap-legend-low"></span> Baixo <span class="heatmap-legend-high"></span> Alto engajamento</p>');
}

// ============================================================
//  MAIN RENDER
// ============================================================

// ============================================================
//  RESUMO EXECUTIVO / ALCANCE POR TIPO / FORMATOS / JORNADA
// ============================================================

function renderResumoExecutivo(resumo) {
  if (!resumo?.frases?.length) return '';
  const itens = resumo.frases.map(f => `<li>${escapeHtml(f)}</li>`).join('');
  const nota = resumo.temComparativo
    ? ''
    : '<p class="resumo-nota">Sem período anterior disponível para comparação.</p>';
  return sectionWrap('Visão geral', 'Resumo Executivo',
    `<div class="glass-card resumo-card"><ul class="resumo-lista">${itens}</ul>${nota}</div>`);
}

function renderAlcancePorTipo(alcancePorTipo) {
  // Sem o breakdown a seção inteira some: mostrar 0% de não seguidores seria
  // afirmar que o conteúdo não furou a bolha, e isso o dado não disse.
  if (!alcancePorTipo) return '';
  const { seguidores, naoSeguidores, pctSeguidores, pctNaoSeguidores } = alcancePorTipo;
  return `<div class="glass-card alcance-tipo-card">
    <div class="alcance-tipo-barra">
      <div class="alcance-tipo-seg" style="width:${pctSeguidores}%"></div>
      <div class="alcance-tipo-nao" style="width:${pctNaoSeguidores}%"></div>
    </div>
    <div class="alcance-tipo-legenda">
      <span><i class="dot-seg"></i> Seguidores — <strong>${formatNumber(seguidores)}</strong> (${pctSeguidores.toLocaleString('pt-BR')}%)</span>
      <span><i class="dot-nao"></i> Não seguidores — <strong>${formatNumber(naoSeguidores)}</strong> (${pctNaoSeguidores.toLocaleString('pt-BR')}%)</span>
    </div>
  </div>`;
}

function renderFormatosTabela(formatosTabela) {
  if (!formatosTabela?.length) return '';
  const linhas = formatosTabela.map(f => `<tr>
    <td><strong>${escapeHtml(f.nome)}</strong></td>
    <td>${f.posts}</td>
    <td>${formatNumber(f.alcanceMedio)}</td>
    <td>${f.engajamentoPct.toLocaleString('pt-BR')}%</td>
    <td>${formatNumber(f.salvamentosMedio)}</td>
    <td>${formatNumber(f.compartilhamentosMedio)}</td>
  </tr>`).join('');

  return sectionWrap('Performance por formato', 'Resultados por Tipo',
    `<div class="glass-card tabela-wrap"><table class="data-table formatos-tabela">
      <thead><tr>
        <th>Formato</th><th>Posts</th><th>Alcance médio</th>
        <th>Engajamento</th><th>Salvamentos</th><th>Compartilhamentos</th>
      </tr></thead>
      <tbody>${linhas}</tbody>
    </table></div>`);
}

function renderJornada(jornada) {
  if (!jornada?.length) return '';
  const etapas = jornada.map((e, i) => `
    <div class="jornada-etapa">
      <div class="jornada-valor">${formatNumber(e.valor)}</div>
      <div class="jornada-label">${escapeHtml(e.etapa)}</div>
    </div>
    ${i < jornada.length - 1 ? '<div class="jornada-seta">↓</div>' : ''}`).join('');

  return sectionWrap('Do alcance à ação', 'Jornada do Público',
    `<div class="glass-card jornada-card">${etapas}
      <p class="jornada-nota">Etapas medidas separadamente pela API do Instagram. Uma visita ao perfil pode ter vindo da busca ou de um post antigo, não necessariamente do alcance deste período — por isso não há taxa de conversão entre as etapas.</p>
    </div>`);
}

export function renderDashboard(data, deltas = null) {
  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return;

  const d = deltas || {};

  const { crescimento, alcance, engajamento, conteudo, acoesPerfil,
    reelsPerformance, storiesPerformance, audiencia,
    topPosts, engagementTrend, engagementTrendMeta, contentPerformance, periodo,
    postingHeatmap, comparativo, jornada, formatosTabela, resumoExecutivo } = data;

  const unfollowsCard = crescimento?.unfollows === null
    ? `<div class="metric-card">
        <div class="metric-icon">📉</div>
        <span class="metric-value" style="font-size:16px;color:var(--text-muted)">N/D</span>
        <span class="metric-label">Unfollows</span>
        <span class="metric-trend neutral" style="font-size:10px">API não expõe</span>
      </div>`
    : metricCard({ icon: '📉', value: crescimento?.unfollows ?? 0, label: 'Unfollows', cssClass: 'negative' });

  let periodoLabel = periodo
    ? `${periodo.desde} → ${periodo.ate}`
    : `Últimos ${periodo?.dias ?? 30} dias`;

  if (d._prevDate) {
    const [y, m, day] = d._prevDate.split('-');
    periodoLabel += ` — vs. coleta de ${day}/${m}`;
  }

  const cmp = comparativo ?? {};

  // Saldo líquido só existe quando a API devolve unfollows; caso contrário some.
  const novos = crescimento?.novosSeguidores ?? 0;
  const saiu = crescimento?.unfollows;
  const saldoCard = saiu == null ? '' : metricCard({
    icon: '⚖️', value: novos - saiu, label: 'Saldo Líquido',
    cssClass: (novos - saiu) >= 0 ? 'positive' : 'negative',
  });

  // 1. Crescimento
  const s1 = sectionWrap(periodoLabel, 'Crescimento', `
    <div class="cards-row">
      ${metricCard({ icon: '👥', value: crescimento?.seguidoresTotal ?? 0, label: 'Seguidores Total', trend: d.seguidores })}
      ${metricCard({ icon: '📈', value: novos, label: 'Novos Seguidores', cssClass: 'positive', cmp: cmp.novosSeguidores })}
      ${unfollowsCard}
      ${saldoCard}
    </div>`);

  // 2. Alcance
  const s2Alcance = sectionWrap('Quem foi atingido', 'Alcance', `
    <div class="cards-row">
      ${metricCard({ icon: '👁', value: alcance?.contasAlcancadas ?? 0, label: 'Contas Alcançadas', cmp: cmp.alcance })}
      ${metricCard({ icon: '✨', value: alcance?.impressoes ?? 0, label: 'Impressões', cmp: cmp.impressoes })}
      ${metricCard({ icon: '🚪', value: acoesPerfil?.visitasPerfil ?? 0, label: 'Visitas ao Perfil', cmp: cmp.visitasPerfil })}
    </div>
    ${renderAlcancePorTipo(alcance?.alcancePorTipo)}`);

  // 2. Engajamento
  const s2 = sectionWrap('Interações', 'Engajamento', `
    <div class="cards-row">
      ${metricCard({ icon: '❤️', value: engajamento?.curtidas ?? 0, label: 'Curtidas', cmp: cmp.curtidas })}
      ${metricCard({ icon: '💬', value: engajamento?.comentarios ?? 0, label: 'Comentários', cmp: cmp.comentarios })}
      ${metricCard({ icon: '🔖', value: engajamento?.salvamentos ?? 0, label: 'Salvamentos', trend: d.salvamentos })}
      ${metricCard({ icon: '🔁', value: engajamento?.compartilhamentos ?? 0, label: 'Compartilhamentos', trend: d.compartilhamentos })}
      ${metricCard({ icon: '⚡', value: engajamento?.interacoesTotal ?? 0, label: 'Interações Total', cmp: cmp.interacoesTotal })}
      ${metricCard({ icon: '📊', value: engajamento?.taxaEngajamento ?? 0, label: 'Taxa de Engajamento', suffix: '%', isFloat: true, cssClass: 'accent', cmp: cmp.taxaEngajamento })}
    </div>`);

  const trendDias = engagementTrendMeta?.dias ?? periodo?.dias ?? 30;
  const trendVariacao = engagementTrendMeta?.variacaoPct;
  const trendEyebrow = typeof trendVariacao === 'number'
    ? ` · ${trendVariacao >= 0 ? '+' : ''}${trendVariacao}%`
    : '';

  // 3. Charts
  const chartsSection = `<div class="section">
    <div class="section-header">
      <div>
        <div class="section-eyebrow">Tendências</div>
        <h2 class="section-title">Análise Visual</h2>
      </div>
    </div>
    <div class="charts-grid">
      <div class="chart-card">
        <div class="chart-eyebrow">últimos ${trendDias} dias${trendEyebrow}</div>
        <div class="chart-title">Crescimento do Engajamento Médio</div>
        <div class="chart-container"><canvas id="chartEngagementTrend"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-eyebrow">distribuição</div>
        <div class="chart-title">Mix de Conteúdo</div>
        <div class="chart-container"><canvas id="chartContent"></canvas></div>
      </div>
    </div>
  </div>`;

  // 6. Formatos (tabela comparável)
  const s6Formatos = renderFormatosTabela(formatosTabela);

  // 9. Stories
  const st = storiesPerformance ?? {};
  const s9Stories = (conteudo?.stories ?? 0) > 0
    ? sectionWrap('Conteúdo efêmero', 'Stories', `
      <div class="cards-row">
        ${metricCard({ icon: '⏱', value: conteudo?.stories ?? 0, label: 'Stories publicados' })}
        ${metricCard({ icon: '👁', value: st.alcanceMedio ?? 0, label: 'Alcance médio' })}
        ${metricCard({ icon: '📉', value: st.retencaoPct ?? 0, label: 'Retenção', suffix: '%' })}
        ${metricCard({ icon: '💬', value: st.respostas ?? 0, label: 'Respostas' })}
      </div>`)
    : '';

  // 10. Jornada do público
  const s10Jornada = renderJornada(jornada);

  // 0. Resumo executivo
  const s0 = renderResumoExecutivo(resumoExecutivo);

  // 6. Posting Heatmap
  const s6 = renderHeatmap(postingHeatmap);

  // 7. Top Posts
  const s7 = renderTopPosts(topPosts);

  // 8. Audience
  const s8 = renderAudience(audiencia);

  // 9. Analysis & Recommendations
  const s9 = renderAnalysis(data);

  // 10. Evolution (placeholder — populated async from IndexedDB)
  const evolutionSection = `<div class="section" id="evolutionSection" style="display:none">
    <div class="section-header">
      <div>
        <div class="section-eyebrow">Dia a dia do período</div>
        <h2 class="section-title">Evolução ao Longo do Tempo</h2>
      </div>
    </div>
    <div class="evolution-grid">
      <div class="chart-card">
        <div class="chart-eyebrow">seguidores</div>
        <div class="chart-title">Crescimento de Seguidores</div>
        <div class="chart-container"><canvas id="chartEvoFollowers"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-eyebrow">alcance & impressões</div>
        <div class="chart-title">Alcance Diário</div>
        <div class="chart-container"><canvas id="chartEvoReach"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-eyebrow">engajamento</div>
        <div class="chart-title">Taxa de Engajamento</div>
        <div class="chart-container"><canvas id="chartEvoEngagement"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-eyebrow">interações</div>
        <div class="chart-title">Curtidas, Saves & Shares</div>
        <div class="chart-container"><canvas id="chartEvoInteractions"></canvas></div>
      </div>
    </div>
    <p class="evolution-hint" id="evolutionHint"></p>
  </div>`;

  // 11. AI Analysis (hidden, populated on button click)
  const aiSection = `<div class="section" id="aiAnalysisSection" style="display:none">
    <div class="section-header">
      <div>
        <div class="section-eyebrow">Intelig\u00eancia Artificial</div>
        <h2 class="section-title">An\u00e1lise Personalizada</h2>
      </div>
    </div>
    <div class="glass-card" style="padding:24px">
      <pre class="ai-analysis-content" style="white-space:pre-wrap;font-family:var(--font-ui);font-size:13px;line-height:1.8;color:var(--text-secondary)"></pre>
    </div>
  </div>`;

  // Ordem do relatório padrão INSID:
  // resumo → crescimento → alcance → engajamento → audiência → formatos →
  // melhor horário → top posts → stories → jornada → análise & recomendações
  dashboard.innerHTML = s0 + s1 + s2Alcance + s2 + chartsSection + s8 + s6Formatos
    + s6 + s7 + s9Stories + s10Jornada + s9 + aiSection + evolutionSection;

  // Init charts and counters after DOM is ready
  requestAnimationFrame(() => {
    initCharts(engagementTrend, conteudo, engagementTrendMeta);
    animateAllCounters();
  });
}

// ============================================================
//  EVOLUCAO NO PERIODO (serie diaria vinda da API)
// ============================================================

/**
 * Quatro graficos de evolucao dentro do periodo selecionado.
 *
 * Antes isto lia o historico de coletas do IndexedDB: um ponto por dia em que
 * alguem abrisse o dashboard. Quem nao abria todo dia via os quatro em branco,
 * e o recorte nao tinha relacao com o periodo escolhido no topo. Agora recebe a
 * serie diaria que o metrics.js monta a partir da API, cobrindo exatamente o
 * intervalo do filtro.
 */
export function initEvolutionCharts(evolucao, periodoDias) {
  const section = document.getElementById('evolutionSection');
  const hint = document.getElementById('evolutionHint');

  if (typeof Chart === 'undefined') return;

  const serie = (evolucao ?? []).filter(p => p && p.data);

  if (serie.length < 2) {
    if (section) section.style.display = '';
    if (hint) {
      hint.textContent = serie.length === 0
        ? 'A API do Instagram não retornou a série diária para esta conta neste período.'
        : 'Período curto demais para desenhar uma evolução — escolha um intervalo maior.';
    }
    destroyCharts(CHARTS_EVOLUCAO);
    return;
  }

  if (section) section.style.display = '';
  destroyCharts(CHARTS_EVOLUCAO);

  const labels = serie.map(p => p.label);

  const gridColor = token('--chart-grid');
  const tickColor = token('--chart-tick');
  const tooltipDefaults = {
    backgroundColor: token('--tooltip-bg'),
    titleColor: token('--tooltip-text'),
    bodyColor: token('--tooltip-body'),
    borderColor: token('--border-strong'),
    borderWidth: 1,
    padding: 10,
    cornerRadius: 10,
  };

  // Um ponto por dia fica denso em 90 dias: some o marcador e limita os ticks.
  const denso = serie.length > 31;

  const lineOpts = () => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: tickColor, boxWidth: 10, padding: 14 } },
      tooltip: tooltipDefaults,
      datalabels: { display: false },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: tickColor, autoSkip: true, maxTicksLimit: 8, maxRotation: 0 } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor } },
    },
    elements: {
      point: { radius: denso ? 0 : 3, hoverRadius: 5 },
      line: { tension: 0.3, borderWidth: 2 },
    },
  });

  const linha = (label, campo, cor, preenche = false) => ({
    label,
    data: serie.map(p => p[campo]),
    borderColor: token(cor),
    backgroundColor: preenche ? token('--chart-area') : 'transparent',
    fill: preenche,
    // Dias sem publicação vêm como null: liga um ponto ao outro em vez de
    // desenhar uma queda a zero que não aconteceu.
    spanGaps: true,
  });

  // 1. Seguidores (reconstruido para tras a partir do total de hoje)
  const ctx1 = document.getElementById('chartEvoFollowers');
  if (ctx1 && serie.some(p => p.seguidores != null)) {
    _chartInstances.evoFollowers = new Chart(ctx1, {
      type: 'line',
      data: { labels, datasets: [linha('Seguidores', 'seguidores', '--chart-1', true)] },
      options: lineOpts(),
    });
  }

  // 2. Alcance e impressoes
  const ctx2 = document.getElementById('chartEvoReach');
  if (ctx2) {
    _chartInstances.evoReach = new Chart(ctx2, {
      type: 'line',
      data: { labels, datasets: [
        linha('Alcance', 'alcance', '--chart-1'),
        linha('Impressões', 'impressoes', '--chart-3'),
      ] },
      options: lineOpts(),
    });
  }

  // 3. Taxa de engajamento diaria
  const ctx3 = document.getElementById('chartEvoEngagement');
  if (ctx3) {
    _chartInstances.evoEngagement = new Chart(ctx3, {
      type: 'line',
      data: { labels, datasets: [linha('Taxa de Engajamento (%)', 'taxaEngajamento', '--chart-1', true)] },
      options: lineOpts(),
    });
  }

  // 4. Curtidas, saves e shares por dia de publicacao
  const ctx4 = document.getElementById('chartEvoInteractions');
  if (ctx4) {
    _chartInstances.evoInteractions = new Chart(ctx4, {
      type: 'line',
      data: { labels, datasets: [
        linha('Curtidas', 'curtidas', '--chart-1'),
        linha('Salvamentos', 'salvamentos', '--chart-2'),
        linha('Compartilhamentos', 'compartilhamentos', '--chart-3'),
      ] },
      options: lineOpts(),
    });
  }

  if (hint) {
    const dias = periodoDias ? ` (últimos ${periodoDias} dias)` : '';
    hint.textContent = `${serie.length} dias${dias} — de ${labels[0]} a ${labels[labels.length - 1]}. Dados diários da API do Instagram.`;
  }
}
