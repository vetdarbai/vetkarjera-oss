import { redirect } from 'next/navigation';
import AuthFrame from '@/components/AuthFrame';
import LogoutButton from '@/components/LogoutButton';
import { getActiveUser } from '@/lib/auth/session';
import { readSpecialistProfile } from '@/lib/profiles/read';
import SpecialistProfile from '@/components/SpecialistProfile';
import './profilis.css';

export const dynamic = 'force-dynamic';
export default async function ProfilePage() {
  const user = await getActiveUser();
  if (!user) redirect('/prisijungti?next=/profilis');
  if (user.hasSpecialistProfile) {
    try {
      const initial = await readSpecialistProfile();
      if (initial) return <SpecialistProfile initial={initial} />;
    } catch { /* Keep the read failure separate from an empty profile. */ }
    return <AuthFrame><h1>Specialisto profilis</h1><p role="alert">Nepavyko susisiekti su serveriu.</p><a className="btn btn-secondary" href="/profilis">Bandyti dar kartą</a><LogoutButton /></AuthFrame>;
  }
  const role = [user.hasSpecialistProfile && 'Specialistas', user.hasEmployerProfile && 'Darbdavys', user.isAdmin && 'Administratorius'].filter(Boolean).join(' / ') || 'Paskyra';
  return <AuthFrame><h1>Profilis</h1><dl className="account-summary"><div><dt>El. paštas</dt><dd>{user.email}</dd></div><div><dt>Paskyros tipas</dt><dd>{role}</dd></div></dl><p className="muted">Profilio informaciją galėsite papildyti kitame etape.</p><LogoutButton /></AuthFrame>;
}
