import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { getSupabaseEnvironment } from './env';
import type { Database } from '@/types/database';

/** Anonymous, request-scoped server client. Session handling belongs to stage 3. */
export function createClient() {
  const { url, anonKey } = getSupabaseEnvironment();
  return createServerClient<Database>(url, anonKey, {
    // SSR manages an internal cookie store; no incoming session is supplied below.
    auth: { autoRefreshToken: false, detectSessionInUrl: false },
    cookies: {
      getAll: () => [],
      setAll: () => {
        throw new Error('Authentication is not enabled in the stage 2 server client');
      },
    },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}
