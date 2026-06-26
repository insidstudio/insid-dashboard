import { getSupabase, isCloudEnabled } from './supabase-client.js';

const KEYS = {
  ACCOUNTS: 'ig_accounts',
  ACTIVE_ACCOUNT: 'ig_active_account',
  LAST_UPDATED: 'ig_last_updated',
  TOKEN: 'ig_token',
  USER_ID: 'ig_user_id',
  USERNAME: 'ig_username',
  CACHED_DATA: 'ig_cached_data',
  TOKEN_CREATED: 'ig_token_created',
};

let _serverConfig = null;

export async function loadServerConfig() {
  try {
    const res = await fetch('/env-config');
    _serverConfig = await res.json();
  } catch {
    _serverConfig = { configured: false, userId: null };
  }
  return _serverConfig;
}

export function isServerConfigured() {
  return Boolean(_serverConfig?.configured);
}

export function getAccounts() {
  try {
    const raw = localStorage.getItem(KEYS.ACCOUNTS);
    const accounts = raw ? JSON.parse(raw) : [];
    if (accounts.length === 0) {
      const token = localStorage.getItem(KEYS.TOKEN);
      const userId = localStorage.getItem(KEYS.USER_ID);
      const username = localStorage.getItem(KEYS.USERNAME);
      if (token && userId) {
        const migrated = {
          id: 'legacy',
          label: username ? `@${username}` : 'Minha Conta',
          token,
          userId,
          username: username || '',
          profilePicture: null,
          tokenCreated: localStorage.getItem(KEYS.TOKEN_CREATED) || new Date().toISOString(),
        };
        accounts.push(migrated);
        localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
        localStorage.setItem(KEYS.ACTIVE_ACCOUNT, 'legacy');
      }
    }
    return accounts;
  } catch { return []; }
}

export function saveAccount(account) {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.id === account.id);
  if (idx >= 0) accounts[idx] = account;
  else accounts.push(account);
  localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
  _cloudSaveAccount(account);
}

async function _cloudSaveAccount(account) {
  if (!isCloudEnabled()) return;
  try {
    await getSupabase().from('accounts').upsert({
      id: account.id,
      label: account.label,
      token: account.token,
      user_id: account.userId,
      username: account.username,
      profile_picture: account.profilePicture,
      token_created: account.tokenCreated,
    }, { onConflict: 'id' });
  } catch {}
}

export function removeAccount(id) {
  const accounts = getAccounts().filter(a => a.id !== id);
  localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
  if (getActiveAccountId() === id) {
    const next = accounts[0]?.id || '';
    localStorage.setItem(KEYS.ACTIVE_ACCOUNT, next);
  }
  localStorage.removeItem(`ig_cache_${id}`);
  if (isCloudEnabled()) {
    getSupabase().from('accounts').delete().eq('id', id).then(() => {});
  }
}

export function getActiveAccountId() {
  return localStorage.getItem(KEYS.ACTIVE_ACCOUNT) || getAccounts()[0]?.id || null;
}

export function setActiveAccount(id) {
  localStorage.setItem(KEYS.ACTIVE_ACCOUNT, id);
}

export function getActiveAccount() {
  const accounts = getAccounts();
  const activeId = getActiveAccountId();
  return accounts.find(a => a.id === activeId) || accounts[0] || null;
}

export async function syncFromCloud() {
  if (!isCloudEnabled()) return;
  try {
    const { data } = await getSupabase().from('accounts').select('*');
    if (!data || data.length === 0) return;
    const cloudAccounts = data.map(row => ({
      id: row.id,
      label: row.label,
      token: row.token,
      userId: row.user_id,
      username: row.username,
      profilePicture: row.profile_picture,
      tokenCreated: row.token_created,
    }));
    // MERGE: keep local accounts not in cloud so locally-added accounts survive
    const local = getAccounts();
    const merged = [...cloudAccounts];
    for (const loc of local) {
      if (!merged.find(a => a.id === loc.id)) merged.push(loc);
    }
    localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(merged));
    if (!localStorage.getItem(KEYS.ACTIVE_ACCOUNT)) {
      localStorage.setItem(KEYS.ACTIVE_ACCOUNT, merged[0].id);
    }
  } catch {}
}

export function getToken() {
  const active = getActiveAccount();
  if (active?.token) return active.token;
  if (isServerConfigured()) return null;
  return null;
}

export function getUserId() {
  const active = getActiveAccount();
  if (active?.userId) return active.userId;
  return _serverConfig?.userId || null;
}

export function isConfigured() {
  if (isServerConfigured()) return true;
  const accounts = getAccounts();
  return accounts.some(a => Boolean(a.token));
}

export function removeStaleAccounts() {
  const accounts = getAccounts();
  const stale = accounts.filter(a => !a.token);
  stale.forEach(a => removeAccount(a.id));
  return stale.length;
}

export function saveCache(data, days = 30) {
  const id = getActiveAccountId() || 'default';
  localStorage.setItem(`ig_cache_${id}_${days}d`, JSON.stringify(data));
  localStorage.setItem(KEYS.LAST_UPDATED, new Date().toISOString());
}

export function getCache(days = 30) {
  const id = getActiveAccountId() || 'default';
  try {
    const raw = localStorage.getItem(`ig_cache_${id}_${days}d`);
    const fallback = localStorage.getItem(`ig_cache_${id}`);
    return raw ? JSON.parse(raw) : (days === 30 && fallback ? JSON.parse(fallback) : null);
  } catch { return null; }
}

export function getLastUpdated() {
  return localStorage.getItem(KEYS.LAST_UPDATED);
}

export function clearAll() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('ig_'))
    .forEach(k => localStorage.removeItem(k));
}

export function getTokenDaysRemaining() {
  if (isServerConfigured()) return null;
  const active = getActiveAccount();
  if (!active?.tokenCreated) return null;
  const age = Math.floor((Date.now() - new Date(active.tokenCreated).getTime()) / 86400000);
  return Math.max(0, 60 - age);
}

export function saveToken(token) {
  localStorage.setItem(KEYS.TOKEN, token);
}

export function saveUserInfo(userId, username) {
  localStorage.setItem(KEYS.USER_ID, userId);
  localStorage.setItem(KEYS.USERNAME, username);
}

// ── Force sync all local accounts to Supabase ────────────────
export async function forceSyncAllToCloud() {
  if (!isCloudEnabled()) throw new Error('Supabase não configurado');
  const accounts = getAccounts();
  if (accounts.length === 0) throw new Error('Nenhuma conta para sincronizar');
  const rows = accounts.map(a => ({
    id: a.id,
    label: a.label,
    token: a.token,
    user_id: a.userId,
    username: a.username,
    profile_picture: a.profilePicture,
    token_created: a.tokenCreated,
  }));
  const { error } = await getSupabase()
    .from('accounts')
    .upsert(rows, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  return accounts.length;
}
