'use server';
import { readSpecialistProfile } from '@/lib/profiles/read';
export async function reloadSpecialistProfile() {
  try { return { ok: true as const, bundle: await readSpecialistProfile() }; }
  catch { return { ok: false as const }; }
}
