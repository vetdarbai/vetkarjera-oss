import 'server-only';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseEnvironment } from './env';
import type { Database } from '@/types/database';

/** One client per request; middleware handles refresh before server rendering. */
export async function createClient() {
  const store = await cookies();
  const { url, anonKey } = getSupabaseEnvironment();
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. Middleware already refreshed them.
        }
      },
    },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
  });
}
