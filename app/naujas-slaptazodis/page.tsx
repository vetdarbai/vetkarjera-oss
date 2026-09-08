import Link from 'next/link';
import AuthFrame from '@/components/AuthFrame';
import NewPasswordForm from '@/components/NewPasswordForm';
import { getActiveUser } from '@/lib/auth/session';
export const dynamic = 'force-dynamic';
export default async function NewPasswordPage() {
  const user = await getActiveUser();
  return <AuthFrame>{user ? <><h1>Naujas slaptažodis</h1><NewPasswordForm /></> : <><h1>Nuoroda nebegalioja</h1><p>Paprašykite naujos slaptažodžio atkūrimo nuorodos.</p><Link href="/pamirsau-slaptazodi" className="btn btn-secondary">Atkurti slaptažodį</Link></>}</AuthFrame>;
}
