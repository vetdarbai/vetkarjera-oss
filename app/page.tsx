import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { jobs } from '@/data/jobs';

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main>
        <section className="home-hero">
          <div className="home-hero-grid">
            <div className="home-hero-copy">
              <span className="section-kicker">Veterinarijos karjerai Lietuvoje</span>
              <h1>
                Darbas, kuriame <em>kompetencija</em> randa savo vietą.
              </h1>
              <p>
                Atrinkti pasiūlymai veterinarijos gydytojams, technikams, studentams ir
                gyvūnų sveikatos sektoriaus profesionalams — nuo klinikos iki laboratorijos.
              </p>
              <div className="hero-primary-action">
                <Link href="/skelbimai" className="btn btn-primary">
                  Peržiūrėti darbo skelbimus
                  <span aria-hidden="true">→</span>
                </Link>
                <span>{jobs.length} demonstracinių pozicijų</span>
              </div>
            </div>

            <aside className="hero-note" aria-label="Platformos kryptis">
              <span className="hero-note-index">01 / 03</span>
              <p>
                Viena profesinė erdvė visiems, kurie rūpinasi gyvūnų sveikata ir nori
                kurti atsakingą karjerą.
              </p>
              <dl>
                <div><dt>Kryptys</dt><dd>Klinika · Farmacija · Ūkis</dd></div>
                <div><dt>Regionas</dt><dd>Visa Lietuva</dd></div>
              </dl>
            </aside>
          </div>
        </section>

        <section className="paths-section" aria-labelledby="paths-title">
          <div className="section-container">
            <div className="editorial-heading">
              <span className="section-index">02</span>
              <div>
                <span className="section-kicker">Dvi aiškios kryptys</span>
                <h2 id="paths-title">Nuo ko pradedame?</h2>
              </div>
            </div>

            <div className="career-paths">
              <article className="career-path career-path-candidate">
                <div className="career-path-label">Specialistams</div>
                <h3>Ieškau darbo</h3>
                <p>
                  Peržiūrėkite pozicijas pagal miestą, profesinę kryptį ir sektorių.
                  Atlygis ir darbo pobūdis matomi dar prieš atidarant skelbimą.
                </p>
                <ul>
                  <li>Viešai matomi aktyvūs skelbimai</li>
                  <li>Aiškūs filtrai ir darbo sąlygos</li>
                  <li>Specialisto profilis paruoštas MVP režimu</li>
                </ul>
                <div className="career-path-actions">
                  <Link href="/skelbimai" className="text-link">Rasti poziciją <span>→</span></Link>
                  <Link href="/registracija/kandidatas" className="quiet-link">Kurti demonstracinį profilį</Link>
                </div>
              </article>

              <article className="career-path career-path-employer">
                <div className="career-path-label">Organizacijoms</div>
                <h3>Ieškau darbuotojo</h3>
                <p>
                  Pristatykite savo organizaciją ir poziciją žmonėms, kurie veterinarijos
                  rinką supranta ne iš šalies.
                </p>
                <ul>
                  <li>Skelbimų talpinimas MVP etape nemokamas</li>
                  <li>Veterinarijos rinkai pritaikyta struktūra</li>
                  <li>Registracijos forma veikia demonstraciniu režimu</li>
                </ul>
                <div className="career-path-actions">
                  <Link href="/darbdavys" className="text-link">Darbdaviams <span>→</span></Link>
                  <Link href="/registracija/darbdavys" className="quiet-link">Registruoti organizaciją</Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="latest-section" aria-labelledby="latest-title">
          <div className="section-container">
            <div className="editorial-heading editorial-heading-split">
              <span className="section-index">03</span>
              <div>
                <span className="section-kicker">Naujausi pasiūlymai</span>
                <h2 id="latest-title">Karjeros pulsas</h2>
              </div>
              <Link href="/skelbimai" className="text-link all-jobs-link">Visi skelbimai <span>→</span></Link>
            </div>

            <div className="editorial-jobs">
              {jobs.slice(0, 4).map((job, index) => (
                <Link href={`/skelbimas/${job.id}`} key={job.id} className="editorial-job">
                  <span className="job-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="job-title-block">
                    <span>{job.company}</span>
                    <h3>{job.title}</h3>
                  </div>
                  <div className="job-location">
                    <span>Vieta</span>
                    <strong>{job.location}</strong>
                  </div>
                  <div className="job-salary">
                    <span>Atlygis</span>
                    <strong>{job.salary}</strong>
                  </div>
                  <span className="job-arrow" aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="home-manifesto">
          <div className="section-container manifesto-grid">
            <span className="section-kicker">Profesinė bendruomenė</span>
            <blockquote>
              Veterinarijos karjera nėra vien pareigų pavadinimas. Tai atsakomybė,
              žinios ir komanda, su kuria norisi augti.
            </blockquote>
            <p>
              „VetKarjera“ kuriama kaip aiški, patikima ir specializuota susitikimo
              vieta rinkai — be triukšmo ir bendrinių pažadų.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
