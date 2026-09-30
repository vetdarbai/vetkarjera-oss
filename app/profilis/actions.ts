'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/auth/session';
import { validPayload, type SpecialistStep1, type SpecialistStep1Draft, type SpecialistStep2Draft, type Completeness, type EmployerStep1, type Education, type SpecialistStep3, type ProfileResult } from '@/lib/profiles/contracts';
import type { Database, Json } from '@/types/database';

const failure = (): ProfileResult<never> => ({ ok: false, message: 'Nepavyko išsaugoti. Patikrinkite duomenis ir prisijungimą.' });
type Functions = Database['public']['Functions'];
async function mutate<N extends keyof Functions>(name: N, args: Functions[N]['Args']): Promise<ProfileResult> {
  try {
    if (!(await getActiveUser())) return failure();
    const client = await createClient();
    const { error } = await client.rpc(name, args);
    if (error) return failure(); // Never log private input or provider errors.
    revalidatePath('/profilis');
    if (['save_specialist_step1','save_specialist_step2','save_specialist_step3','save_education','save_license'].includes(name)) {
      try {
        const state = await client.rpc('profile_completeness');
        if (!state.error && state.data && typeof state.data === 'object' && !Array.isArray(state.data) && state.data.contractVersion === 2) {
          return { ok: true, completeness: state.data as unknown as Completeness, completenessStatus: 'available' };
        }
      } catch { /* Write succeeded; only the follow-up read failed. */ }
      return { ok: true, completenessStatus: 'unavailable' };
    }
    return { ok: true };
  } catch { return failure(); }
}
export async function saveSpecialistStep1(payload: SpecialistStep1Draft) {
  return validPayload(payload) ? mutate('save_specialist_step1', { payload: payload as Json }) : failure();
}
export async function saveEmployerStep1(payload: EmployerStep1) {
  return validPayload(payload) ? mutate('save_employer_step1', { payload: payload as Json }) : failure();
}
export async function createSecondProfile(kind: 'specialist' | 'employer', payload: SpecialistStep1 | EmployerStep1) {
  return ['specialist','employer'].includes(kind) && validPayload(payload) ? mutate('create_second_profile', { kind, payload: payload as Json }) : failure();
}
export async function saveEducation(payload: Education) {
  return validPayload(payload) ? mutate('save_education', { payload: payload as Json }) : failure();
}
export async function saveSpecialistStep2(payload: SpecialistStep2Draft) {
  return validPayload(payload) ? mutate('save_specialist_step2', { payload: payload as Json }) : failure();
}
export async function saveSpecialistStep3(payload: SpecialistStep3) {
  return validPayload(payload) ? mutate('save_specialist_step3', { payload: payload as Json }) : failure();
}
export async function saveLicense(number: string) {
  return typeof number === 'string' && number.trim().length > 0 && number.length <= 200 ? mutate('save_license', { number_input: number }) : failure();
}
export async function reviewLicense(targetUserId: string, expectedRevision: number, decision: 'verified' | 'rejected') {
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1 || !['verified','rejected'].includes(decision)) return failure();
  // The RPC independently verifies trusted admin, active session, no self-review and revision.
  return mutate('review_license', { target_user_id: targetUserId, expected_revision: expectedRevision, decision });
}
export async function readOwnLicense(): Promise<ProfileResult<Json>> {
  try {
    const account = await getActiveUser();
    if (!account) return failure();
    const client = await createClient();
    const { data, error } = await client.rpc('read_license', { target_user_id: account.id });
    return error ? failure() : { ok: true, data };
  } catch { return failure(); }
}
export async function readProfileCompleteness(): Promise<ProfileResult<Json>> {
  try {
    if (!(await getActiveUser())) return failure();
    const client = await createClient();
    const { data, error } = await client.rpc('profile_completeness');
    return error ? failure() : { ok: true, data };
  } catch { return failure(); }
}
