'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnvironment } from './env';
import type { Database } from '@/types/database';

export function createClient() {
  const { url, anonKey } = getSupabaseEnvironment();
  return createBrowserClient<Database>(url, anonKey);
}
