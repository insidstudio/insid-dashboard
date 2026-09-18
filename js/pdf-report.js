import { computeRecomendacoes } from './recomendacoes.js';

function fmt(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.', ',') + 'K';
  return n.toLocaleString('pt-BR');
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

/** Selo "+143 &middot; +2,0%" do periodo anterior. Vazio quando nao ha base. */
function cmpBadge(c) {
  if (!c || c.pct == null) return '';
  if (c.pct === 0) return '<span class="kpi-delta neutro">sem varia\u00e7\u00e3o</span>';
  var dir = c.pct > 0 ? 'up' : 'down';
  var seta = c.pct > 0 ? '&#x2191;' : '&#x2193;';
  var abs = (c.absoluto != null && c.absoluto !== 0)
    ? (c.absoluto > 0 ? '+' : '\u2212') + Math.abs(c.absoluto).toLocaleString('pt-BR') + ' \u00b7 '
    : '';
  var pct = Math.abs(c.pct).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  return '<span class="kpi-delta ' + dir + '">' + seta + ' ' + abs + pct + '%</span>';
}

function kpiRow(items) {
  return '<div class="kpi-row">' + items.map(function(k) {
    var selo = k.cmp
      ? cmpBadge(k.cmp)
      : (k.delta != null && k.delta !== 0 ? '<span class="kpi-delta ' + (k.delta > 0 ? 'up' : 'down') + '">' + (k.delta > 0 ? '+' : '') + k.delta + '%</span>' : '');
    return '<div class="kpi"><span class="kpi-val">' + esc(k.value) + '</span><span class="kpi-label">' + esc(k.label) + '</span>'
    + selo + '</div>';
  }).join('') + '</div>';
}

function section(title, content) {
  return '<div class="section"><h2>' + esc(title) + '</h2>' + content + '</div>';
}

export function generateReportHTML(data, deltas, canvasImages) {
  var d = deltas || {};
  var account = data.account || {};
  var periodo = data.periodo;
  var crescimento = data.crescimento || {};
  var alcance = data.alcance || {};
  var engajamento = data.engajamento || {};
  var conteudo = data.conteudo || {};
  var storiesPerformance = data.storiesPerformance || {};
  var audiencia = data.audiencia || {};
  var topPosts = data.topPosts || [];
  var contentPerformance = data.contentPerformance || {};
  var postingHeatmap = data.postingHeatmap || [];
  var acoesPerfil = data.acoesPerfil || {};
  var cmp = data.comparativo || {};
  var jornada = data.jornada || [];
  var formatosTabela = data.formatosTabela || [];
  var resumoExecutivo = data.resumoExecutivo || {};
  var rec = computeRecomendacoes(data);

  var username = account.username || 'instagram';
  var periodoText = periodo ? periodo.desde + ' a ' + periodo.ate : '';
  var today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  var cover = '<div class="cover"><div class="cover-inner">'
    + '<div class="cover-icon">&#x1F4CA;</div>'
    + '<h1>Relat\u00f3rio de M\u00e9tricas</h1>'
    + '<p class="cover-account">@' + esc(username) + '</p>'
    + (periodoText ? '<p class="cover-period">' + esc(periodoText) + '</p>' : '')
    + '<p class="cover-date">Gerado em ' + esc(today) + '</p>'
    + '<p class="cover-brand">Insid Studio</p>'
    + '</div></div>';

  // Resumo executivo abre o relatorio
  var s0 = (resumoExecutivo.frases && resumoExecutivo.frases.length)
    ? section('Resumo Executivo', '<ul class="resumo">' + resumoExecutivo.frases.map(function(f) {
        return '<li>' + esc(f) + '</li>';
      }).join('') + '</ul>')
    : '';

  var saldo = (crescimento.unfollows != null)
    ? [{ value: fmt((crescimento.novosSeguidores || 0) - crescimento.unfollows), label: 'Saldo L\u00edquido' }]
    : [];

  var s1 = section('Crescimento', kpiRow([
    { value: fmt(crescimento.seguidoresTotal), label: 'Seguidores', delta: d.seguidores },
    { value: fmt(crescimento.novosSeguidores), label: 'Novos Seguidores', cmp: cmp.novosSeguidores },
    { value: crescimento.unfollows == null ? 'N/D' : fmt(crescimento.unfollows), label: 'Deixaram de Seguir' },
  ].concat(saldo)));

  var apt = alcance.alcancePorTipo;
  var barraAlcance = apt
    ? '<div class="alc-barra"><div class="alc-seg" style="width:' + apt.pctSeguidores + '%"></div>'
      + '<div class="alc-nao" style="width:' + apt.pctNaoSeguidores + '%"></div></div>'
      + '<p class="alc-legenda"><span class="alc-dot-seg"></span> Seguidores &mdash; <strong>' + fmt(apt.seguidores) + '</strong> (' + apt.pctSeguidores.toLocaleString('pt-BR') + '%)'
      + ' &nbsp;&nbsp; <span class="alc-dot-nao"></span> N\u00e3o seguidores &mdash; <strong>' + fmt(apt.naoSeguidores) + '</strong> (' + apt.pctNaoSeguidores.toLocaleString('pt-BR') + '%)</p>'
    : '';

  var s1b = section('Alcance', kpiRow([
    { value: fmt(alcance.contasAlcancadas), label: 'Contas Alcan\u00e7adas', cmp: cmp.alcance },
    { value: fmt(alcance.impressoes), label: 'Impress\u00f5es', cmp: cmp.impressoes },
    { value: fmt(acoesPerfil.visitasPerfil), label: 'Visitas ao Perfil', cmp: cmp.visitasPerfil },
  ]) + barraAlcance);

  var s2 = section('Engajamento', kpiRow([
    { value: fmt(engajamento.curtidas), label: 'Curtidas', cmp: cmp.curtidas },
    { value: fmt(engajamento.comentarios), label: 'Coment\u00e1rios', cmp: cmp.comentarios },
    { value: fmt(engajamento.salvamentos), label: 'Salvamentos', delta: d.salvamentos },
    { value: fmt(engajamento.compartilhamentos), label: 'Compartilhamentos', delta: d.compartilhamentos },
  ]) + kpiRow([
    { value: fmt(engajamento.interacoesTotal), label: 'Intera\u00e7\u00f5es Total', cmp: cmp.interacoesTotal },
    { value: (engajamento.taxaEngajamento || 0).toLocaleString('pt-BR') + '%', label: 'Taxa de Engajamento', cmp: cmp.taxaEngajamento },
  ]));

  var chartsHtml = '';
  if (canvasImages && (canvasImages.chartEngagementTrend || canvasImages.chartContent)) {
    chartsHtml = '<div class="section"><h2>An\u00e1lise Visual</h2><div class="charts-row">';
    if (canvasImages.chartEngagementTrend) chartsHtml += '<div class="chart-img"><p class="chart-label">Crescimento do Engajamento M\u00e9dio (30 dias)</p><img src="' + canvasImages.chartEngagementTrend + '"></div>';
    if (canvasImages.chartContent) chartsHtml += '<div class="chart-img"><p class="chart-label">Mix de Conte\u00fado</p><img src="' + canvasImages.chartContent + '"></div>';
    chartsHtml += '</div></div>';
  }

  var s4 = formatosTabela.length
    ? section('Performance por Formato',
        '<table class="data-table"><thead><tr><th>Formato</th><th>Posts</th><th>Alcance m\u00e9dio</th><th>Engajamento</th><th>Salvamentos</th><th>Compartilhamentos</th></tr></thead><tbody>'
        + formatosTabela.map(function(f) {
            return '<tr><td>' + esc(f.nome) + '</td><td>' + f.posts + '</td><td>' + fmt(f.alcanceMedio) + '</td><td>'
              + f.engajamentoPct.toLocaleString('pt-BR') + '%</td><td>' + fmt(f.salvamentosMedio) + '</td><td>'
              + fmt(f.compartilhamentosMedio) + '</td></tr>';
          }).join('')
        + '</tbody></table>')
    : '';

  var s5 = (conteudo.stories || 0) > 0 ? section('Stories', kpiRow([
    { value: fmt(storiesPerformance.alcanceMedio), label: 'Alcance M\u00e9dio' },
    { value: (storiesPerformance.retencaoPct || 0).toLocaleString('pt-BR') + '%', label: 'Reten\u00e7\u00e3o' },
    { value: fmt(storiesPerformance.respostas), label: 'Respostas' },
    { value: String(conteudo.stories || 0), label: 'Stories Publicados' },
  ])) : '';

  var topPostsHtml = '';
  if (topPosts.length) {
    topPostsHtml = section('Top Posts', '<div class="top-posts">' + topPosts.slice(0, 6).map(function(p) {
      var type = p.media_product_type === 'REELS' ? 'Reel' : p.media_type === 'CAROUSEL_ALBUM' ? 'Carrossel' : 'Post';
      return '<div class="top-post"><span class="post-type">' + type + '</span>'
        + '<span class="post-stats">' + fmt(p.like_count || 0) + ' curtidas &middot; ' + fmt(p.saves || 0) + ' saves &middot; ' + fmt(p.shares || 0) + ' shares</span></div>';
    }).join('') + '</div>');
  }

  var aud = audiencia;
  var s7 = section('Audi\u00eancia', '<div class="audience-row">'
    + '<div class="aud-block"><h3>G\u00eanero</h3><p><strong style="color:#2E2E32">' + (aud.pctMulheres || 0).toLocaleString('pt-BR') + '%</strong> Mulheres &nbsp; <strong style="color:#8E8E96">' + (aud.pctHomens || 0).toLocaleString('pt-BR') + '%</strong> Homens</p></div>'
    + '<div class="aud-block"><h3>Faixa Et\u00e1ria</h3><p class="age-big">' + esc(aud.faixaEtaria || '\u2014') + '</p></div>'
    + '<div class="aud-block"><h3>Top Cidades</h3>' + ((aud.cidades || []).length ? '<ol>' + aud.cidades.map(function(c) { return '<li>' + esc(c.nome) + ' <strong>' + c.pct.toLocaleString('pt-BR') + '%</strong></li>'; }).join('') + '</ol>' : '<p>Sem dados</p>') + '</div>'
    + '</div>');

  var heatmapHtml = '';
  if (postingHeatmap.length) {
    var best = postingHeatmap.reduce(function(b, h) { return h.avgEng > (b ? b.avgEng : 0) ? h : b; }, null);
    var days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'S\u00e1b'];
    if (best) {
      heatmapHtml = section('Melhor Hor\u00e1rio', '<p class="best-time">&#x2B50; <strong>' + days[best.day] + ' \u00e0s ' + best.hour + 'h</strong> \u2014 ' + best.avgEng + ' engajamento m\u00e9dio (' + best.count + ' posts)</p>'
        + '<p style="color:#666;font-size:11px;margin-top:8px">Top 5 hor\u00e1rios:</p><ol>'
        + postingHeatmap.slice().sort(function(a, b) { return b.avgEng - a.avgEng; }).slice(0, 5).map(function(h) { return '<li>' + days[h.day] + ' ' + h.hour + 'h \u2014 ' + h.avgEng + ' eng (' + h.count + ' posts)</li>'; }).join('')
        + '</ol>');
    }
  }

  // Jornada do publico (sem taxa entre etapas: ver comentario em metrics.js)
  var jornadaHtml = jornada.length
    ? section('Jornada do P\u00fablico',
        '<div class="jornada">' + jornada.map(function(e, i) {
          return '<div class="jor-etapa"><span class="jor-val">' + fmt(e.valor) + '</span>'
            + '<span class="jor-label">' + esc(e.etapa) + '</span></div>'
            + (i < jornada.length - 1 ? '<div class="jor-seta">&#x2193;</div>' : '');
        }).join('') + '</div>'
        + '<p class="jor-nota">Etapas medidas separadamente pela API do Instagram. Uma visita ao perfil pode ter vindo da busca ou de um post antigo, n\u00e3o necessariamente do alcance deste per\u00edodo &mdash; por isso n\u00e3o h\u00e1 taxa de convers\u00e3o entre as etapas.</p>')
    : '';

  // Analise & Recomendacoes: mesma regra do dashboard (recomendacoes.js)
  var lista = function(itens) {
    return '<ul class="rec-lista">' + itens.map(function(i) { return '<li>' + i + '</li>'; }).join('') + '</ul>';
  };
  var recHtml = section('An\u00e1lise & Recomenda\u00e7\u00f5es',
    kpiRow([
      { value: rec.saveRate.toLocaleString('pt-BR') + '%', label: 'Save Rate (ref. ' + rec.referencias.saveRate + '%)' },
      { value: rec.shareRate.toLocaleString('pt-BR') + '%', label: 'Share Rate (ref. ' + rec.referencias.shareRate + '%)' },
      { value: rec.taxaEng.toLocaleString('pt-BR') + '%', label: 'Engajamento (ref. ' + rec.referencias.engajamento + '%)' },
    ].concat(rec.bestReach ? [{ value: rec.bestReach.name, label: 'Melhor formato (alcance)' }] : []))
    + '<div class="rec-grid">'
    + '<div class="rec-col rec-ok"><h3>Continuar fazendo</h3>' + lista(rec.continuar) + '</div>'
    + '<div class="rec-col rec-warn"><h3>Melhorar</h3>' + lista(rec.melhorar) + '</div>'
    + '<div class="rec-col rec-stop"><h3>Parar de fazer</h3>' + lista(rec.parar) + '</div>'
    + '</div>');

  var css = '@page { size: A4; margin: 18mm 16mm; } @page :first { margin: 0; } * { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #1C1C1E; font-size: 13px; line-height: 1.6; background: #fff; } .cover { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #FFFFFF, #F4F4F6, #E4E4E8); page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .cover-inner { text-align: center; color: #1C1C1E; padding: 60px; } .cover-icon { font-size: 64px; margin-bottom: 20px; } .cover h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; font-family: Georgia, serif; } .cover-account { font-size: 20px; color: #55555C; margin-bottom: 28px; } .cover-period { font-size: 13px; color: #55555C; background: #E4E4E8; border-radius: 20px; padding: 6px 20px; display: inline-block; margin-bottom: 32px; } .cover-date { font-size: 12px; color: #8E8E96; margin-top: 24px; } .cover-brand { font-size: 10px; color: #8E8E96; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; } .section { margin-bottom: 28px; page-break-inside: avoid; } .section h2 { font-size: 16px; font-weight: 700; color: #1C1C1E; border-bottom: 2px solid #E4E4E8; padding-bottom: 6px; margin-bottom: 14px; } .resumo { padding-left: 18px; font-size: 13px; } .resumo li { margin-bottom: 7px; } .kpi-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; } .kpi { flex: 1; min-width: 120px; background: #F4F4F6; border: 1px solid #E4E4E8; border-radius: 8px; padding: 14px 16px; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .kpi-val { display: block; font-size: 22px; font-weight: 700; color: #1C1C1E; font-family: Georgia, serif; } .kpi-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #8E8E96; margin-top: 2px; } .kpi-delta { display: block; font-size: 11px; font-weight: 600; margin-top: 4px; } .kpi-delta.up { color: #1F7A55; } .kpi-delta.down { color: #B3402F; } .kpi-delta.neutro { color: #8E8E96; font-weight: 500; } .alc-barra { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: #E4E4E8; margin-top: 6px; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .alc-seg { background: #8E8E96; } .alc-nao { background: #2E2E32; } .alc-legenda { font-size: 11px; color: #55555C; margin-top: 8px; } .alc-dot-seg, .alc-dot-nao { display: inline-block; width: 8px; height: 8px; border-radius: 50%; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .alc-dot-seg { background: #8E8E96; } .alc-dot-nao { background: #2E2E32; } .data-table { width: 100%; border-collapse: collapse; font-size: 12px; } .data-table th { background: #2E2E32; color: #fff; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .data-table td { padding: 8px 12px; border-bottom: 1px solid #E4E4E8; } .data-table tr:nth-child(even) td { background: #F4F4F6; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .charts-row { display: flex; gap: 16px; } .chart-img { flex: 1; text-align: center; } .chart-img img { max-width: 100%; height: auto; border: 1px solid #E4E4E8; border-radius: 6px; } .chart-label { font-size: 11px; color: #8E8E96; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; } .top-posts { display: flex; flex-direction: column; gap: 8px; } .top-post { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #F4F4F6; border-radius: 6px; border: 1px solid #E4E4E8; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .post-type { font-size: 11px; font-weight: 700; color: #2E2E32; text-transform: uppercase; } .post-stats { font-size: 12px; color: #55555C; } .audience-row { display: flex; gap: 16px; } .aud-block { flex: 1; background: #F4F4F6; border: 1px solid #E4E4E8; border-radius: 8px; padding: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .aud-block h3 { font-size: 11px; text-transform: uppercase; color: #55555C; letter-spacing: 0.5px; margin-bottom: 8px; } .aud-block ol { padding-left: 18px; font-size: 12px; } .aud-block li { margin-bottom: 4px; } .age-big { font-size: 28px; font-weight: 700; color: #2E2E32; font-family: Georgia, serif; } .best-time { font-size: 15px; color: #1C1C1E; } .jornada { display: flex; flex-direction: column; align-items: center; } .jor-etapa { width: 100%; max-width: 320px; text-align: center; padding: 10px 14px; background: #F4F4F6; border: 1px solid #E4E4E8; border-radius: 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .jor-val { display: block; font-size: 20px; font-weight: 700; color: #2E2E32; font-family: Georgia, serif; } .jor-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #8E8E96; } .jor-seta { color: #C3C3C9; padding: 4px 0; } .jor-nota { margin-top: 12px; font-size: 10px; color: #8E8E96; text-align: center; line-height: 1.5; } .rec-grid { display: flex; gap: 12px; margin-top: 12px; } .rec-col { flex: 1; background: #F4F4F6; border: 1px solid #E4E4E8; border-radius: 8px; padding: 14px; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .rec-col h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; } .rec-ok h3 { color: #1F7A55; } .rec-warn h3 { color: #8A6100; } .rec-stop h3 { color: #B3402F; } .rec-lista { padding-left: 16px; font-size: 11px; color: #55555C; } .rec-lista li { margin-bottom: 6px; line-height: 1.5; } .footer { text-align: center; font-size: 10px; color: #8E8E96; margin-top: 40px; padding-top: 16px; border-top: 1px solid #E4E4E8; }';

  var footer = '<div class="footer">Relat\u00f3rio gerado automaticamente por Instagram Dashboard \u00b7 ' + esc(today) + '</div>';

  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relat\u00f3rio @' + esc(username) + '</title><style>' + css + '</style></head><body>'
    // Mesma ordem do dashboard: resumo -> crescimento -> alcance -> engajamento
    // -> audiencia -> formatos -> horario -> top posts -> stories -> jornada -> analise
    + cover + s0 + s1 + s1b + s2 + chartsHtml + s7 + s4 + heatmapHtml + topPostsHtml
    + s5 + jornadaHtml + recHtml + footer
    + '</body></html>';
}

export function openPdfReport(data, deltas) {
  var canvasImages = {};
  document.querySelectorAll('canvas').forEach(function(c) {
    try { canvasImages[c.id] = c.toDataURL('image/png'); } catch (e) {}
  });

  var html = generateReportHTML(data, deltas, canvasImages);
  var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var win = window.open(url, '_blank');
  if (!win) { alert('Popup bloqueado. Permita popups para gerar o PDF.'); return; }
  win.onload = function() { setTimeout(function() { win.print(); URL.revokeObjectURL(url); }, 400); };
}
