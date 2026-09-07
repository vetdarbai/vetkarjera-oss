/** Read lazily so importing a helper does not change static page rendering. */
export function getSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (new URL(url).protocol !== 'https:') {
    throw new Error('Supabase URL must use HTTPS');
  }

  // Reject privileged or malformed keys before a request is made.
  // This validates configuration, not the authenticity of a user's JWT.
  if (!anonKey.startsWith('sb_publishable_')) {
    try {
      const payload = JSON.parse(atob(anonKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.role !== 'anon') throw new Error('Not an anon key');
    } catch {
      throw new Error('Supabase requires a public anon or publishable key');
    }
  }

  return { url, anonKey };
}
