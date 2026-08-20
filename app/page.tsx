'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { jobs } from '@/data/jobs';
import AuthModal from '@/components/AuthModal';
import './page.css';

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'candidate' | 'employer'>('candidate');

  const handleCandidateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setModalType('candidate');
    setIsModalOpen(true);
  };

  const handleEmployerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setModalType('employer');
    setIsModalOpen(true);
  };

  return (
    <>
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🐾 Veterinarijos Specialistams</div>
          
          <h1>Rask savo karjerą veterinarijoje</h1>
          
          <p className="hero-description">
            Platforma ieškantiems darbo, specialistų, praktikos ar naujų karjeros galimybių visame veterinarijos sektoriuje.
          </p>
          <p className="hero-description">
            Skelbimų patalpinimas NEMOKAMAS! ir toks liks visada.
          </p>

          <div className="cta-container">
            <button onClick={handleCandidateClick} className="btn btn-primary">
              <span>👨‍⚕️</span>
              <span>Ieškau darbo</span>
            </button>
            <button onClick={handleEmployerClick} className="btn btn-secondary">
              <span>🏥</span>
              <span>Ieškau specialistų</span>
            </button>
          </div>
        </div>
      </section>

      {/* Latest Jobs Section */}
      <section className="latest-jobs">
        <div className="latest-jobs-container">
          <h2 className="section-title">Aktyvūs darbo skelbimai</h2>
          <p className="section-subtitle">Peržiūrėkite naujausius pasiūlymus veterinarijos srityje</p>
          
          <div className="jobs-preview-grid">
            {jobs.slice(0, 6).map((job) => (
              <Link href={`/skelbimas/${job.id}`} key={job.id} className="job-preview-card">
                <div className="job-preview-header">
                  <div>
                    <h3 className="job-preview-title">{job.title}</h3>
                    <p className="job-preview-company">🏥 {job.company}</p>
                  </div>
                  <span className="job-preview-badge">{job.type}</span>
                </div>
                <div className="job-preview-meta">
                  <span className="job-preview-meta-item">📍 {job.location}</span>
                  <span className="job-preview-meta-item">💰 {job.salary}</span>
                </div>
                <p className="job-preview-description">
                  {job.description.length > 120 
                    ? job.description.substring(0, 120) + '...' 
                    : job.description}
                </p>
                <div className="job-preview-tags">
                  {job.tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="job-preview-tag">{tag}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          <div className="view-all-container">
            <Link href="/skelbimai" className="btn btn-primary">
              Žiūrėti visus skelbimus →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
      
      <AuthModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        type={modalType}
      />
    </>
  );
}
