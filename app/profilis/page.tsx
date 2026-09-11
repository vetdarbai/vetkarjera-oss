import { redirect } from 'next/navigation';
import AuthFrame from '@/components/AuthFrame';
import LogoutButton from '@/components/LogoutButton';
import { getActiveUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';
export default async function ProfilePage() {
  const user = await getActiveUser();
  if (!user) redirect('/prisijungti?next=/profilis');
  const role = user.role === 'specialist' ? 'Specialistas' : user.role === 'employer' ? 'Darbdavys' : 'Administratorius';
  return <AuthFrame><h1>Profilis</h1><dl className="account-summary"><div><dt>El. paštas</dt><dd>{user.email}</dd></div><div><dt>Paskyros tipas</dt><dd>{role}</dd></div></dl><p className="muted">Profilio informaciją galėsite papildyti kitame etape.</p><LogoutButton /></AuthFrame>;
}
