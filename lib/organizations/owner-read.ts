import 'server-only';
import { getActiveUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { parseOrganizationContext, validOrganizationId } from './contracts';
import type { OwnerBundle, PendingTransfer } from './frontend';

export async function readEmployerOwner(): Promise<OwnerBundle> {
  const user = await getActiveUser();
  if (!user) throw new Error('Owner session unavailable');
  const client = await createClient();
  const [membership, transfers] = await Promise.all([
    client.from('organization_memberships').select('organization_id').eq('user_id', user.id).is('revoked_at', null).limit(2),
    client.rpc('list_my_pending_transfers'),
  ]);
  if (membership.error || transfers.error || (membership.data?.length ?? 0) > 1 || !Array.isArray(transfers.data)) throw new Error('Owner read unavailable');
  const pending = transfers.data as unknown as PendingTransfer[];
  if (pending.some(t => !validOrganizationId(t.organizationId) || !validOrganizationId(t.transferId) || !Number.isSafeInteger(t.rowVersion) || t.rowVersion < 1 || !['incoming','outgoing'].includes(t.direction) || !Number.isFinite(Date.parse(t.expiresAt)))) throw new Error('Transfer response invalid');
  const id = membership.data?.[0]?.organization_id;
  if (!id) return { context: null, transfers: pending, hasEmployerProfile: user.hasEmployerProfile };
  const result = await client.rpc('own_org_context', { organization_id: id });
  const context = result.error ? null : parseOrganizationContext(result.data);
  if (!context || !context.capabilities.canReadPrivate) throw new Error('Owner context unavailable');
  return { context, transfers: pending, hasEmployerProfile: user.hasEmployerProfile };
}
