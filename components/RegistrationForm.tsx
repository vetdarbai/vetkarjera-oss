'use client';
import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { registerAccount } from '@/app/auth/actions';
import { registrationErrors, type AccountRole, type AuthField } from '@/lib/auth/validation';
import AuthEmailForm from '@/components/AuthEmailForm';

export default function RegistrationForm({ role }: { role: AccountRole }) {
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Partial<Record<AuthField, string>>>({});
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = { firstName: String(data.get('firstName') || ''), lastName: String(data.get('lastName') || ''), email: String(data.get('email') || ''), password: String(data.get('password') || ''), confirmPassword: String(data.get('confirmPassword') || ''), agreedToTerms: data.get('agreedToTerms') === 'on', role };
    const invalid = registrationErrors(input);
    setErrors(invalid); setMessage('');
    if (Object.keys(invalid).length) { (form.elements.namedItem(Object.keys(invalid)[0]) as HTMLElement)?.focus(); return; }
    setPending(true);
    try {
      const result = await registerAccount(input);
      if (result.ok) { form.reset(); setEmail(input.email.trim()); }
      else { setErrors(result.fieldErrors || {}); setMessage(result.message || ''); }
    } catch { setMessage('Nepavyko susisiekti. Bandykite dar kartą.'); }
    finally { setPending(false); }
  }
  if (email !== null) return <><h1>Patvirtinkite el. paštą</h1><div className="notice notice-success" role="status">Registracijos užklausa priimta. Patikrinkite el. paštą ir paspauskite patvirtinimo nuorodą.</div><AuthEmailForm kind="verification" initialEmail={email} initialCooldown={60} /></>;
  const fields: { name: Exclude<AuthField, 'agreedToTerms'>; label: string; type: string; autoComplete: string; maxLength: number }[] = [
    { name: 'firstName', label: role === 'employer' ? 'Kontaktinio asmens vardas' : 'Vardas', type: 'text', autoComplete: 'given-name', maxLength: 100 },
    { name: 'lastName', label: 'Pavardė', type: 'text', autoComplete: 'family-name', maxLength: 100 },
    { name: 'email', label: 'El. paštas', type: 'email', autoComplete: 'email', maxLength: 254 },
    { name: 'password', label: 'Slaptažodis', type: 'password', autoComplete: 'new-password', maxLength: 128 },
    { name: 'confirmPassword', label: 'Pakartoti slaptažodį', type: 'password', autoComplete: 'new-password', maxLength: 128 },
  ];
  return <><h1>{role === 'specialist' ? 'Specialisto registracija' : 'Darbdavio registracija'}</h1><p className="muted">Sukurkite savo „VetKarjera“ paskyrą.</p><form className="form-stack" onSubmit={submit} noValidate>
    {message && <div className="notice notice-error" role="alert">{message}</div>}
    {fields.map(({ label, ...field }) => <label key={field.name} className="field" htmlFor={field.name}><span>{label}</span><input {...field} id={field.name} required aria-invalid={!!errors[field.name]} aria-describedby={errors[field.name] ? `${field.name}-error` : field.name === 'password' ? 'password-help' : undefined} onChange={() => setErrors(current => ({ ...current, [field.name]: undefined }))} />{field.name === 'password' && <small id="password-help">Nuo 8 iki 128 simbolių.</small>}{errors[field.name] && <span className="field-error" id={`${field.name}-error`} role="alert">{errors[field.name]}</span>}</label>)}
    <div><label className="check-line"><input name="agreedToTerms" type="checkbox" required aria-invalid={!!errors.agreedToTerms} aria-describedby={errors.agreedToTerms ? 'terms-error' : undefined} onChange={() => setErrors(current => ({ ...current, agreedToTerms: undefined }))} /><span>Sutinku su <Link href="/taisykles">naudojimosi taisyklėmis</Link> ir <Link href="/privatumas">privatumo informacija</Link>.</span></label>{errors.agreedToTerms && <p className="field-error" id="terms-error" role="alert">{errors.agreedToTerms}</p>}</div>
    <button className="btn btn-primary btn-block" disabled={pending} type="submit">{pending ? 'Kuriama paskyra…' : 'Registruotis'}</button><Link href="/prisijungti">Jau turite paskyrą? Prisijungti</Link>
  </form></>;
}
