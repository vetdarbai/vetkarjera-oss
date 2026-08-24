'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function LoginPage() {
  const [submitted, setSubmitted] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <Navigation />
      <main className="auth-page">
        <div className="auth-card">
          <span className="eyebrow">VetKarjera paskyra</span>
          <h1>Prisijungti</h1>
          <p className="muted">Prisijungimas vizualiai paruoštas. Tikra autentifikacija bus prijungta backend etape.</p>
          {submitted && <div className="notice notice-warning"><strong>Backend dar neprijungtas.</strong><span>El. paštas ir slaptažodis niekur nebuvo išsiųsti ar išsaugoti.</span></div>}
          <form onSubmit={submit} className="form-stack">
            <label className="field"><span>El. paštas</span><input type="email" required autoComplete="email" /></label>
            <label className="field"><span>Slaptažodis</span><input type="password" required minLength={8} autoComplete="current-password" /></label>
            <button className="btn btn-primary btn-block" type="submit">Prisijungti</button>
          </form>
          <div className="auth-divider"><span>arba</span></div>
          <div className="choice-actions">
            <Link href="/registracija/kandidatas" className="btn btn-secondary btn-block">Registruotis kaip specialistui</Link>
            <Link href="/registracija/darbdavys" className="btn btn-secondary btn-block">Registruotis kaip darbdaviui</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
