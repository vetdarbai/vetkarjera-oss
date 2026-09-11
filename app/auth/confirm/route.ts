import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { safeNext, SITE_URL } from '@/lib/auth/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  const code = request.nextUrl.searchParams.get('code');
  let destination = '/auth/klaida';
  let verified = false;
  // Default Supabase templates use PKCE; the verifier is in this browser's cookie.
  // Recovery comes from the SDK's verifier, not an untrusted URL flag.
  if (code && code.length <= 2048) {
    try {
      const client = await createClient();
      let recovery = false;
      const { data: { subscription } } = client.auth.onAuthStateChange(event => {
        if (event === 'PASSWORD_RECOVERY') recovery = true;
      });
      try {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (!error) {
          destination = recovery ? '/naujas-slaptazodis' : safeNext(request.nextUrl.searchParams.get('next'));
          verified = !recovery;
        }
      } finally { subscription.unsubscribe(); }
    } catch { /* A missing verifier or expired code uses the safe error page. */ }
  }
  if (!code && token_hash && token_hash.length <= 512 && (type === 'email' || type === 'signup' || type === 'recovery')) {
    try {
      const client = await createClient();
      const { error } = await client.auth.verifyOtp({ token_hash, type });
      if (!error) {
        destination = type === 'recovery' ? '/naujas-slaptazodis' : safeNext(request.nextUrl.searchParams.get('next'));
        verified = type !== 'recovery';
      }
    } catch { /* Show the same safe error for invalid, expired and unavailable links. */ }
  }
  const response = NextResponse.redirect(new URL(destination, SITE_URL), 303);
  if (verified) response.cookies.set('vk-email-verified', '1', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 120 });
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
