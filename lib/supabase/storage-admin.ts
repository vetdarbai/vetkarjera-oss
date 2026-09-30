import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnvironment } from './env';

/** Storage mutations only. Never import into profile/license data access. */
export function createStorageAdmin() {
  const key = process.env.SUPABASE_STORAGE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Photo storage unavailable');
  return createClient(getSupabaseEnvironment().url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  }).storage.from('specialist-profile-photos');
}
