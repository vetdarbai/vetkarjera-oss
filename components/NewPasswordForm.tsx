'use client';
import { FormEvent, useState } from 'react';
import { updatePassword } from '@/app/auth/actions';
export default function NewPasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    try {
      const result = await updatePassword({ password: String(data.get('password') || ''), confirmPassword: String(data.get('confirmPassword') || '') });
      if (result.ok && result.redirect) window.location.assign(result.redirect);
      else setMessage(result.message || 'Veiksmo atlikti nepavyko.');
    } catch { setMessage('Nepavyko susisiekti. Bandykite dar kartą.'); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="form-stack">
    {message && <div className="notice notice-info" role="status">{message}</div>}
    <label className="field"><span>Naujas slaptažodis</span><input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" /><small>Mažiausiai 8 simboliai.</small></label>
    <label className="field"><span>Pakartoti slaptažodį</span><input name="confirmPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" /></label>
    <button className="btn btn-primary" disabled={pending} type="submit">{pending ? 'Keičiama…' : 'Pakeisti slaptažodį'}</button>
  </form>;
}
