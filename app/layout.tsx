import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VetKarjera – veterinarijos darbo ir karjeros platforma',
  description: 'Darbo skelbimai, specialistų ir darbdavių registracija veterinarijos sektoriuje Lietuvoje.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="lt">
      <body>{children}</body>
    </html>
  );
}
