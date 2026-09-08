'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { loginAccount, logoutAccount } from '@/app/auth/actions';

export default function LoginForm({ signedIn, next, passwordChanged }: { signedIn: boolean; next: string; passwordChanged: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      const result = signedIn ? await logoutAccount() : await loginAccount({ email: String(data.get('email') || ''), password: String(data.get('password') || ''), next });
      if (result.ok && result.redirect) window.location.assign(result.redirect);
      else setError(result.message || 'Veiksmo atlikti nepavyko.');
    } catch { setError('Nepavyko susisiekti. Bandykite dar kartą.'); }
    finally { setPending(false); }
  }
  if (signedIn) return <form onSubmit={submit}>
    <h1 style={{ marginBottom: 0 }}>Esate prisijungęs</h1>
    <button style={{ marginTop: 20 }} className="btn btn-secondary" disabled={pending} type="submit">{pending ? 'Atsijungiama…' : 'Atsijungti'}</button>
    {error && <div className="notice notice-info" role="alert">{error}</div>}
  </form>;
  return <>
    <span className="eyebrow">VetKarjera paskyra</span>
    <h1>Prisijungti</h1>
    <p className="muted">Prisijunkite prie savo „VetKarjera“ paskyros.</p>
    {passwordChanged && <div className="notice notice-info" role="status">Slaptažodis pakeistas. Prisijunkite su nauju slaptažodžiu.</div>}
    {error && <div className="notice notice-info" role="alert">{error}</div>}
    <form onSubmit={submit} className="form-stack">
      <label className="field"><span>El. paštas</span><input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
      <label className="field"><span>Slaptažodis</span><input name="password" type="password" required maxLength={128} autoComplete="current-password" /></label>
      <button className="btn btn-primary btn-block" disabled={pending} type="submit">{pending ? 'Jungiamasi…' : 'Prisijungti'}</button>
      <Link href="/pamirsau-slaptazodi">Pamiršau slaptažodį</Link>
      <Link href="/patvirtinti-pasta">Siųsti el. pašto patvirtinimą dar kartą</Link>
    </form>
    <div className="auth-divider"><span>arba</span></div>
    <div className="choice-actions">
      <Link href="/registracija/kandidatas" className="btn btn-secondary btn-block">Registruotis kaip specialistui</Link>
      <Link href="/registracija/darbdavys" className="btn btn-secondary btn-block">Registruotis kaip darbdaviui</Link>
    </div>
  </>;
}
