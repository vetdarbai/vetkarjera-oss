import Link from 'next/link';
import AuthFrame from '@/components/AuthFrame';
export default function AuthErrorPage() {
  return <AuthFrame><h1>Nuoroda nebegalioja</h1><p>Nuoroda netinkama, jau panaudota arba jos galiojimas baigėsi. Paprašykite naujos nuorodos.</p><div className="form-stack"><Link href="/patvirtinti-pasta" className="btn btn-secondary">Siųsti patvirtinimą dar kartą</Link><Link href="/pamirsau-slaptazodi" className="btn btn-secondary">Atkurti slaptažodį</Link><Link href="/prisijungti">Prisijungti</Link></div></AuthFrame>;
}
