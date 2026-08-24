import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function EmployerPage() {
  return (
    <>
      <Navigation />
      <main>
        <section className="hero-section hero-compact">
          <div className="hero-inner">
            <span className="eyebrow">🏥 Darbdaviams veterinarijos sektoriuje</span>
            <h1>Raskite žmogų, kuris tinka ne tik CV</h1>
            <p className="hero-lead">VetKarjera skirta klinikoms, didmenoms, farmacijos įmonėms, ūkiams, laboratorijoms, institucijoms ir kitoms veterinarijos organizacijoms.</p>
            <div className="hero-actions">
              <Link href="/registracija/darbdavys" className="btn btn-primary">Registruoti organizaciją</Link>
              <Link href="/skelbti" className="btn btn-secondary">Peržiūrėti skelbimo formą</Link>
            </div>
          </div>
        </section>
        <section className="section section-white">
          <div className="section-container">
            <div className="section-heading"><span className="eyebrow">Kodėl VetKarjera</span><h2>Sukurta nišinei darbo rinkai</h2></div>
            <div className="card-grid card-grid-3">
              <div className="feature-card"><span className="feature-icon">🎯</span><h3>Tikslinė auditorija</h3><p>Darbo pasiūlymus mato žmonės, kuriems veterinarijos sektorius yra aktualus.</p></div>
              <div className="feature-card"><span className="feature-icon">💶</span><h3>Skelbimai nemokami</h3><p>Bazinį darbo pasiūlymą planuojama leisti skelbti nemokamai ir ateityje.</p></div>
              <div className="feature-card"><span className="feature-icon">🤖</span><h3>AI atranka – vėliau</h3><p>Surinkti struktūruoti profilių duomenys vėliau leis kurti aiškesnį kandidatų ir pozicijų matching.</p></div>
              <div className="feature-card"><span className="feature-icon">🧩</span><h3>Skirtingi sektoriai</h3><p>Ne tik klinikos: distribucija, farmacija, ūkiai, institucijos, laboratorijos ir kita.</p></div>
              <div className="feature-card"><span className="feature-icon">🎓</span><h3>Praktikos vietos</h3><p>Darbdaviai gali komunikuoti ir praktikos ar stažuočių galimybes studentams.</p></div>
              <div className="feature-card"><span className="feature-icon">🔒</span><h3>Privatumas</h3><p>Backend etape bus diegiama prieigos kontrolė, vartotojų sesijos ir BDAR principus atitinkantis duomenų valdymas.</p></div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
