'use client';
import { useState } from 'react';
import { logoutAccount } from '@/app/auth/actions';
export default function LogoutButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    if (pending) return;
    setPending(true); setError('');
    try {
      const result = await logoutAccount();
      if (result.ok) window.location.assign('/');
      else setError(result.message || 'Nepavyko atsijungti. Bandykite dar kartą.');
    } catch { setError('Nepavyko susisiekti. Bandykite dar kartą.'); }
    finally { setPending(false); }
  }
  return <div className="account-logout"><button type="button" className="btn btn-secondary" onClick={logout} disabled={pending}>{pending ? 'Atsijungiama…' : 'Atsijungti'}</button>{error && <div className="notice notice-error" role="alert">{error}</div>}</div>;
}
