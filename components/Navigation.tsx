import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="site-nav">
      <div className="nav-container">
        <Link href="/" className="logo" aria-label="VetKarjera pagrindinis puslapis">
          VetKarjera
        </Link>
        <div className="nav-links">
          <Link href="/skelbimai">Skelbimai</Link>
          <Link href="/darbdavys">Darbdaviams</Link>
          <Link href="/prisijungti">Prisijungti</Link>
          <Link href="/registracija/kandidatas" className="nav-cta">Registruotis</Link>
        </div>
      </div>
    </nav>
  );
}
