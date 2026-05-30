import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// ── Diagnostics (safe — never logs the full key) ──────────────────────────────
console.log('[Supabase Config] URL exists:',      Boolean(supabaseUrl));
console.log('[Supabase Config] ANON KEY exists:',  Boolean(supabaseAnonKey));
console.log('[Supabase Config] URL prefix:',       supabaseUrl?.slice(0, 30));

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] MISSING env vars — VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. ' +
    'Room features will not work. On Vercel: add these under Project → Settings → Environment Variables.',
  );
}

export const supabase = createClient(
  supabaseUrl     ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder',
);

/** Returns true if the client was initialised with real credentials. */
export function supabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
