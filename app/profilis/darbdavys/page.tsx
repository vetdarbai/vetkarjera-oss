import { redirect } from 'next/navigation';
import AuthFrame from '@/components/AuthFrame';
import EmployerProfile from '@/components/EmployerProfile';
import { getActiveUser } from '@/lib/auth/session';
import { readEmployerOwner } from '@/lib/organizations/owner-read';
import '../profilis.css';
import './darbdavys.css';
export const dynamic = 'force-dynamic';
export default async function EmployerOwnerPage() {
  if (!(await getActiveUser())) redirect('/prisijungti?next=/profilis/darbdavys');
  try { return <EmployerProfile initial={await readEmployerOwner()} />; }
  catch { return <AuthFrame><h1>Darbdavio profilis</h1><p role="alert">Nepavyko susisiekti su serveriu.</p><a className="btn btn-secondary" href="/profilis/darbdavys">Bandyti dar kartą</a></AuthFrame>; }
}
