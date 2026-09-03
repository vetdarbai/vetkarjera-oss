import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { jobs } from '@/data/jobs';

const sectors = Array.from(new Set(jobs.map((job) => job.sector)));

export default function EmployerPage() {
  return (
    <>
      <Navigation />
      <main className="employer-page">
        <section className="employer-hero">
          <div className="employer-hero-grid">
            <div>
              <span className="section-kicker">Darbdaviams veterinarijos sektoriuje</span>
              <h1>Darbdaviams</h1>
            </div>
            <div className="employer-hero-aside">
              <p>Pristatykite poziciją žmonėms, kurie supranta veterinarijos darbo rinką, jos atsakomybę ir profesines kryptis.</p>
              <div className="employer-actions">
                <Link href="/registracija/darbdavys" className="btn btn-primary">Registruoti organizaciją</Link>
                <Link href="/skelbti" className="employer-form-link">Paskelbti darbo skelbimą</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="employer-proof">
          <div className="section-container employer-proof-grid">
            <div className="editorial-heading">
              <span className="section-index">01</span>
              <div><span className="section-kicker">Tiksli auditorija</span><h2>Viena rinka.<br />Daug profesinių krypčių.</h2></div>
            </div>
            <div className="employer-statements">
              <article><span>01</span><h3>Specializuotas kontekstas</h3><p>Skelbimo laukai pritaikyti klinikiniam, komerciniam, laboratoriniam ir ūkio darbui.</p></article>
              <article><span>02</span><h3>Aiškios darbo sąlygos</h3><p>Kandidatai mato vietą, atlygio intervalą, etatą ir profesinę kryptį dar sąraše.</p></article>
              <article><span>03</span><h3>Profesinė auditorija</h3><p>Pasiūlymą mato veterinarijos darbo rinka besidomintys specialistai.</p></article>
            </div>
          </div>
        </section>

        <section className="employer-market">
          <div className="section-container employer-market-grid">
            <div>
              <span className="section-kicker">Dabartinė pasiūla</span>
              <h2>{jobs.length} pozicijos<br />{sectors.length} sektoriuose</h2>
            </div>
            <p>Darbo pasiūlymai apima klinikas, laboratorijas, farmaciją, distribuciją ir gyvulininkystę.</p>
            <Link href="/skelbimai" className="text-link">Peržiūrėti darbo rinką</Link>
          </div>
        </section>

        <section className="employer-process">
          <div className="section-container">
            <div className="editorial-heading">
              <span className="section-index">02</span>
              <div><span className="section-kicker">Skelbimo struktūra</span><h2>Kandidatui svarbi informacija — pirmiausia.</h2></div>
            </div>
            <ol className="process-list">
              <li><span>01</span><div><h3>Organizacija</h3><p>Veiklos sritis, komanda ir darbo kontekstas.</p></div></li>
              <li><span>02</span><div><h3>Pozicija</h3><p>Atsakomybės, profesinė kryptis ir konkretūs lūkesčiai.</p></div></li>
              <li><span>03</span><div><h3>Sąlygos</h3><p>Atlygis, vieta, etatas ir tai, ką organizacija siūlo.</p></div></li>
            </ol>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
