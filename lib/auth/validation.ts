export const SITE_URL = 'https://www.vetkarjera.lt';
export const EMAIL_COOLDOWN_SECONDS = 60;
export type AccountRole = 'specialist' | 'employer';

export function isAccountRole(value: unknown): value is AccountRole {
  return value === 'specialist' || value === 'employer';
}

export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128;
}

/** Only known internal product routes can be return destinations. */
export function safeNext(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') ||
      value.startsWith('//') || /[\\\s%#]/.test(value)) return '/';
  try {
    const url = new URL(value, SITE_URL);
    if (url.origin !== SITE_URL) return '/';
    if (!/^\/(?:skelbimai|skelbti|darbdavys|privatumas|taisykles|skelbimas\/\d+)?$/.test(url.pathname)) return '/';
    // Do not forward token-like or nested redirect parameters.
    for (const key of Array.from(url.searchParams.keys())) {
      if (!['q', 'location', 'specialization', 'type', 'sort'].includes(key)) return '/';
    }
    return url.pathname + url.search;
  } catch {
    return '/';
  }
}

export type AuthResult = { ok: boolean; message?: string; redirect?: string; retryAfter?: number };

export function publicAuthError(error: { status?: number; code?: string } | null): AuthResult {
  if (error?.status === 429 || error?.code?.includes('rate_limit')) {
    return { ok: false, message: 'Per daug bandymų. Palaukite ir bandykite dar kartą.', retryAfter: EMAIL_COOLDOWN_SECONDS };
  }
  return { ok: false, message: 'Veiksmo atlikti nepavyko. Bandykite dar kartą vėliau.' };
}
