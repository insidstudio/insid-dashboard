function fmt(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('pt-BR');
}

function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function kpiRow(items) {
  return '<div class="kpi-row">' + items.map(function(k) {
    return '<div class="kpi"><span class="kpi-val">' + esc(k.value) + '</span><span class="kpi-label">' + esc(k.label) + '</span>'
    + (k.delta != null && k.delta !== 0 ? '<span class="kpi-delta ' + (k.delta > 0 ? 'up' : 'down') + '">' + (k.delta > 0 ? '+' : '') + k.delta + '%</span>' : '')
    + '</div>';
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

  var s1 = section('Crescimento & Alcance', kpiRow([
    { value: fmt(crescimento.seguidoresTotal), label: 'Seguidores', delta: d.seguidores },
    { value: fmt(crescimento.novosSeguidores), label: 'Novos Seguidores', delta: d.novosSeguidores },
    { value: fmt(alcance.contasAlcancadas), label: 'Alcance', delta: d.alcance },
    { value: fmt(alcance.impressoes), label: 'Impress\u00f5es', delta: d.impressoes },
  ]));

  var s2 = section('Engajamento', kpiRow([
    { value: fmt(engajamento.curtidas), label: 'Curtidas', delta: d.curtidas },
    { value: fmt(engajamento.comentarios), label: 'Coment\u00e1rios', delta: d.comentarios },
    { value: fmt(engajamento.salvamentos), label: 'Salvamentos', delta: d.salvamentos },
    { value: fmt(engajamento.compartilhamentos), label: 'Compartilhamentos', delta: d.compartilhamentos },
  ]) + kpiRow([
    { value: fmt(engajamento.interacoesTotal), label: 'Intera\u00e7\u00f5es Total', delta: d.interacoesTotal },
    { value: (engajamento.taxaEngajamento || 0) + '%', label: 'Taxa de Engajamento', delta: d.taxaEngajamento },
  ]));

  var chartsHtml = '';
  if (canvasImages && (canvasImages.chartWeekly || canvasImages.chartContent)) {
    chartsHtml = '<div class="section"><h2>An\u00e1lise Visual</h2><div class="charts-row">';
    if (canvasImages.chartWeekly) chartsHtml += '<div class="chart-img"><p class="chart-label">Engajamento Semanal</p><img src="' + canvasImages.chartWeekly + '"></div>';
    if (canvasImages.chartContent) chartsHtml += '<div class="chart-img"><p class="chart-label">Mix de Conte\u00fado</p><img src="' + canvasImages.chartContent + '"></div>';
    chartsHtml += '</div></div>';
  }

  var cp = contentPerformance;
  var s4 = section('Performance por Formato', '<table class="data-table"><thead><tr><th>Formato</th><th>Qty</th><th>M\u00e9dia Views</th><th>M\u00e9dia Curtidas</th><th>M\u00e9dia Saves</th></tr></thead><tbody>'
    + '<tr><td>Reels</td><td>' + (cp.reels ? cp.reels.count : 0) + '</td><td>' + fmt(cp.reels ? cp.reels.avgViews : 0) + '</td><td>' + fmt(cp.reels ? cp.reels.avgLikes : 0) + '</td><td>' + fmt(cp.reels ? cp.reels.avgSaves : 0) + '</td></tr>'
    + '<tr><td>Carross\u00e9is</td><td>' + (cp.carrosseis ? cp.carrosseis.count : 0) + '</td><td>' + fmt(cp.carrosseis ? cp.carrosseis.avgViews : 0) + '</td><td>' + fmt(cp.carrosseis ? cp.carrosseis.avgLikes : 0) + '</td><td>' + fmt(cp.carrosseis ? cp.carrosseis.avgSaves : 0) + '</td></tr>'
    + '<tr><td>Posts</td><td>' + (cp.posts ? cp.posts.count : 0) + '</td><td>' + fmt(cp.posts ? cp.posts.avgViews : 0) + '</td><td>' + fmt(cp.posts ? cp.posts.avgLikes : 0) + '</td><td>' + fmt(cp.posts ? cp.posts.avgSaves : 0) + '</td></tr>'
    + '</tbody></table>');

  var s5 = section('Stories', kpiRow([
    { value: fmt(storiesPerformance.alcanceMedio), label: 'Alcance M\u00e9dio' },
    { value: (storiesPerformance.retencaoPct || 0) + '%', label: 'Reten\u00e7\u00e3o' },
    { value: fmt(storiesPerformance.respostas), label: 'Respostas' },
    { value: String(conteudo.stories || 0), label: 'Stories Publicados' },
  ]));

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
    + '<div class="aud-block"><h3>G\u00eanero</h3><p><strong style="color:#c0457b">' + (aud.pctMulheres || 0) + '%</strong> Mulheres &nbsp; <strong style="color:#2471a3">' + (aud.pctHomens || 0) + '%</strong> Homens</p></div>'
    + '<div class="aud-block"><h3>Faixa Et\u00e1ria</h3><p class="age-big">' + esc(aud.faixaEtaria || '\u2014') + '</p></div>'
    + '<div class="aud-block"><h3>Top Cidades</h3>' + ((aud.cidades || []).length ? '<ol>' + aud.cidades.map(function(c) { return '<li>' + esc(c.nome) + ' <strong>' + c.pct + '%</strong></li>'; }).join('') + '</ol>' : '<p>Sem dados</p>') + '</div>'
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

  var css = '@page { size: A4; margin: 18mm 16mm; } @page :first { margin: 0; } * { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #1a1a1a; font-size: 13px; line-height: 1.6; } .cover { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: linear-gradient(135deg, #0D0D0D, #161616, #222222); page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .cover-inner { text-align: center; color: #FFF7EC; padding: 60px; } .cover-icon { font-size: 64px; margin-bottom: 20px; } .cover h1 { font-size: 32px; font-weight: 700; margin-bottom: 8px; font-family: Georgia, serif; } .cover-account { font-size: 20px; color: #C8A96E; margin-bottom: 28px; } .cover-period { font-size: 13px; color: rgba(255,247,236,0.6); background: rgba(255,247,236,0.08); border-radius: 20px; padding: 6px 20px; display: inline-block; margin-bottom: 32px; } .cover-date { font-size: 12px; color: rgba(255,247,236,0.4); margin-top: 24px; } .cover-brand { font-size: 10px; color: rgba(255,247,236,0.25); letter-spacing: 2px; text-transform: uppercase; margin-top: 8px; } .section { margin-bottom: 28px; page-break-inside: avoid; } .section h2 { font-size: 16px; font-weight: 700; color: #C8A96E; border-bottom: 2px solid #f0e0e0; padding-bottom: 6px; margin-bottom: 14px; } .kpi-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; } .kpi { flex: 1; min-width: 120px; background: #f5f2ec; border: 1px solid #e0d8cc; border-radius: 8px; padding: 14px 16px; text-align: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .kpi-val { display: block; font-size: 22px; font-weight: 700; color: #1a1a1a; font-family: Georgia, serif; } .kpi-label { display: block; font-size: 9px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; margin-top: 2px; } .kpi-delta { display: block; font-size: 11px; font-weight: 600; margin-top: 4px; } .kpi-delta.up { color: #00a878; } .kpi-delta.down { color: #d63031; } .data-table { width: 100%; border-collapse: collapse; font-size: 12px; } .data-table th { background: #C8A96E; color: #fff; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .data-table td { padding: 8px 12px; border-bottom: 1px solid #eee; } .data-table tr:nth-child(even) td { background: #f5f2ec; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .charts-row { display: flex; gap: 16px; } .chart-img { flex: 1; text-align: center; } .chart-img img { max-width: 100%; height: auto; border: 1px solid #eee; border-radius: 6px; } .chart-label { font-size: 11px; color: #888; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; } .top-posts { display: flex; flex-direction: column; gap: 8px; } .top-post { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f5f2ec; border-radius: 6px; border: 1px solid #e0d8cc; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .post-type { font-size: 11px; font-weight: 700; color: #C8A96E; text-transform: uppercase; } .post-stats { font-size: 12px; color: #555; } .audience-row { display: flex; gap: 16px; } .aud-block { flex: 1; background: #f5f2ec; border: 1px solid #e0d8cc; border-radius: 8px; padding: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .aud-block h3 { font-size: 11px; text-transform: uppercase; color: #C8A96E; letter-spacing: 0.5px; margin-bottom: 8px; } .aud-block ol { padding-left: 18px; font-size: 12px; } .aud-block li { margin-bottom: 4px; } .age-big { font-size: 28px; font-weight: 700; color: #C8A96E; font-family: Georgia, serif; } .best-time { font-size: 15px; color: #1a1a1a; } .footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 40px; padding-top: 16px; border-top: 1px solid #eee; }';

  var footer = '<div class="footer">Relat\u00f3rio gerado automaticamente por Instagram Dashboard \u00b7 ' + esc(today) + '</div>';

  return '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relat\u00f3rio @' + esc(username) + '</title><style>' + css + '</style></head><body>'
    + cover + s1 + s2 + chartsHtml + s4 + s5 + topPostsHtml + s7 + heatmapHtml + footer
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
