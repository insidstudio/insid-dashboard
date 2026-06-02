import { isConfigured, loadServerConfig, getCache, saveCache, getLastUpdated, clearAll, getTokenDaysRemaining, getAccounts, getActiveAccountId, setActiveAccount, removeAccount, removeStaleAccounts, syncFromCloud } from './storage.js';
import { initSupabase } from './supabase-client.js';
import { fetchAllMetrics } from './metrics.js';
import { renderHeader, renderDashboard, initEvolutionCharts } from './ui.js';
import { saveSnapshot, pruneOldSnapshots, getSnapshotsByAccount, getPreviousSnapshot, computeDeltas } from './history-store.js';
import { openPdfReport } from './pdf-report.js';

let currentDays = 30;
let customRange = null;

function showLoading(dashboard) {
  dashboard.innerHTML = `<div class="loading" id="loading">
    <div class="spinner"></div>
    <p>Carregando métricas...</p>
  </div>`;
}

function showError(dashboard, message) {
  dashboard.innerHTML = `<div class="loading">
    <p style="color:var(--negative);font-weight:600">Erro ao carregar métricas</p>
    <p style="color:var(--text-secondary);font-size:13px;max-width:420px;text-align:center">${String(message ?? '')}</p>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-primary" id="btnRetry">Tentar Novamente</button>
      <button class="btn btn-danger" id="btnReconfigure">Reconfigurar</button>
    </div>
  </div>`;
}

function checkTokenExpiry() {
  const warning = document.getElementById('tokenWarning');
  if (!warning) return;
  const remaining = getTokenDaysRemaining();
  if (remaining === null) return;
  if (remaining <= 0) {
    warning.className = 'token-warning visible';
    warning.textContent = '⚠️ Seu token expirou. Gere um novo no Meta Developer e reconecte.';
  } else if (remaining <= 7) {
    warning.className = 'token-warning visible';
    warning.textContent = `⚠️ Seu token expira em ${remaining} dia${remaining === 1 ? '' : 's'}. Renove-o no Meta Developer.`;
  }
}

function setupDatePickerDefaults() {
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
  if (!dateFrom || !dateTo) return;

  const today = new Date();
  const maxDate = today.toISOString().slice(0, 10);
  const minDate = new Date();
  minDate.setDate(minDate.getDate() - 93);

  dateFrom.max = maxDate;
  dateFrom.min = minDate.toISOString().slice(0, 10);
  dateTo.max = maxDate;
  dateTo.min = minDate.toISOString().slice(0, 10);

  if (customRange) {
    dateFrom.value = customRange.since;
    dateTo.value = customRange.until;
  } else {
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);
    dateFrom.value = defaultFrom.toISOString().slice(0, 10);
    dateTo.value = maxDate;
  }
}

async function exportHTML() {
  const btn = document.getElementById('btnExport');
  if (btn) { btn.textContent = 'Gerando...'; btn.disabled = true; }

  try {
    // Extract CSS from already-loaded stylesheets (no fetch needed)
    let cssText = '';
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = Array.from(sheet.cssRules || []);
        cssText += rules.map(r => r.cssText).join('\n');
      } catch (_) {
        // cross-origin sheet (e.g. Google Fonts) — skip, keep the <link> tag
      }
    }

    // Convert canvases to PNG before cloning (canvas state is lost on clone)
    const canvasMap = new Map();
    document.querySelectorAll('canvas').forEach(canvas => {
      try { canvasMap.set(canvas.id, canvas.toDataURL('image/png')); } catch (_) {}
    });

    // Clone full DOM
    const clone = document.documentElement.cloneNode(true);

    // Replace each canvas with a static <img>
    clone.querySelectorAll('canvas').forEach(c => {
      const dataUrl = canvasMap.get(c.id);
      if (!dataUrl) return;
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.cssText = 'width:100%;height:300px;object-fit:contain';
      c.replaceWith(img);
    });

    // Remove scripts and local CSS link (will inline instead)
    clone.querySelectorAll('script').forEach(s => s.remove());
    clone.querySelectorAll('link[rel="stylesheet"][href*="style.css"]').forEach(l => l.remove());

    // Inline extracted CSS
    if (cssText) {
      const style = document.createElement('style');
      style.textContent = cssText;
      clone.querySelector('head').appendChild(style);
    }

    // Remove interactive buttons that won't work statically
    ['btnRefresh', 'btnExport', 'btnDisconnect'].forEach(id => {
      const el = clone.querySelector('#' + id);
      if (el) el.remove();
    });
    clone.querySelectorAll('.date-filter, .custom-range-picker, .token-warning').forEach(el => el.remove());

    // Build filename from username
    const username = document.querySelector('.header-username')?.textContent?.replace('@', '').trim() || 'instagram';
    const date = new Date().toISOString().slice(0, 10);
    const filename = `painel-@${username}-${date}.html`;

    // Trigger download
    const blob = new Blob(['<!DOCTYPE html>\n' + clone.outerHTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (err) {
    alert('Erro ao exportar: ' + err.message);
  } finally {
    if (btn) { btn.textContent = '⬇ Exportar HTML'; btn.disabled = false; }
  }
}

async function loadDashboard(forceRefresh = false, days = currentDays) {
  const dashboard = document.getElementById('dashboard');
  showLoading(dashboard);

  const isCustom = customRange !== null;

  let data;
  try {
    if (!forceRefresh && !isCustom) {
      data = getCache(days);
    }

    if (!data) {
      if (isCustom) {
        data = await fetchAllMetrics(days, customRange.since, customRange.until);
      } else {
        data = await fetchAllMetrics(days);
      }
      if (!isCustom) saveCache(data, days);
    }

    const accountId = getActiveAccountId();
    let deltas = null;
    if (accountId) {
      await saveSnapshot(accountId, data).catch(() => {});
      pruneOldSnapshots(accountId).catch(() => {});

      const prev = await getPreviousSnapshot(accountId).catch(() => null);
      if (prev?.kpis) {
        const currentKpis = {
          seguidores: data.crescimento?.seguidoresTotal ?? 0,
          novosSeguidores: data.crescimento?.novosSeguidores ?? 0,
          alcance: data.alcance?.contasAlcancadas ?? 0,
          impressoes: data.alcance?.impressoes ?? 0,
          curtidas: data.engajamento?.curtidas ?? 0,
          comentarios: data.engajamento?.comentarios ?? 0,
          salvamentos: data.engajamento?.salvamentos ?? 0,
          compartilhamentos: data.engajamento?.compartilhamentos ?? 0,
          interacoesTotal: data.engajamento?.interacoesTotal ?? 0,
          taxaEngajamento: data.engajamento?.taxaEngajamento ?? 0,
        };
        deltas = computeDeltas(currentKpis, prev.kpis);
        if (deltas) deltas._prevDate = prev.date;
      }
    }

    renderHeader(data, days, data.periodo, getAccounts(), getActiveAccountId(), isCustom);
    renderDashboard(data, deltas);

    // Load evolution charts from IndexedDB
    if (accountId) {
      getSnapshotsByAccount(accountId).then(snaps => {
        initEvolutionCharts(snaps);
      }).catch(() => {});
    }

    const lastUpdated = getLastUpdated();
    const timestamp = document.querySelector('.header-timestamp');
    if (timestamp && lastUpdated) {
      const date = new Date(lastUpdated);
      timestamp.textContent = `Atualizado: ${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    }

    // Account switcher toggle
    const switcherBtn = document.getElementById('accountSwitcherBtn');
    const switcherDropdown = document.getElementById('accountSwitcherDropdown');
    if (switcherBtn && switcherDropdown) {
      switcherBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        switcherDropdown.classList.toggle('open');
      });
      document.addEventListener('click', () => switcherDropdown.classList.remove('open'), { once: false });
    }

    // Account item clicks
    document.querySelectorAll('.acc-item[data-account-id]').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.accountId;
        if (id !== getActiveAccountId()) {
          setActiveAccount(id);
          currentDays = 30;
          customRange = null;
          loadDashboard(false);
        }
      });
    });

    // Add account
    const btnAddAccount = document.getElementById('btnAddAccount');
    if (btnAddAccount) btnAddAccount.addEventListener('click', () => { window.location.href = 'index.html?add=1'; });

    // Preset date filter buttons (7d, 14d, 30d)
    document.querySelectorAll('.date-filter-btn[data-days]').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = parseInt(btn.dataset.days, 10);
        customRange = null;
        if (d !== currentDays || isCustom) {
          currentDays = d;
          loadDashboard(true, d);
        }
      });
    });

    // Custom range toggle
    const btnCustomRange = document.getElementById('btnCustomRange');
    const pickerEl = document.getElementById('customRangePicker');
    if (btnCustomRange && pickerEl) {
      btnCustomRange.addEventListener('click', () => {
        pickerEl.classList.toggle('visible');
        setupDatePickerDefaults();
      });
    }

    // Apply custom range
    const btnApplyRange = document.getElementById('btnApplyRange');
    if (btnApplyRange) {
      setupDatePickerDefaults();
      btnApplyRange.addEventListener('click', () => {
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        if (!dateFrom?.value || !dateTo?.value) return;

        const from = new Date(dateFrom.value);
        const to = new Date(dateTo.value);

        if (from > to) {
          alert('A data inicial deve ser anterior \u00e0 data final.');
          return;
        }

        const diffDays = Math.round((to - from) / 86400000);
        if (diffDays > 93) {
          alert('O per\u00edodo m\u00e1ximo \u00e9 de 93 dias (limite da API do Instagram).');
          return;
        }

        customRange = { since: dateFrom.value, until: dateTo.value };
        currentDays = diffDays;
        loadDashboard(true, diffDays);
      });
    }

    // Refresh
    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) btnRefresh.addEventListener('click', () => loadDashboard(true, currentDays));

    // Export HTML
    const btnExport = document.getElementById('btnExport');
    if (btnExport) btnExport.addEventListener('click', exportHTML);

    // Export PDF
    const btnExportPdf = document.getElementById('btnExportPdf');
    if (btnExportPdf) {
      btnExportPdf.addEventListener('click', () => openPdfReport(data, deltas));
    }

    // AI Analysis
    const btnAi = document.getElementById('btnAiAnalysis');
    if (btnAi) {
      btnAi.addEventListener('click', async () => {
        btnAi.textContent = 'Analisando...';
        btnAi.disabled = true;
        try {
          const best = (data.postingHeatmap || []).reduce((b, h) => h.avgEng > (b ? b.avgEng : 0) ? h : b, null);
          const days = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
          const payload = {
            username: data.account?.username,
            periodo: data.periodo ? data.periodo.desde + ' a ' + data.periodo.ate : currentDays + ' dias',
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
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await res.json();
          if (result.error) throw new Error(result.error);
          const section = document.getElementById('aiAnalysisSection');
          if (section) {
            section.style.display = '';
            section.querySelector('.ai-analysis-content').textContent = result.analysis;
          }
        } catch (err) {
          alert('Erro na analise IA: ' + err.message);
        } finally {
          btnAi.textContent = '\ud83e\udd16 IA';
          btnAi.disabled = false;
        }
      });
    }

    // Disconnect (remove active account; if last one, clear all)
    const btnDisconnect = document.getElementById('btnDisconnect');
    if (btnDisconnect) {
      btnDisconnect.addEventListener('click', () => {
        const accounts = getAccounts();
        const label = accounts.find(a => a.id === getActiveAccountId())?.label || 'esta conta';
        const msg = accounts.length > 1
          ? `Remover ${label} do dashboard?`
          : 'Tem certeza que deseja desconectar? Todos os dados serão apagados.';
        if (confirm(msg)) {
          if (accounts.length > 1) {
            removeAccount(getActiveAccountId());
            currentDays = 30;
            customRange = null;
            loadDashboard(false);
          } else {
            clearAll();
            window.location.href = 'index.html';
          }
        }
      });
    }

    checkTokenExpiry();

  } catch (err) {
    const isTokenError = /token|OAuth|permission|login/i.test(err.message);
    if (isTokenError) {
      clearAll();
      window.location.href = 'index.html';
      return;
    }

    showError(dashboard, err.message);

    const btnRetry = document.getElementById('btnRetry');
    if (btnRetry) btnRetry.addEventListener('click', () => loadDashboard(true, currentDays));

    const btnReconfigure = document.getElementById('btnReconfigure');
    if (btnReconfigure) btnReconfigure.addEventListener('click', () => { clearAll(); window.location.href = 'index.html'; });
  }
}

loadServerConfig().then(async () => {
  await initSupabase();
  await syncFromCloud();
  removeStaleAccounts();
  if (!isConfigured()) {
    window.location.href = 'index.html';
  } else {
    loadDashboard(false);
  }
});
