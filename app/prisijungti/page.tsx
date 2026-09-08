import AuthFrame from '@/components/AuthFrame';
import LoginForm from '@/components/LoginForm';
import { getActiveUser } from '@/lib/auth/session';
import { safeNext } from '@/lib/auth/validation';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; password?: string }> }) {
  const [user, params] = await Promise.all([getActiveUser(), searchParams]);
  return <AuthFrame><LoginForm signedIn={!!user} next={safeNext(params.next)} passwordChanged={params.password === 'changed'} /></AuthFrame>;
}
