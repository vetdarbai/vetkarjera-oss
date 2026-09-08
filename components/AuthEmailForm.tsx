'use client';
import { FormEvent, useEffect, useState } from 'react';
import { sendAuthEmail } from '@/app/auth/actions';

export default function AuthEmailForm({ kind, initialEmail = '', initialCooldown = 0 }: { kind: 'verification' | 'recovery'; initialEmail?: string; initialCooldown?: number }) {
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [remaining, setRemaining] = useState(initialCooldown);
  useEffect(() => {
    const timer = setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || remaining > 0) return;
    setPending(true);
    try {
      const result = await sendAuthEmail(email, kind);
      setMessage(result.message || '');
      setRemaining(result.retryAfter || 0);
    } catch { setMessage('Nepavyko susisiekti. Bandykite dar kartą.'); }
    finally { setPending(false); }
  }
  return <form className="form-stack" onSubmit={submit}>
    <label className="field"><span>El. paštas</span><input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>
    {message && <div className="notice notice-info" role="status">{message}</div>}
    <button className="btn btn-secondary" disabled={pending || remaining > 0} type="submit">{pending ? 'Siunčiama…' : kind === 'verification' ? 'Siųsti dar kartą' : 'Siųsti atkūrimo nuorodą'}</button>
    {remaining > 0 && <p className="muted">Pakartoti galėsite po {remaining} s.</p>}
  </form>;
}
