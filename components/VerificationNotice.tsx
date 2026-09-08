'use client';
import AuthEmailForm from '@/components/AuthEmailForm';

export default function VerificationNotice({ email }: { email: string }) {
  return <section className="auth-card">
    <h1>Patvirtinkite el. paštą</h1>
    <p>Patikrinkite savo el. paštą ir paspauskite gautą patvirtinimo nuorodą. Paskyra bus aktyvi tik patvirtinus el. paštą.</p>
    <AuthEmailForm kind="verification" initialEmail={email} initialCooldown={60} />
  </section>;
}
