'use server';
import { revalidatePath } from 'next/cache';
import { getActiveUser } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { parseOrganizationContext, validOrganizationId, type OrganizationContext } from '@/lib/organizations/contracts';
import { readEmployerOwner } from '@/lib/organizations/owner-read';
import type { OwnerBundle, OwnerOperation, OwnerResult } from '@/lib/organizations/frontend';
import type { Json } from '@/types/database';

const allowed: readonly OwnerOperation[] = ['patch_org_public','save_org_locations','save_org_legal_draft','save_own_representative_details','save_org_type_block','save_org_benefits','request_org_legal_change','request_employer_verification','request_representation_verification','request_org_transfer','accept_org_transfer','decline_org_transfer','cancel_org_transfer'];
function validPayload(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  try { return Buffer.byteLength(JSON.stringify(value), 'utf8') <= 131072; } catch { return false; }
}
function failure(code?: string): OwnerResult<never> {
  if (code === '40001') return { ok: false, code: 'conflict', message: 'Duomenys pasikeitė nuo tada, kai atidarėte formą. Atnaujinkite duomenis ir peržiūrėkite pakeitimus.' };
  if (code === '42501') return { ok: false, code: 'permission', message: 'Šių duomenų redaguoti negalite. Atnaujinkite duomenis ir peržiūrėkite suteiktas teises.' };
  if (['22023','23514','23505','22P02'].includes(code ?? '')) return { ok: false, code: 'invalid', message: 'Nepavyko išsaugoti. Patikrinkite įvestus duomenis. Įvesti duomenys liko formoje.' };
  return { ok: false, code: 'unavailable', message: 'Nepavyko išsaugoti. Įvesti duomenys liko formoje.' };
}
export async function reloadEmployerOwner(): Promise<OwnerResult<OwnerBundle>> {
  try { return { ok: true, data: await readEmployerOwner() }; } catch { return failure(); }
}
export async function createEmployerOrganization(): Promise<OwnerResult<OrganizationContext>> {
  try {
    const user = await getActiveUser();
    if (!user?.hasEmployerProfile) return failure('42501');
    const client = await createClient();
    const { data, error } = await client.rpc('create_org_draft');
    if (error) return failure(error.code);
    const context = parseOrganizationContext(data);
    if (!context) return failure();
    revalidatePath('/profilis/darbdavys');
    return { ok: true, data: context };
  } catch { return failure(); }
}
export async function mutateEmployer(operation: OwnerOperation, id: string, version: number, payload: Record<string, unknown>): Promise<OwnerResult<{ context: OrganizationContext | null; status?: 'expired' | 'declined'; transferId?: string }>> {
  if (!allowed.includes(operation) || !validOrganizationId(id) || !Number.isSafeInteger(version) || version < 1 || !validPayload(payload)) return failure('22023');
  try {
    if (!(await getActiveUser())) return failure('42501');
    const client = await createClient();
    const { data, error } = await client.rpc(operation, { organization_id: id, expected_row_version: version, payload: payload as Json });
    if (error) return failure(error.code);
    if (data && typeof data === 'object' && !Array.isArray(data) && ['expired','declined'].includes(String(data.status))) return { ok: true, data: { context: null, status: data.status as 'expired' | 'declined' } };
    let context = parseOrganizationContext(data);
    let transferId: string | undefined;
    if (operation === 'request_org_transfer' && data && typeof data === 'object' && !Array.isArray(data) && typeof data.transferId === 'string') {
      transferId = data.transferId;
      const read = await client.rpc('own_org_context', { organization_id: id });
      context = read.error ? null : parseOrganizationContext(read.data);
    }
    if (!context || context.organization.id !== id) return failure();
    revalidatePath('/profilis/darbdavys');
    return { ok: true, data: { context, transferId } };
  } catch { return failure(); }
}
