'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import { jobs } from '@/data/jobs';

export default function HomePage() {
  const [modalType, setModalType] = useState<'candidate' | 'employer'>('candidate');
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = (type: 'candidate' | 'employer') => {
    setModalType(type);
    setModalOpen(true);
  };

  return (
    <>
      <Navigation />
      <main>
        <section className="hero-section">
          <div className="hero-inner">
            <span className="eyebrow">🐾 Veterinarijos profesionalams ir darbdaviams</span>
            <h1>Rask savo vietą veterinarijos sektoriuje</h1>
            <p className="hero-lead">
              Darbo pasiūlymai klinikose, didmenose, farmacinėse įmonėse, ūkiuose, laboratorijose ir kitose veterinarijos organizacijose.
            </p>
            <p className="hero-free">Darbo skelbimų talpinimas nemokamas.</p>
            <div className="hero-actions">
              <button className="btn btn-primary" onClick={() => openModal('candidate')}>🩺 Ieškau darbo</button>
              <button className="btn btn-secondary" onClick={() => openModal('employer')}>🏥 Ieškau specialistų</button>
            </div>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-container">
            <div className="section-heading">
              <span className="eyebrow">Naujausi pasiūlymai</span>
              <h2>Aktyvūs darbo skelbimai</h2>
              <p>Vienoje vietoje – klinikinės, komercinės, laboratorinės ir kitos veterinarijos sektoriaus pozicijos.</p>
            </div>
            <div className="card-grid card-grid-3">
              {jobs.slice(0, 6).map((job) => (
                <Link href={`/skelbimas/${job.id}`} key={job.id} className="job-card compact-job-card">
                  <div className="job-card-top">
                    <div>
                      <h3>{job.title}</h3>
                      <p className="company-name">{job.company}</p>
                    </div>
                    <span className="pill">{job.type}</span>
                  </div>
                  <div className="job-meta">
                    <span>📍 {job.location}</span>
                    <span>💶 {job.salary}</span>
                  </div>
                  <p className="job-summary">{job.description}</p>
                  <div className="tag-row">
                    {job.tags.slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                  </div>
                </Link>
              ))}
            </div>
            <div className="center-action">
              <Link href="/skelbimai" className="btn btn-primary">Žiūrėti visus skelbimus →</Link>
            </div>
          </div>
        </section>

        <section className="section" id="kaip-veikia">
          <div className="section-container">
            <div className="section-heading">
              <span className="eyebrow">Paprasta pradžia</span>
              <h2>Kaip veikia VetKarjera</h2>
            </div>
            <div className="card-grid card-grid-3">
              <div className="feature-card"><span className="feature-number">01</span><h3>Susikurkite profilį</h3><p>Specialistas aprašo savo kryptį ir lūkesčius, darbdavys – organizaciją ir veiklos sritį.</p></div>
              <div className="feature-card"><span className="feature-number">02</span><h3>Raskite tinkamą pasiūlymą</h3><p>Naršykite darbo pasiūlymus arba paskelbkite poziciją veterinarijos sektoriuje.</p></div>
              <div className="feature-card"><span className="feature-number">03</span><h3>AI matching – vėliau</h3><p>Backend etape profilių duomenys bus naudojami tikslesniam specialistų ir darbo vietų suderinimui.</p></div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <AuthModal isOpen={modalOpen} onClose={() => setModalOpen(false)} type={modalType} />
    </>
  );
}
