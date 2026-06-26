// ai-report.js — Relatório IA sob demanda (seções estruturadas)

function buildSectionsHTML(s, username) {
  const fmt = (n) => n != null ? Number(n).toLocaleString('pt-BR') : 'N/D';
  const badges = { REEL: '#7ec8a0', CARROSSEL: '#88b0cc', STORY: '#C8A96E' };

  const destacadosHTML = (s.destaques || []).map(d => `
    <div class="ai-card-sm">
      <div class="ai-card-val">${d.valor}</div>
      <div class="ai-card-title">${d.titulo}</div>
      <div class="ai-card-desc">${d.descricao}</div>
    </div>`).join('');

  const opHTML = (s.oportunidades || []).map(o => `
    <div class="ai-oportunidade">
      <div class="ai-op-num">${o.numero}</div>
      <div class="ai-op-body">
        <div class="ai-op-title">${o.titulo}</div>
        <div class="ai-op-tag">POR QUÊ</div>
        <div class="ai-op-text">${o.porQue}</div>
        <div class="ai-op-tag">COMO TESTAR</div>
        <div class="ai-op-text">${o.comoTestar}</div>
      </div>
    </div>`).join('');

  const ideiasHTML = (s.ideias || []).map(i => {
    const cor = badges[i.formato] || '#C8A96E';
    return `
    <div class="ai-ideia">
      <div class="ai-ideia-header">
        <span class="ai-ideia-num">0${i.numero}</span>
        <span class="ai-ideia-badge" style="background:${cor}22;color:${cor}">${i.formato}</span>
      </div>
      <div class="ai-ideia-title">${i.titulo}</div>
      <div class="ai-ideia-desc">${i.descricao}</div>
    </div>`;
  }).join('');

  const c = s.cruzamento || {};
  return `
  <div class="ai-report-wrap">
    <div class="ai-report-header">
      <div class="section-eyebrow">ANÁLISE IA</div>
      <h2 class="section-title">Resumo Executivo</h2>
    </div>

    <div class="ai-resumo-grid">
      <div class="ai-resumo-text">${s.resumo || ''}</div>
      <div class="ai-cards-sm">${destacadosHTML}</div>
    </div>

    <div class="ai-section-divider"></div>

    <div class="ai-report-header">
      <div class="section-eyebrow">OPORTUNIDADES NÃO EXPLORADAS</div>
      <h2 class="section-title">O que fazer agora</h2>
    </div>
    <div class="ai-oportunidades">${opHTML}</div>

    <div class="ai-section-divider"></div>

    <div class="ai-report-header">
      <div class="section-eyebrow">BASEADAS NOS TOP PERFORMERS</div>
      <h2 class="section-title">5 Ideias de Conteúdo</h2>
    </div>
    <div class="ai-ideias-grid">${ideiasHTML}</div>

    <div class="ai-section-divider"></div>

    <div class="ai-report-header">
      <div class="section-eyebrow">INTELIGÊNCIA DE DADOS</div>
      <h2 class="section-title">Cruzamento de Dados</h2>
    </div>
    <div class="ai-cruzamento-top">
      <div class="ai-cruz-card ai-cruz-destaque">
        <div class="ai-cruz-label">🏆 Destaques do período</div>
        <div class="ai-cruz-text">${c.destaque || ''}</div>
      </div>
      <div class="ai-cruz-card ai-cruz-atencao">
        <div class="ai-cruz-label">📌 Ponto de atenção</div>
        <div class="ai-cruz-text">${c.atencao || ''}</div>
      </div>
    </div>
    <div class="ai-cruzamento-bottom">
      <div class="ai-cruz-pill ai-cp-green">✅ CONTINUAR<br><span>${c.continuar || ''}</span></div>
      <div class="ai-cruz-pill ai-cp-yellow">📝 MELHORAR<br><span>${c.melhorar || ''}</span></div>
      <div class="ai-cruz-pill ai-cp-red">🔴 PARAR / REDIRECIONAR<br><span>${c.parar || ''}</span></div>
    </div>
  </div>`;
}

function injectStyles() {
  if (document.getElementById('ai-report-styles')) return;
  const style = document.createElement('style');
  style.id = 'ai-report-styles';
  style.textContent = `
  .ai-report-wrap{padding:8px 0 32px}
  .ai-report-header{margin:0 0 18px}
  .ai-section-divider{height:1px;background:var(--border);margin:36px 0}
  .ai-resumo-grid{display:grid;grid-template-columns:1.4fr 1fr;gap:20px;align-items:start}
  .ai-resumo-text{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;font-size:14px;line-height:1.75;color:var(--text-primary)}
  .ai-cards-sm{display:flex;flex-direction:column;gap:12px}
  .ai-card-sm{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px 18px}
  .ai-card-val{font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--rose-gold)}
  .ai-card-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-secondary);margin:4px 0 6px}
  .ai-card-desc{font-size:12px;color:var(--text-secondary);line-height:1.5}
  .ai-oportunidades{display:flex;flex-direction:column;gap:14px}
  .ai-oportunidade{display:flex;gap:18px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px 24px}
  .ai-op-num{width:32px;height:32px;border-radius:50%;background:var(--berry);color:var(--cream);font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .ai-op-body{flex:1}
  .ai-op-title{font-size:15px;font-weight:600;color:var(--text-primary);margin-bottom:10px}
  .ai-op-tag{font-size:9px;font-weight:700;letter-spacing:.9px;color:var(--rose-gold);text-transform:uppercase;margin:8px 0 4px;background:rgba(200,169,110,.1);border-radius:4px;padding:2px 6px;display:inline-block}
  .ai-op-text{font-size:13px;color:var(--text-secondary);line-height:1.6}
  .ai-ideias-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
  .ai-ideia{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:20px}
  .ai-ideia-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
  .ai-ideia-num{font-family:var(--font-display);font-size:22px;font-weight:700;color:var(--text-muted)}
  .ai-ideia-badge{font-size:9px;font-weight:700;padding:3px 8px;border-radius:20px;letter-spacing:.5px}
  .ai-ideia-title{font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:8px;line-height:1.4}
  .ai-ideia-desc{font-size:12px;color:var(--text-secondary);line-height:1.55}
  .ai-cruzamento-top{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
  .ai-cruz-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:22px}
  .ai-cruz-destaque{border-color:rgba(126,200,160,.3);background:rgba(126,200,160,.05)}
  .ai-cruz-atencao{border-color:rgba(200,169,110,.3);background:rgba(200,169,110,.05)}
  .ai-cruz-label{font-size:11px;font-weight:700;color:var(--accent);margin-bottom:10px}
  .ai-cruz-text{font-size:13px;color:var(--text-secondary);line-height:1.6}
  .ai-cruzamento-bottom{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
  .ai-cruz-pill{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:16px;font-size:10px;font-weight:700;letter-spacing:.7px;text-transform:uppercase;line-height:1.4}
  .ai-cruz-pill span{display:block;font-size:12px;font-weight:400;text-transform:none;letter-spacing:0;color:var(--text-secondary);margin-top:8px;line-height:1.5}
  .ai-cp-green{color:var(--positive)}
  .ai-cp-yellow{color:var(--rose-gold)}
  .ai-cp-red{color:var(--negative)}
  .ai-text-fallback{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;font-size:14px;line-height:1.75;white-space:pre-wrap;color:var(--text-primary)}
  @media(max-width:768px){
    .ai-resumo-grid,.ai-cruzamento-top,.ai-cruzamento-bottom{grid-template-columns:1fr}
    .ai-ideias-grid{grid-template-columns:1fr}
  }`;
  document.head.appendChild(style);
}

// Patch the AI button on load
document.addEventListener('DOMContentLoaded', () => {
  // Re-attach after dashboard renders (it re-renders on loadDashboard)
  const observer = new MutationObserver(() => {
    const btn = document.getElementById('btnAiAnalysis');
    if (btn && !btn.__aiPatched) {
      btn.__aiPatched = true;
      btn.textContent = '\u{1F916} Relatório IA';
      btn.addEventListener('click', async () => {
        // Collect payload from cached dashboard data
        const cacheKey = Object.keys(localStorage).find(k => k.startsWith('ig_cache_') && k.endsWith('_30d'));
        if (!cacheKey) { alert('Carregue os dados primeiro.'); return; }
        let data;
        try { data = JSON.parse(localStorage.getItem(cacheKey)); } catch { return; }
        const best = (data.postingHeatmap || []).reduce((b, h) => h.avgEng > (b ? b.avgEng : 0) ? h : b, null);
        const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
        const payload = {
          username: data.account?.username,
          periodo: data.periodo ? data.periodo.desde + ' a ' + data.periodo.ate : '30 dias',
          seguidores: data.crescimento?.seguidoresTotal,
          novosSeguidores: data.crescimento?.novosSeguidores,
          alcance: data.alcance?.contasAlcancadas,
          impressoes: data.alcance?.impressoes,
          curtidas: data.engajamento?.curtidas,
          comentarios: data.engajamento?.comentarios,
          salvamentos: data.engajamento?.salvamentos,
          compartilhamentos: data.engajamento?.compartilhamentos,
          interacoesTotal: data.engajamento?.interacoesTotal,
          taxaEngajamento: data.engajamento?.taxaEngajamento,
          toquesLinkBio: data.acoesPerfil?.toquesLinkBio,
          reels: data.conteudo?.reels,
          carrosseis: data.conteudo?.carrosseis,
          postsEstaticos: data.conteudo?.postsEstaticos,
          stories: data.conteudo?.stories,
          pctMulheres: data.audiencia?.pctMulheres,
          pctHomens: data.audiencia?.pctHomens,
          faixaEtaria: data.audiencia?.faixaEtaria,
          cidades: data.audiencia?.cidades,
          melhorHorario: best ? days[best.day] + ' ' + best.hour + 'h' : null,
        };
        btn.textContent = 'Analisando...';
        btn.disabled = true;
        try {
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await res.json();
          if (result.error) throw new Error(result.error);
          injectStyles();
          const section = document.getElementById('aiAnalysisSection');
          if (section) {
            section.style.display = '';
            section.innerHTML = result.sections
              ? buildSectionsHTML(result.sections)
              : `<div class="ai-text-fallback">${result.analysis || ''}</div>`;
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } catch (err) {
          alert('Erro: ' + err.message);
        } finally {
          btn.textContent = '\u{1F916} Relatório IA';
          btn.disabled = false;
        }
      });
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
});