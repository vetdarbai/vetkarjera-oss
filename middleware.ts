import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnvironment } from '@/lib/supabase/env';
import { parseCapabilities } from '@/lib/profiles/contracts';

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
  // Resolve public organization status before the root loading boundary can
  // stream HTTP 200. This reads only the existing public slug RPC, not owner data.
  if (request.nextUrl.pathname.startsWith('/darbdaviai/')) {
    const slug = request.nextUrl.pathname.slice('/darbdaviai/'.length).replace(/\/$/, '');
    const valid = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 80;
    const publicResult = valid ? await supabase.rpc('resolve_org_slug', { slug }) : { data: null, error: null };
    let early: NextResponse | null = null;
    if (publicResult.error) {
      early = new NextResponse('Nepavyko įkelti organizacijos profilio.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    } else if (!publicResult.data) {
      early = NextResponse.rewrite(new URL('/_not-found', request.url), { status: 404 });
    } else if (typeof publicResult.data === 'object' && !Array.isArray(publicResult.data) && publicResult.data.status === 308 && typeof publicResult.data.slug === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(publicResult.data.slug)) {
      const canonical = request.nextUrl.clone(); canonical.pathname = '/darbdaviai/' + publicResult.data.slug;
      early = NextResponse.redirect(canonical, 308);
    }
    if (early) {
      response.cookies.getAll().forEach(cookie => early!.cookies.set(cookie));
      early.headers.set('Cache-Control', 'private, no-store, max-age=0');
      early.headers.set('Referrer-Policy', 'no-referrer');
      return early;
    }
  }
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
    // Resolve the employer-only entry before a streamed server redirect reaches
    // the client router. The existing RPC supplies capabilities; metadata does not.
    const account = await supabase.rpc('account_capabilities');
    const capabilities = account.error ? null : parseCapabilities(account.data);
    if (capabilities && capabilities.id === user?.id && capabilities.hasEmployerProfile && !capabilities.hasSpecialistProfile) {
      const employer = new URL('/profilis/darbdavys', request.url);
      const entry = NextResponse.redirect(employer);
      response.cookies.getAll().forEach(cookie => entry.cookies.set(cookie));
      entry.headers.set('Cache-Control', 'private, no-store, max-age=0');
      entry.headers.set('Referrer-Policy', 'no-referrer');
      return entry;
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
  matcher: ['/darbdaviai/:path*', '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)'],
};
