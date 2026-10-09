import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { parseOrganizationContext, validOrganizationId } from './contracts';
export async function ownOrganizationContext(id: string) {
 if (!validOrganizationId(id)) return null;
 const client = await createClient();
 const { data, error } = await client.rpc('own_org_context', { organization_id: id });
 return error ? null : parseOrganizationContext(data);
}
export async function resolvePublicOrganization(slug: string) {
 if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 80) return null;
 const client = await createClient();
 const { data, error } = await client.rpc('resolve_org_slug', { slug });
 if (error) throw new Error('Organization unavailable');
 if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
 return data as { status: 200 | 308; slug: string; profile: unknown };
}
