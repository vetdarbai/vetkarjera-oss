import Link from 'next/link';

function RegistrationMenu({ className = '' }: { className?: string }) {
  return (
    <details className={`registration-menu ${className}`.trim()} suppressHydrationWarning>
      <summary>Registruotis <span aria-hidden="true">⌄</span></summary>
      <div className="registration-dropdown">
        <Link href="/registracija/kandidatas">Registruotis specialistui <span aria-hidden="true">›</span></Link>
        <Link href="/registracija/darbdavys">Registruotis darbdaviui <span aria-hidden="true">›</span></Link>
      </div>
    </details>
  );
}

export default function Navigation() {
  return (
    <nav className="site-nav" aria-label="Pagrindinė navigacija">
      <div className="nav-container">
        <Link href="/" className="logo" aria-label="VetKarjera pagrindinis puslapis">
          <span className="logo-mark">VK</span>
          <span className="logo-copy"><strong>VetKarjera</strong><small>Veterinarijos darbo platforma</small></span>
        </Link>

        <div className="desktop-navigation">
          <Link href="/skelbimai">Skelbimai</Link><Link href="/darbdavys">Darbdaviams</Link><Link href="/skelbti">Paskelbti skelbimą</Link><Link href="/prisijungti">Prisijungti</Link><RegistrationMenu />
        </div>

        <div className="mobile-navigation">
          <Link href="/prisijungti" className="mobile-login">Prisijungti</Link>
          <RegistrationMenu className="mobile-registration" />
          <details className="mobile-menu" suppressHydrationWarning>
            <summary aria-label="Atverti navigaciją"><span /><span /><span /></summary>
            <div className="mobile-menu-panel"><Link href="/skelbimai">Skelbimai</Link><Link href="/darbdavys">Darbdaviams</Link><Link href="/skelbti">Paskelbti skelbimą</Link></div>
          </details>
        </div>
      </div>
    </nav>
  );
}
