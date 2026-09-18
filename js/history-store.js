import { getSupabase, isCloudEnabled } from './supabase-client.js';

const DB_NAME = 'ig_metrics_history';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('accountDate', ['accountId', 'date'], { unique: false });
        store.createIndex('accountId', 'accountId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Data local no formato YYYY-MM-DD.
 *
 * `toISOString()` devolve a data em UTC: no Brasil (UTC-3), qualquer coleta
 * feita depois das 21h era gravada com a data do dia seguinte, criando dois
 * snapshots para o mesmo dia de uso.
 */
function hojeLocal() {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function extractKPIs(data) {
  return {
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
    toquesLinkBio: data.acoesPerfil?.toquesLinkBio ?? 0,
    reels: data.conteudo?.reels ?? 0,
    carrosseis: data.conteudo?.carrosseis ?? 0,
    postsEstaticos: data.conteudo?.postsEstaticos ?? 0,
    stories: data.conteudo?.stories ?? 0,
  };
}

export async function saveSnapshot(accountId, data) {
  const db = await openDB();
  const today = hojeLocal();
  const days = data.periodo?.dias ?? 30;

  // Avoid duplicate snapshots for the same account+date+days
  const existing = await getSnapshotsByAccount(accountId);
  const duplicate = existing.find(s => s.date === today && s.days === days);
  if (duplicate) {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const atualizado = { ...duplicate, kpis: extractKPIs(data), updatedAt: new Date().toISOString() };
    tx.objectStore(STORE_NAME).put(atualizado);
    _cloudSaveSnapshot(atualizado);
    _insidSaveSnapshot(atualizado);
    return;
  }

  const snapshot = {
    accountId,
    date: today,
    days,
    periodo: data.periodo ?? null,
    kpis: extractKPIs(data),
    createdAt: new Date().toISOString(),
  };

  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).add(snapshot);
  _cloudSaveSnapshot(snapshot);
  _insidSaveSnapshot(snapshot);
}

/**
 * Sobe a coleta pro Sistema INSID. Quem guarda a chave é o servidor daqui
 * (/api/insid-sync), então o navegador nunca vê segredo nenhum.
 *
 * Falhar aqui não pode quebrar o dashboard: o histórico local já foi gravado
 * antes desta chamada. Mas falhar calado foi o que escondeu o Supabase morto
 * por meses, então o erro vai pro console.
 */
async function _insidSaveSnapshot(snapshot) {
  const username = _usernameDaConta(snapshot.accountId);
  if (!username) return;
  try {
    const r = await fetch('/api/insid-sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username,
        date: snapshot.date,
        days: snapshot.days,
        kpis: snapshot.kpis,
      }),
    });
    if (!r.ok) {
      // 501 é o caso normal de quem ainda não configurou a ponte.
      if (r.status !== 501) console.warn('[insid] coleta não subiu:', r.status, await r.text());
    }
  } catch (e) {
    console.warn('[insid] Sistema INSID fora do ar:', e);
  }
}

function _usernameDaConta(accountId) {
  try {
    const contas = JSON.parse(localStorage.getItem('ig_accounts') || '[]');
    const conta = contas.find((c) => c.id === accountId);
    return (conta?.username || localStorage.getItem('ig_username') || '').replace(/^@/, '');
  } catch {
    return '';
  }
}

async function _cloudSaveSnapshot(snapshot) {
  if (!isCloudEnabled()) return;
  try {
    const { data: existing } = await getSupabase().from('snapshots')
      .select('id')
      .eq('account_id', snapshot.accountId)
      .eq('date', snapshot.date)
      .eq('days', snapshot.days)
      .limit(1);

    if (existing && existing.length > 0) {
      await getSupabase().from('snapshots').update({
        kpis: snapshot.kpis,
        updated_at: new Date().toISOString(),
      }).eq('id', existing[0].id);
    } else {
      await getSupabase().from('snapshots').insert({
        account_id: snapshot.accountId,
        date: snapshot.date,
        days: snapshot.days,
        periodo: snapshot.periodo,
        kpis: snapshot.kpis,
      });
    }
  } catch {}
}

/**
 * Snapshots de uma conta. `days` filtra pelo período da coleta (7/14/30/90).
 *
 * Sem esse filtro a série mistura coletas de períodos diferentes: trocar de
 * 7d para 90d no mesmo dia gera três pontos com a MESMA data e magnitudes
 * incomparáveis — que é o que fazia os gráficos de evolução parecerem travados
 * num único dia.
 */
export async function getSnapshotsByAccount(accountId, days = null) {
  if (isCloudEnabled()) {
    try {
      const { data } = await getSupabase().from('snapshots')
        .select('*')
        .eq('account_id', accountId)
        .order('date', { ascending: true });
      if (data && data.length > 0) {
        const rows = days == null ? data : data.filter(r => r.days === days);
        return rows.map(row => ({
          id: row.id,
          accountId: row.account_id,
          date: row.date,
          days: row.days,
          periodo: row.periodo,
          kpis: row.kpis,
          createdAt: row.created_at,
        }));
      }
    } catch {}
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('accountId');
    const req = index.getAll(accountId);
    req.onsuccess = () => {
      const rows = req.result ?? [];
      resolve(days == null ? rows : rows.filter(s => s.days === days));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSnapshots() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function clearSnapshots(accountId) {
  const db = await openDB();
  const all = await getSnapshotsByAccount(accountId);
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  all.forEach(s => store.delete(s.id));
}

/**
 * Coleta anterior comparável: mesmo período e de um DIA anterior.
 *
 * Pegar simplesmente o segundo item da lista comparava a coleta de 7d com a
 * de 90d do mesmo dia, produzindo deltas sem sentido e um "vs. coleta de hoje".
 */
export async function getPreviousSnapshot(accountId, days = null) {
  const all = await getSnapshotsByAccount(accountId, days);
  const today = hojeLocal();
  const anteriores = all
    .filter(s => s.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
  return anteriores[0] ?? null;
}

export function computeDeltas(currentKpis, previousKpis) {
  if (!currentKpis || !previousKpis) return null;
  const delta = {};
  for (const key of Object.keys(currentKpis)) {
    const cur = currentKpis[key] ?? 0;
    const prev = previousKpis[key] ?? 0;
    if (prev === 0) {
      delta[key] = cur > 0 ? 100 : 0;
    } else {
      delta[key] = Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;
    }
  }
  return delta;
}

export async function pruneOldSnapshots(accountId, maxAgeDays = 365) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const all = await getSnapshotsByAccount(accountId);
  const old = all.filter(s => s.date < cutoffStr);
  if (old.length === 0) return;

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  old.forEach(s => store.delete(s.id));
}
