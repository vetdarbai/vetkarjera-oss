import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { parseCapabilities } from '@/lib/profiles/contracts';

export const getActiveUser = cache(async () => {
  const client = await createClient();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user?.email_confirmed_at) return null;
  // RLS also verifies that the server-side Auth session has not been revoked.
  const { data, error: capabilityError } = await client.rpc('account_capabilities');
  const capabilities = capabilityError ? null : parseCapabilities(data);
  return capabilities?.id === user.id ? { ...capabilities, email: user.email || '' } : null;
});
