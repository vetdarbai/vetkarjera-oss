import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { jobs } from '@/data/jobs';

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const job = jobs.find((item) => item.id === Number(params.id));
  if (!job) notFound();

  return (
    <>
      <Navigation />
      <main className="page-shell">
        <div className="detail-container">
          <Link href="/skelbimai" className="back-link">← Grįžti į skelbimus</Link>
          <article className="detail-card">
            <div className="detail-hero">
              <div>
                <span className="eyebrow">{job.sector}</span>
                <h1>{job.title}</h1>
                <p className="detail-company">{job.company}</p>
              </div>
              <span className="pill pill-large">{job.type}</span>
            </div>
            <div className="detail-meta-grid">
              <div><span>📍</span><strong>Vieta</strong><p>{job.location}</p></div>
              <div><span>💶</span><strong>Atlygis</strong><p>{job.salary}</p></div>
              <div><span>🧭</span><strong>Kryptis</strong><p>{job.specialization}</p></div>
              <div><span>🕐</span><strong>Paskelbta</strong><p>prieš {job.postedDaysAgo} d.</p></div>
            </div>
            <div className="detail-content-grid">
              <div className="detail-main">
                <section className="content-section"><h2>Apie organizaciją</h2><p>{job.fullDescription.about}</p></section>
                <section className="content-section"><h2>Darbo pobūdis</h2><p>{job.fullDescription.jobDescription}</p></section>
                <section className="content-section"><h2>Atsakomybės</h2><ul>{job.fullDescription.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></section>
                <section className="content-section"><h2>Ko tikimės</h2><ul>{job.fullDescription.requirements.map((item) => <li key={item}>{item}</li>)}</ul></section>
                <section className="content-section"><h2>Ką siūlo darbdavys</h2><ul>{job.fullDescription.weOffer.map((item) => <li key={item}>{item}</li>)}</ul></section>
                <section className="content-section"><h2>Sąlygos</h2><ul>{job.fullDescription.conditions.map((item) => <li key={item}>{item}</li>)}</ul></section>
              </div>
              <aside className="apply-card">
                <h2>Domina ši pozicija?</h2>
                <p>Susikurkite specialisto profilį. Tikras kandidatavimas ir CV siuntimas bus prijungti kartu su backend.</p>
                <Link href="/registracija/kandidatas" className="btn btn-primary btn-block">Registruotis specialistui</Link>
                <Link href="/prisijungti" className="btn btn-secondary btn-block">Prisijungti</Link>
              </aside>
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
