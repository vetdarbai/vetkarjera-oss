import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const getActiveUser = cache(async () => {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user?.email_confirmed_at) return null;
  // RLS also verifies that the server-side Auth session has not been revoked.
  const { data: profile } = await client.from('profiles').select('id, role').eq('id', user.id).maybeSingle();
  return profile ? { id: user.id, email: user.email || '', role: profile.role } : null;
});
