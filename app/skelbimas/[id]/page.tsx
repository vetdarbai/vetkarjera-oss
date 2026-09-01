import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { jobs } from '@/data/jobs';

const formatDate = (value: string) => new Intl.DateTimeFormat('lt-LT', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${value}T00:00:00Z`));

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const job = jobs.find((item) => item.id === Number(params.id));
  if (!job) notFound();

  const isNew = job.postedDaysAgo <= 3;

  return (
    <>
      <Navigation />
      <main className="job-detail-page">
        <div className="job-detail-wrap">
          <Link href="/skelbimai" className="back-link">← Visi darbo skelbimai</Link>

          <header className="job-detail-header">
            <div className="job-detail-heading">
              <div className="job-detail-status-line">
                <span className={`status-badge ${isNew ? 'status-new' : ''}`}>{isNew ? 'Naujas' : 'Aktyvus'}</span>
                <time dateTime={job.postedDate}>Paskelbta {formatDate(job.postedDate)}</time>
              </div>
              <span className="section-kicker">{job.sector}</span>
              <h1>{job.title}</h1>
              <Link href="/darbdavys" className="employer-link">{job.company} <span aria-hidden="true">↗</span></Link>
            </div>

            <dl className="job-detail-facts">
              <div><dt>Vieta</dt><dd>{job.location}</dd></div>
              <div><dt>Atlygis</dt><dd>{job.salary}</dd></div>
              <div><dt>Etatas</dt><dd>{job.type}</dd></div>
              <div><dt>Kategorija</dt><dd>{job.specialization}</dd></div>
            </dl>
          </header>

          <div className="job-detail-layout">
            <article className="job-description-article">
              <section className="job-intro">
                <span className="content-index">01</span>
                <div><h2>Apie poziciją</h2><p>{job.fullDescription.jobDescription}</p></div>
              </section>
              <section>
                <span className="content-index">02</span>
                <div><h2>Apie organizaciją</h2><p>{job.fullDescription.about}</p></div>
              </section>
              <section>
                <span className="content-index">03</span>
                <div><h2>Atsakomybės</h2><ul>{job.fullDescription.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </section>
              <section>
                <span className="content-index">04</span>
                <div><h2>Ko tikimasi</h2><ul>{job.fullDescription.requirements.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </section>
              <section>
                <span className="content-index">05</span>
                <div><h2>Ką siūlo darbdavys</h2><ul>{job.fullDescription.weOffer.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </section>
              <section>
                <span className="content-index">06</span>
                <div><h2>Sąlygos</h2><ul>{job.fullDescription.conditions.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </section>
            </article>

            <aside className="candidate-panel">
              <span className="candidate-panel-label">Specialistui</span>
              <h2>Domina ši pozicija?</h2>
              <p>Kandidatavimo ir CV siuntimo funkcija dar neprijungta. Galite susikurti demonstracinį specialisto profilį.</p>
              <Link href="/registracija/kandidatas" className="btn btn-primary btn-block">Specialisto profilis <span>→</span></Link>
              <Link href="/prisijungti" className="quiet-action">Jau turite profilį? Prisijungti</Link>
              <dl>
                <div><dt>Skelbimo būsena</dt><dd>{isNew ? 'Naujas' : 'Aktyvus'}</dd></div>
                <div><dt>Paskelbta</dt><dd>{formatDate(job.postedDate)}</dd></div>
              </dl>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
