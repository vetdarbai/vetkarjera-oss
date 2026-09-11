'use client';
import { FormEvent, useEffect, useState } from 'react';
import { sendAuthEmail } from '@/app/auth/actions';

export default function AuthEmailForm({ kind, initialEmail = '', initialCooldown = 0 }: { kind: 'verification' | 'recovery'; initialEmail?: string; initialCooldown?: number }) {
  const [email, setEmail] = useState(initialEmail);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [limited, setLimited] = useState(false);
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(initialCooldown);
  useEffect(() => { if (initialCooldown) setDeadline(Date.now() + initialCooldown * 1000); }, [initialCooldown]);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || remaining > 0) return;
    setPending(true); setMessage(''); setLimited(false);
    try {
      const result = await sendAuthEmail(email, kind);
      setSuccess(result.ok); setLimited(!result.ok && !!result.retryAfter);
      setMessage(result.message || '');
      setRemaining(result.retryAfter || 0);
      setDeadline(result.retryAfter ? Date.now() + result.retryAfter * 1000 : 0);
    } catch { setSuccess(false); setMessage('Nepavyko susisiekti. Bandykite dar kartą.'); }
    finally { setPending(false); }
  }
  const feedback = limited ? remaining > 0 ? `Per daug bandymų. Siųsti dar kartą galėsite po ${remaining} s.` : 'Jau galite siųsti dar kartą.' : [message, remaining > 0 ? `Siųsti dar kartą galėsite po ${remaining} s.` : ''].filter(Boolean).join(' ');
  const error = limited ? remaining > 0 : !!message && !success;
  return <form className="form-stack" onSubmit={submit}>
    <label className="field"><span>El. paštas</span><input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} /></label>
    {feedback && <div className={`notice ${error ? 'notice-error' : 'notice-success'}`} role={error ? 'alert' : 'status'}>{feedback}</div>}
    <button className="btn btn-secondary" disabled={pending || remaining > 0} type="submit">{pending ? 'Siunčiama…' : kind === 'verification' ? 'Siųsti dar kartą' : 'Siųsti atkūrimo nuorodą'}</button>
  </form>;
}
