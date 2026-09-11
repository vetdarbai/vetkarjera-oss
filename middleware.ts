import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnvironment } from '@/lib/supabase/env';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnvironment();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  // No authorization decision relies on a client-supplied session object.
  const { data: { user }, error } = await supabase.auth.getUser();
  if (request.nextUrl.pathname === '/profilis') {
    const profile = !error && user?.email_confirmed_at
      ? await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle()
      : null;
    if (!profile?.data) {
      const login = new URL('/prisijungti', request.url);
      login.searchParams.set('next', '/profilis');
      const denied = NextResponse.redirect(login);
      response.cookies.getAll().forEach(cookie => denied.cookies.set(cookie));
      denied.headers.set('Cache-Control', 'private, no-store, max-age=0');
      denied.headers.set('Referrer-Policy', 'no-referrer');
      return denied;
    }
  }
  if (request.cookies.getAll().some(({ name }) => name.startsWith('sb-')) ||
      /^\/(auth|profilis|prisijungti|registracija|pamirsau-slaptazodi|naujas-slaptazodis)(\/|$)/.test(request.nextUrl.pathname)) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  }
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)'],
};
