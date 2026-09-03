import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div>
          <div className="footer-brand">VetKarjera</div>
        </div>
        <div className="footer-links">
          <Link href="/skelbimai">Skelbimai</Link>
          <Link href="/darbdavys">Darbdaviams</Link>
          <Link href="/privatumas">Privatumas</Link>
          <Link href="/taisykles">Taisyklės</Link>
        </div>
      </div>
      <div className="footer-bottom">© 2026 VetKarjera</div>
    </footer>
  );
}
