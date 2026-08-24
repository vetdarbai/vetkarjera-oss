import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function NotFound() {
  return <><Navigation /><main className="success-page"><div className="success-card"><div className="empty-icon">404</div><h1>Puslapis nerastas</h1><p>Nuoroda gali būti pasenusi arba puslapis dar nesukurtas.</p><div className="success-actions"><Link href="/" className="btn btn-primary">Į pagrindinį</Link><Link href="/skelbimai" className="btn btn-secondary">Darbo skelbimai</Link></div></div></main><Footer /></>;
}
