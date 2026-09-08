import 'server-only';
import { createClient } from '@/lib/supabase/server';

export async function getActiveUser() {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user?.email_confirmed_at) return null;
  // RLS also verifies that the server-side Auth session has not been revoked.
  const { data: profile } = await client.from('profiles').select('id, role').eq('id', user.id).maybeSingle();
  return profile ? { id: user.id, role: profile.role } : null;
}
