'use client';
import { FormEvent, useState } from 'react';
import { updatePassword } from '@/app/auth/actions';
export default function NewPasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');
    const invalid = { password: password.length < 8 || password.length > 128 ? 'Slaptažodis turi būti nuo 8 iki 128 simbolių.' : undefined, confirmPassword: password !== confirmPassword ? 'Slaptažodžiai nesutampa.' : undefined };
    setErrors(invalid); setMessage('');
    if (invalid.password || invalid.confirmPassword) {
      (event.currentTarget.elements.namedItem(invalid.password ? 'password' : 'confirmPassword') as HTMLElement)?.focus();
      return;
    }
    setPending(true);
    try {
      const result = await updatePassword({ password: String(data.get('password') || ''), confirmPassword: String(data.get('confirmPassword') || '') });
      if (result.ok && result.redirect) window.location.assign(result.redirect);
      else { setSuccess(result.ok); setErrors(result.fieldErrors || {}); setMessage(result.message || ''); }
    } catch { setSuccess(false); setMessage('Nepavyko susisiekti. Bandykite dar kartą.'); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="form-stack" noValidate>
    {message && <div className={`notice ${success ? 'notice-success' : 'notice-error'}`} role={success ? 'status' : 'alert'}>{message}</div>}
    <label className="field"><span>Naujas slaptažodis</span><input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby="password-help" onChange={() => setErrors(current => ({ ...current, password: undefined }))} /><small id="password-help" className={errors.password ? 'field-error' : undefined} role={errors.password ? 'alert' : undefined}>{errors.password || 'Mažiausiai 8 simboliai.'}</small></label>
    <label className="field"><span>Pakartoti slaptažodį</span><input name="confirmPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password" aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined} onChange={() => setErrors(current => ({ ...current, confirmPassword: undefined }))} />{errors.confirmPassword && <span id="confirm-error" className="field-error" role="alert">{errors.confirmPassword}</span>}</label>
    <button className="btn btn-primary" disabled={pending} type="submit">{pending ? 'Keičiama…' : 'Pakeisti slaptažodį'}</button>
  </form>;
}
