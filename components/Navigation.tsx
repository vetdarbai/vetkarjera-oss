import Link from 'next/link';

export default function Navigation() {
  return (
    <nav>
      <div className="nav-container">
        <Link href="/" className="logo">
          VetKarjera
        </Link>
        <ul className="nav-links">
          <li><Link href="/skelbimai">Skelbimai</Link></li>
          <li><Link href="#apie">Apie mus</Link></li>
          <li><Link href="#kontaktai">Kontaktai</Link></li>
        </ul>
      </div>
    </nav>
  );
}
