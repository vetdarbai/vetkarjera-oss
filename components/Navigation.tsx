import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="site-nav" aria-label="Pagrindinė navigacija">
      <div className="nav-container">
        <Link href="/" className="logo" aria-label="VetKarjera pagrindinis puslapis">
          <span className="logo-mark">VK</span>
          <span className="logo-copy">
            <strong>VetKarjera</strong>
            <small>Veterinarijos darbo platforma</small>
          </span>
        </Link>
        <div className="nav-links">
          <Link href="/skelbimai">Skelbimai</Link>
          <Link href="/darbdavys">Darbdaviams</Link>
          <Link href="/prisijungti">Prisijungti</Link>
          <Link href="/registracija/kandidatas" className="nav-cta">Specialisto profilis</Link>
        </div>
      </div>
    </nav>
  );
}
