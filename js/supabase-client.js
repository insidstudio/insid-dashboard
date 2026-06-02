let _supabase = null;
let _ready = false;

export async function initSupabase() {
  if (_ready) return _supabase;

  try {
    const res = await fetch('/env-config');
    const config = await res.json();

    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      _ready = true;
      return null;
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    _supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    _ready = true;
    return _supabase;
  } catch {
    _ready = true;
    return null;
  }
}

export function getSupabase() {
  return _supabase;
}

export function isCloudEnabled() {
  return _supabase !== null;
}
