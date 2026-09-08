'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/auth/session';
import { isAccountRole, isEmail, isPassword, safeNext, SITE_URL, publicAuthError, type AuthResult } from '@/lib/auth/validation';

export async function registerAccount(input: { email: string; password: string; confirmPassword: string; role: string; agreedToTerms: boolean }): Promise<AuthResult> {
  if (!isAccountRole(input?.role) || input.agreedToTerms !== true) {
    return { ok: false, message: 'Pasirinkite paskyros tipą ir patvirtinkite naudojimosi taisykles.' };
  }
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  if (!isEmail(email)) return { ok: false, message: 'Įveskite tinkamą el. pašto adresą.' };
  if (!isPassword(input.password)) return { ok: false, message: 'Slaptažodis turi būti nuo 8 iki 128 simbolių.' };
  if (input.password !== input.confirmPassword) return { ok: false, message: 'Slaptažodžiai nesutampa.' };
  try {
    const client = await createClient();
    const { data, error } = await client.auth.signUp({
      email, password: input.password,
      options: { data: { account_role: input.role }, emailRedirectTo: SITE_URL + '/auth/confirm' },
    });
    if (error && error.code !== 'user_already_exists') return publicAuthError(error);
    // Fail closed if confirmation has accidentally been disabled in the dashboard.
    if (data.session) {
      await client.auth.signOut();
      return { ok: false, message: 'Registracija laikinai nepasiekiama. Bandykite vėliau.' };
    }
    return { ok: true };
  } catch { return publicAuthError(null); }
}

export async function loginAccount(input: { email: string; password: string; next?: string }): Promise<AuthResult> {
  if (typeof input?.email !== 'string' || !isEmail(input.email.trim()) || typeof input.password !== 'string' || !input.password || input.password.length > 128) {
    return { ok: false, message: 'Nepavyko prisijungti. Patikrinkite prisijungimo duomenis ir el. pašto patvirtinimą.' };
  }
  try {
    const client = await createClient();
    const { error } = await client.auth.signInWithPassword({ email: input.email.trim(), password: input.password });
    if (error) {
      if (error.status === 429) return publicAuthError(error);
      return { ok: false, message: 'Nepavyko prisijungti. Patikrinkite prisijungimo duomenis ir el. pašto patvirtinimą.' };
    }
    if (!(await getActiveUser())) {
      await client.auth.signOut({ scope: 'local' });
      return { ok: false, message: 'Nepavyko prisijungti. Patikrinkite prisijungimo duomenis ir el. pašto patvirtinimą.' };
    }
    revalidatePath('/', 'layout');
    return { ok: true, redirect: safeNext(input.next) };
  } catch { return publicAuthError(null); }
}

export async function logoutAccount(): Promise<AuthResult> {
  try {
    const client = await createClient();
    const { error } = await client.auth.signOut({ scope: 'global' });
    if (error) return publicAuthError(error);
    revalidatePath('/', 'layout');
    return { ok: true, redirect: '/' };
  } catch { return publicAuthError(null); }
}

export async function sendAuthEmail(emailInput: string, kind: 'verification' | 'recovery'): Promise<AuthResult> {
  const email = typeof emailInput === 'string' ? emailInput.trim() : '';
  if (!isEmail(email) || !['verification', 'recovery'].includes(kind)) return { ok: false, message: 'Įveskite tinkamą el. pašto adresą.' };
  try {
    const client = await createClient();
    // Supabase enforces persistent recipient cooldown and project email limits.
    const { error } = kind === 'verification'
      ? await client.auth.resend({ type: 'signup', email, options: { emailRedirectTo: SITE_URL + '/auth/confirm' } })
      : await client.auth.resetPasswordForEmail(email, { redirectTo: SITE_URL + '/auth/confirm' });
    if (error && !['user_not_found', 'email_not_confirmed', 'email_exists'].includes(error.code || '')) return publicAuthError(error);
    return { ok: true, message: 'Jei šiam adresui galima išsiųsti nuorodą, ją gausite el. paštu.', retryAfter: 60 };
  } catch { return publicAuthError(null); }
}

export async function updatePassword(input: { password: string; confirmPassword: string }): Promise<AuthResult> {
  if (!isPassword(input?.password)) return { ok: false, message: 'Slaptažodis turi būti nuo 8 iki 128 simbolių.' };
  if (input.password !== input.confirmPassword) return { ok: false, message: 'Slaptažodžiai nesutampa.' };
  try {
    if (!(await getActiveUser())) return { ok: false, message: 'Nuoroda nebegalioja. Paprašykite naujos slaptažodžio atkūrimo nuorodos.' };
    const client = await createClient();
    const { error } = await client.auth.updateUser({ password: input.password });
    if (error) return publicAuthError(error);
    const { error: logoutError } = await client.auth.signOut({ scope: 'global' });
    revalidatePath('/', 'layout');
    if (logoutError) return { ok: true, message: 'Slaptažodis pakeistas. Atsijunkite prieš prisijungdami iš naujo.' };
    return { ok: true, redirect: '/prisijungti?password=changed' };
  } catch { return publicAuthError(null); }
}
