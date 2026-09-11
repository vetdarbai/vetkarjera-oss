import type { Metadata } from 'next';
import { Fraunces, Manrope } from 'next/font/google';
import './globals.css';
import { cookies } from 'next/headers';
import { getActiveUser } from '@/lib/auth/session';
import AuthSession from '@/components/AuthSession';

const fraunces = Fraunces({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fraunces',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VetKarjera – veterinarijos darbo ir karjeros platforma',
  description: 'Darbo skelbimai, specialistų ir darbdavių registracija veterinarijos sektoriuje Lietuvoje.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, store] = await Promise.all([getActiveUser(), cookies()]);
  return (
    <html lang="lt">
      <body className={`${fraunces.variable} ${manrope.variable}`}><AuthSession initialUser={user} verified={!!user && store.get('vk-email-verified')?.value === '1'}>{children}</AuthSession></body>
    </html>
  );
}
