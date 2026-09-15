'use server';

import { createClient } from '@/lib/supabase/server';
import { registrationProfile, type SpecialistStep1, type EmployerStep1 } from '@/lib/profiles/contracts';
import { isEmail, isPassword, publicAuthError, SITE_URL, type AuthResult } from '@/lib/auth/validation';

/** Strict Stage 4 registration contract. The existing form keeps its legacy action
 * until the separately scoped frontend integration; no production UI is redesigned. */
export async function registerProfileAccount(input: {
  kind: 'specialist' | 'employer'; profile: SpecialistStep1 | EmployerStep1;
  email: string; password: string; confirmPassword: string; agreedToTerms: boolean;
}): Promise<AuthResult> {
  const metadata = registrationProfile(input?.kind, input?.profile);
  if (!metadata || typeof input?.email !== 'string' || !isEmail(input.email.trim()) || !isPassword(input?.password) || input.password !== input.confirmPassword || input.agreedToTerms !== true) {
    return { ok: false, message: 'Patikrinkite privalomus registracijos laukus.' };
  }
  try {
    const client = await createClient();
    const { data, error } = await client.auth.signUp({ email: input.email.trim(), password: input.password,
      options: { data: { ...metadata, terms_accepted_at: new Date().toISOString() }, emailRedirectTo: SITE_URL + '/auth/confirm' } });
    if (error && error.code !== 'user_already_exists') return publicAuthError(error);
    if (data.session) {
      await client.auth.signOut();
      return { ok: false, message: 'Registracija laikinai nepasiekiama. Bandykite vėliau.' };
    }
    return { ok: true };
  } catch { return publicAuthError(null); }
}
