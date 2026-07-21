// ============================================================
//  ui.js — Render helpers for the Instagram Dashboard
// ============================================================

let _chartInstances = {};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
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
      el.textContent = current.toFixed(1) + suffix;
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

function trendHtml(value, label = '') {
  if (value === 0 || value == null) return '';
  const dir = value > 0 ? 'up' : 'down';
  const arrow = value > 0 ? '↑' : '↓';
  return `<span class="metric-trend ${dir}">${arrow} ${Math.abs(value)}% ${escapeHtml(label)}</span>`;
}

function metricCard({ icon, value, label, cssClass = '', suffix = '', isFloat = false, trend = null }) {
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
    ${trend !== null ? trendHtml(trend) : ''}
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

function destroyCharts() {
  Object.values(_chartInstances).forEach(c => { try { c.destroy(); } catch (_) {} });
  _chartInstances = {};
}

function initCharts(weeklyData, conteudo) {
  if (typeof Chart === 'undefined') return;

  destroyCharts();

  if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
  }

  Chart.defaults.color = 'rgba(255, 247, 236, 0.58)';
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.font.size = 11;

  const tooltipDefaults = {
    backgroundColor: 'rgba(13, 8, 7, 0.92)',
    titleColor: '#FFF7EC',
    bodyColor: 'rgba(255, 247, 236, 0.72)',
    borderColor: 'rgba(196, 144, 142, 0.3)',
    borderWidth: 1,
    padding: 10,
    cornerRadius: 10,
  };

  const gridColor = 'rgba(255, 247, 236, 0.05)';
  const tickColor = 'rgba(255, 247, 236, 0.45)';

  // Chart 1: Engajamento semanal
  const ctx1 = document.getElementById('chartWeekly');
  if (ctx1 && weeklyData?.length) {
    _chartInstances.weekly = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: weeklyData.map(w => w.label),
        datasets: [
          {
            label: 'Curtidas',
            data: weeklyData.map(w => w.curtidas),
            backgroundColor: 'rgba(196, 144, 142, 0.85)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Saves',
            data: weeklyData.map(w => w.saves),
            backgroundColor: 'rgba(245, 203, 215, 0.75)',
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: 'Shares',
            data: weeklyData.map(w => w.shares),
            backgroundColor: 'rgba(116, 30, 49, 0.85)',
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: tickColor, boxWidth: 12, padding: 16 } },
          tooltip: tooltipDefaults,
          datalabels: {
            anchor: 'end',
            align: 'top',
            color: 'rgba(255, 247, 236, 0.75)',
            font: { size: 10, weight: '600' },
            formatter: v => v > 0 ? (v >= 1000 ? (v / 1000).toFixed(1) + 'K' : v) : '',
          },
        },
        scales: {
          x: { grid: { color: gridColor }, ticks: { color: tickColor } },
          y: { grid: { color: gridColor }, ticks: { color: tickColor } },
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
          backgroundColor: ['#C8A96E', '#C8A96E', '#E8D5AE', '#A0A0A0'],
          borderColor: 'rgba(13, 8, 7, 0.5)',
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
            color: 'rgba(255, 247, 236, 0.9)',
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
          <span class="gender-value female">${pctMulheres}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill female" style="width:${pctMulheres}%"></div>
        </div>
      </div>
      <div class="gender-row">
        <div class="gender-header">
          <span class="gender-label">Homens</span>
          <span class="gender-value male">${pctHomens}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill male" style="width:${pctHomens}%"></div>
        </div>
      </div>
    </div>
  </div>`;

  const cityItems = (cidades ?? []).map((c, i) => `
    <div class="city-item">
      <div class="city-row">
        <span class="city-rank">${i + 1}</span>
        <span class="city-name">${escapeHtml(c.nome)}</span>
        <span class="city-pct">${c.pct}%</span>
      </div>
      <div class="city-bar"><div class="city-bar-fill" style="width:${c.pct}%"></div></div>
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
  const { engajamento, alcance, crescimento, contentPerformance, storiesPerformance } = data;

  const reach = alcance?.contasAlcancadas ?? 0;
  const saves = engajamento?.salvamentos ?? 0;
  const shares = engajamento?.compartilhamentos ?? 0;
  const taxaEng = engajamento?.taxaEngajamento ?? 0;
  const novosSegs = crescimento?.novosSeguidores ?? 0;

  const saveRate = reach > 0 ? Math.round((saves / reach) * 1000) / 10 : 0;
  const shareRate = reach > 0 ? Math.round((shares / reach) * 1000) / 10 : 0;

  const cp = contentPerformance ?? {};
  const formats = [
    { name: 'Reels', avgViews: cp.reels?.avgViews ?? 0, avgLikes: cp.reels?.avgLikes ?? 0, avgSaves: cp.reels?.avgSaves ?? 0, count: cp.reels?.count ?? 0 },
    { name: 'Carrosséis', avgViews: cp.carrosseis?.avgViews ?? 0, avgLikes: cp.carrosseis?.avgLikes ?? 0, avgSaves: cp.carrosseis?.avgSaves ?? 0, count: cp.carrosseis?.count ?? 0 },
    { name: 'Posts', avgViews: cp.posts?.avgViews ?? 0, avgLikes: cp.posts?.avgLikes ?? 0, avgSaves: cp.posts?.avgSaves ?? 0, count: cp.posts?.count ?? 0 },
  ].filter(f => f.count > 0);

  const bestReach = formats.length > 0 ? formats.reduce((b, f) => f.avgViews > b.avgViews ? f : b, formats[0]) : null;
  const bestSaves = formats.length > 0 ? formats.reduce((b, f) => f.avgSaves > b.avgSaves ? f : b, formats[0]) : null;
  const worstReach = formats.length > 1 ? [...formats].sort((a, b) => a.avgViews - b.avgViews)[0] : null;

  const continuar = [];
  const melhorar = [];
  const parar = [];

  // --- Continuar ---
  if (bestReach && formats.length > 1) {
    continuar.push(`<strong>${bestReach.name}</strong> lideram em alcance médio (${formatNumber(bestReach.avgViews)} por publicação) — continuar priorizando esse formato.`);
  }
  if (saveRate >= 2) {
    continuar.push(`Save rate em <strong>${saveRate}%</strong> — acima da referência de 2%. O conteúdo está gerando autoridade. Manter a abordagem.`);
  }
  if (taxaEng >= 3) {
    continuar.push(`Taxa de engajamento em <strong>${taxaEng}%</strong> — dentro do benchmark ideal. Manter frequência e qualidade.`);
  }
  if ((storiesPerformance?.retencaoPct ?? 0) >= 70) {
    continuar.push(`Retenção de stories em <strong>${storiesPerformance.retencaoPct}%</strong> — sequências funcionando bem. Continuar com stories regulares.`);
  }
  if (novosSegs > 0) {
    continuar.push(`<strong>${formatNumber(novosSegs)} novos seguidores</strong> no período — a estratégia de atração está funcionando.`);
  }

  // --- Melhorar ---
  if (saveRate < 2 && reach > 0) {
    melhorar.push(`Save rate em <strong>${saveRate}%</strong> (referência: acima de 2%) — criar conteúdos mais didáticos, completos ou com passo a passo para estimular salvamentos.`);
  }
  if (shareRate < 1 && reach > 0) {
    melhorar.push(`Share rate em <strong>${shareRate}%</strong> (referência: acima de 1%) — apostar em conteúdos de opinião forte, listas e comparações que o público queira compartilhar.`);
  }
  if (taxaEng > 0 && taxaEng < 3) {
    melhorar.push(`Taxa de engajamento em <strong>${taxaEng}%</strong> — abaixo do ideal. Revisar CTAs e incluir perguntas nos posts para estimular comentários.`);
  }
  if ((storiesPerformance?.retencaoPct ?? 0) > 0 && storiesPerformance.retencaoPct < 60) {
    melhorar.push(`Retenção de stories em <strong>${storiesPerformance.retencaoPct}%</strong> — reduzir para 3-5 stories por sequência e usar enquetes e perguntas para prender a atenção.`);
  }
  if (bestSaves && bestSaves.name !== bestReach?.name) {
    melhorar.push(`<strong>${bestSaves.name}</strong> geram mais salvamentos mas não lideram em alcance — testar aumentar a frequência desse formato para combinar autoridade com distribuição.`);
  }

  // --- Parar ---
  if (worstReach && bestReach && bestReach.avgViews > 0 && worstReach.avgViews < bestReach.avgViews * 0.35 && worstReach.name !== bestReach.name) {
    parar.push(`<strong>${worstReach.name}</strong> têm alcance médio de ${formatNumber(worstReach.avgViews)} vs. ${formatNumber(bestReach.avgViews)} dos ${bestReach.name} — reduzir a frequência e redirecionar o esforço para o formato que mais performa.`);
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

  const saveColor = saveRate >= 2 ? 'var(--positive)' : saveRate >= 1 ? '#f59e0b' : 'var(--negative)';
  const shareColor = shareRate >= 1 ? 'var(--positive)' : shareRate >= 0.5 ? '#f59e0b' : 'var(--negative)';
  const engColor = taxaEng >= 3 ? 'var(--positive)' : taxaEng >= 1.5 ? '#f59e0b' : 'var(--negative)';

  const healthCards = `<div class="cards-row">
    <div class="metric-card">
      <div class="metric-icon">🔖</div>
      <span class="metric-value" style="color:${saveColor}">${saveRate}%</span>
      <span class="metric-label">Save Rate</span>
      <span class="metric-trend neutral" style="font-size:10px">referência: acima de 2%</span>
    </div>
    <div class="metric-card">
      <div class="metric-icon">🔁</div>
      <span class="metric-value" style="color:${shareColor}">${shareRate}%</span>
      <span class="metric-label">Share Rate</span>
      <span class="metric-trend neutral" style="font-size:10px">referência: acima de 1%</span>
    </div>
    <div class="metric-card">
      <div class="metric-icon">⚡</div>
      <span class="metric-value" style="color:${engColor}">${taxaEng}%</span>
      <span class="metric-label">Taxa de Engajamento</span>
      <span class="metric-trend neutral" style="font-size:10px">referência: acima de 3%</span>
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
      <div style="font-weight:600;color:#f59e0b;margin-bottom:16px;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Melhorar</div>
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

export function renderDashboard(data, deltas = null) {
  const dashboard = document.getElementById('dashboard');
  if (!dashboard) return;

  const d = deltas || {};

  const { crescimento, alcance, engajamento, conteudo,
    reelsPerformance, storiesPerformance, audiencia,
    topPosts, weeklyData, contentPerformance, periodo,
    postingHeatmap } = data;

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

  // 1. Crescimento + Alcance + Engajamento
  const s1 = sectionWrap(periodoLabel, 'Crescimento & Alcance', `
    <div class="cards-row">
      ${metricCard({ icon: '👥', value: crescimento?.seguidoresTotal ?? 0, label: 'Seguidores Total', trend: d.seguidores })}
      ${metricCard({ icon: '📈', value: crescimento?.novosSeguidores ?? 0, label: 'Novos Seguidores', cssClass: 'positive', trend: d.novosSeguidores })}
      ${unfollowsCard}
      ${metricCard({ icon: '👁', value: alcance?.contasAlcancadas ?? 0, label: 'Contas Alcançadas', trend: d.alcance })}
      ${metricCard({ icon: '✨', value: alcance?.impressoes ?? 0, label: 'Impressões', trend: d.impressoes })}
    </div>`);

  // 2. Engajamento
  const s2 = sectionWrap('Interações', 'Engajamento', `
    <div class="cards-row">
      ${metricCard({ icon: '❤️', value: engajamento?.curtidas ?? 0, label: 'Curtidas', trend: d.curtidas })}
      ${metricCard({ icon: '💬', value: engajamento?.comentarios ?? 0, label: 'Comentários', trend: d.comentarios })}
      ${metricCard({ icon: '🔖', value: engajamento?.salvamentos ?? 0, label: 'Salvamentos', trend: d.salvamentos })}
      ${metricCard({ icon: '🔁', value: engajamento?.compartilhamentos ?? 0, label: 'Compartilhamentos', trend: d.compartilhamentos })}
      ${metricCard({ icon: '⚡', value: engajamento?.interacoesTotal ?? 0, label: 'Interações Total', trend: d.interacoesTotal })}
      ${metricCard({ icon: '📊', value: engajamento?.taxaEngajamento ?? 0, label: 'Taxa de Engajamento', suffix: '%', isFloat: true, cssClass: 'accent', trend: d.taxaEngajamento })}
    </div>`);

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
        <div class="chart-eyebrow">últimas 4 semanas</div>
        <div class="chart-title">Engajamento Semanal</div>
        <div class="chart-container"><canvas id="chartWeekly"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-eyebrow">distribuição</div>
        <div class="chart-title">Mix de Conteúdo</div>
        <div class="chart-container"><canvas id="chartContent"></canvas></div>
      </div>
    </div>
  </div>`;

  // 4. Content Performance
  const cp = contentPerformance ?? {};
  const s4 = sectionWrap('Performance por formato', 'Resultados por Tipo', `
    <div class="cards-row">
      ${metricCard({ icon: '🎬', value: cp.reels?.count ?? 0, label: 'Reels publicados' })}
      ${metricCard({ value: cp.reels?.avgViews ?? 0, label: 'Média views/Reel' })}
      ${metricCard({ value: cp.reels?.avgLikes ?? 0, label: 'Média curtidas/Reel' })}
      ${metricCard({ value: cp.reels?.avgSaves ?? 0, label: 'Média saves/Reel' })}
    </div>
    <div class="cards-row" style="margin-top:12px">
      ${metricCard({ icon: '🖼', value: cp.carrosseis?.count ?? 0, label: 'Carrosséis publicados' })}
      ${metricCard({ value: cp.carrosseis?.avgLikes ?? 0, label: 'Média curtidas/Carrossel' })}
      ${metricCard({ value: cp.carrosseis?.avgSaves ?? 0, label: 'Média saves/Carrossel' })}
      ${metricCard({ icon: '📷', value: cp.posts?.count ?? 0, label: 'Posts estáticos' })}
    </div>`);

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
        <div class="section-eyebrow">Histórico</div>
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
        <div class="chart-title">Alcance por Período</div>
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

  dashboard.innerHTML = s1 + s2 + chartsSection + s4 + s6 + s7 + s8 + s9 + aiSection + evolutionSection;

  // Init charts and counters after DOM is ready
  requestAnimationFrame(() => {
    initCharts(weeklyData, conteudo);
    animateAllCounters();
  });
}

// ============================================================
//  EVOLUTION CHARTS (populated from IndexedDB snapshots)
// ============================================================

export function initEvolutionCharts(snapshots) {
  if (typeof Chart === 'undefined' || !snapshots || snapshots.length < 2) {
    const hint = document.getElementById('evolutionHint');
    if (hint && snapshots && snapshots.length < 2) {
      const section = document.getElementById('evolutionSection');
      if (section) section.style.display = '';
      hint.textContent = 'Os gr\u00e1ficos de evolu\u00e7\u00e3o aparecer\u00e3o ap\u00f3s pelo menos 2 coletas em dias diferentes. Continue usando o dashboard!';
    }
    return;
  }

  const section = document.getElementById('evolutionSection');
  if (section) section.style.display = '';

  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const labels = sorted.map(s => {
    const [y, m, d] = s.date.split('-');
    return d + '/' + m;
  });

  const gridColor = 'rgba(255, 247, 236, 0.05)';
  const tickColor = 'rgba(255, 247, 236, 0.45)';
  const tooltipDefaults = {
    backgroundColor: 'rgba(13, 8, 7, 0.92)',
    titleColor: '#FFF7EC',
    bodyColor: 'rgba(255, 247, 236, 0.72)',
    borderColor: 'rgba(196, 144, 142, 0.3)',
    borderWidth: 1,
    padding: 10,
    cornerRadius: 10,
  };

  const lineOpts = (yLabel) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: tickColor, boxWidth: 10, padding: 14 } },
      tooltip: tooltipDefaults,
      datalabels: { display: false },
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor }, title: { display: false } },
    },
    elements: { point: { radius: 4, hoverRadius: 6 }, line: { tension: 0.3 } },
  });

  // 1. Followers
  const ctx1 = document.getElementById('chartEvoFollowers');
  if (ctx1) {
    _chartInstances.evoFollowers = new Chart(ctx1, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Seguidores',
          data: sorted.map(s => s.kpis.seguidores),
          borderColor: '#C8A96E',
          backgroundColor: 'rgba(196, 144, 142, 0.15)',
          fill: true,
        }],
      },
      options: lineOpts(),
    });
  }

  // 2. Reach & Impressions
  const ctx2 = document.getElementById('chartEvoReach');
  if (ctx2) {
    _chartInstances.evoReach = new Chart(ctx2, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Alcance',
            data: sorted.map(s => s.kpis.alcance),
            borderColor: '#C8A96E',
            backgroundColor: 'rgba(196, 144, 142, 0.1)',
            fill: false,
          },
          {
            label: 'Impress\u00f5es',
            data: sorted.map(s => s.kpis.impressoes),
            borderColor: '#E8D5AE',
            backgroundColor: 'rgba(245, 203, 215, 0.1)',
            fill: false,
          },
        ],
      },
      options: lineOpts(),
    });
  }

  // 3. Engagement rate
  const ctx3 = document.getElementById('chartEvoEngagement');
  if (ctx3) {
    _chartInstances.evoEngagement = new Chart(ctx3, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Taxa de Engajamento (%)',
          data: sorted.map(s => s.kpis.taxaEngajamento),
          borderColor: '#C8A96E',
          backgroundColor: 'rgba(116, 30, 49, 0.15)',
          fill: true,
        }],
      },
      options: lineOpts(),
    });
  }

  // 4. Interactions breakdown
  const ctx4 = document.getElementById('chartEvoInteractions');
  if (ctx4) {
    _chartInstances.evoInteractions = new Chart(ctx4, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Curtidas',
            data: sorted.map(s => s.kpis.curtidas),
            borderColor: 'rgba(196, 144, 142, 0.85)',
            fill: false,
          },
          {
            label: 'Salvamentos',
            data: sorted.map(s => s.kpis.salvamentos),
            borderColor: 'rgba(245, 203, 215, 0.85)',
            fill: false,
          },
          {
            label: 'Compartilhamentos',
            data: sorted.map(s => s.kpis.compartilhamentos),
            borderColor: 'rgba(116, 30, 49, 0.85)',
            fill: false,
          },
        ],
      },
      options: lineOpts(),
    });
  }

  const hint = document.getElementById('evolutionHint');
  if (hint) {
    hint.textContent = sorted.length + ' coleta' + (sorted.length > 1 ? 's' : '') + ' registrada' + (sorted.length > 1 ? 's' : '') + ' \u2014 de ' + labels[0] + ' a ' + labels[labels.length - 1];
  }
}
