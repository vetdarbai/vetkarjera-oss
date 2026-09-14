'use client';
import { FormEvent, useState } from 'react';
import { updatePassword } from '@/app/auth/actions';
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, passwordValidationError } from '@/lib/auth/validation';
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
    const invalid = { password: passwordValidationError(password), confirmPassword: password !== confirmPassword ? 'Slaptažodžiai nesutampa.' : undefined };
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
    <label className="field"><span>Naujas slaptažodis</span><input name="password" type="password" required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby="password-help" onChange={() => setErrors(current => ({ ...current, password: undefined }))} /><small id="password-help" className={errors.password ? 'field-error' : undefined} role={errors.password ? 'alert' : undefined}>{errors.password || `Mažiausiai ${PASSWORD_MIN_LENGTH} simboliai.`}</small></label>
    <label className="field"><span>Pakartoti slaptažodį</span><input name="confirmPassword" type="password" required minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} autoComplete="new-password" aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined} onChange={() => setErrors(current => ({ ...current, confirmPassword: undefined }))} />{errors.confirmPassword && <span id="confirm-error" className="field-error" role="alert">{errors.confirmPassword}</span>}</label>
    <button className="btn btn-primary" disabled={pending} type="submit">{pending ? 'Keičiama…' : 'Pakeisti slaptažodį'}</button>
  </form>;
}
