'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { jobs } from '@/data/jobs';

export default function JobsPage() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [type, setType] = useState('');
  const [sector, setSector] = useState('');
  const [sort, setSort] = useState('newest');

  const locations = Array.from(new Set(jobs.map((job) => job.location)));
  const specializations = Array.from(new Set(jobs.map((job) => job.specialization)));
  const types = Array.from(new Set(jobs.map((job) => job.type)));
  const sectors = Array.from(new Set(jobs.map((job) => job.sector)));

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = jobs.filter((job) => {
      const matchesQuery = !q || [job.title, job.company, job.description, job.specialization, ...job.tags].join(' ').toLowerCase().includes(q);
      const matchesLocation = !location || job.location === location;
      const matchesSpecialization = !specialization || job.specialization === specialization;
      const matchesType = !type || job.type === type;
      const matchesSector = !sector || job.sector === sector;
      return matchesQuery && matchesLocation && matchesSpecialization && matchesType && matchesSector;
    });

    return [...result].sort((a, b) => {
      if (sort === 'oldest') return b.postedDaysAgo - a.postedDaysAgo;
      if (sort === 'salary-high') return (b.salaryTo || b.salaryFrom || 0) - (a.salaryTo || a.salaryFrom || 0);
      if (sort === 'salary-low') return (a.salaryFrom || 0) - (b.salaryFrom || 0);
      return a.postedDaysAgo - b.postedDaysAgo;
    });
  }, [query, location, specialization, type, sector, sort]);

  const clearFilters = () => {
    setQuery(''); setLocation(''); setSpecialization(''); setType(''); setSector(''); setSort('newest');
  };

  return (
    <>
      <Navigation />
      <main className="page-shell">
        <div className="page-container">
          <div className="page-heading">
            <span className="eyebrow">Darbo paieška</span>
            <h1>Darbo skelbimai</h1>
            <p>Ieškokite visame veterinarijos sektoriuje – nuo klinikos iki farmacijos, laboratorijos ar ūkio.</p>
          </div>

          <section className="filter-panel">
            <div className="search-row">
              <label className="sr-only" htmlFor="job-search">Ieškoti darbo</label>
              <input id="job-search" className="form-control search-control" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pareigos, įmonė, raktažodis..." />
              <button type="button" className="btn btn-primary" onClick={() => setQuery((value) => value.trim())}>🔎 Ieškoti</button>
            </div>
            <div className="filter-grid">
              <label className="field"><span>Lokacija</span><select value={location} onChange={(e) => setLocation(e.target.value)}><option value="">Visos lokacijos</option>{locations.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="field"><span>Specializacija</span><select value={specialization} onChange={(e) => setSpecialization(e.target.value)}><option value="">Visos kryptys</option>{specializations.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="field"><span>Darbo tipas</span><select value={type} onChange={(e) => setType(e.target.value)}><option value="">Visi tipai</option>{types.map((value) => <option key={value}>{value}</option>)}</select></label>
              <label className="field"><span>Sektorius</span><select value={sector} onChange={(e) => setSector(e.target.value)}><option value="">Visi sektoriai</option>{sectors.map((value) => <option key={value}>{value}</option>)}</select></label>
            </div>
            <button className="text-button" type="button" onClick={clearFilters}>Išvalyti filtrus</button>
          </section>

          <div className="results-bar">
            <p>Rasta <strong>{filteredJobs.length}</strong> {filteredJobs.length === 1 ? 'pozicija' : 'pozicijos'}</p>
            <label className="inline-field"><span>Rūšiuoti:</span><select value={sort} onChange={(e) => setSort(e.target.value)}><option value="newest">Naujausi</option><option value="oldest">Seniausi</option><option value="salary-high">Didžiausias atlygis</option><option value="salary-low">Mažiausias atlygis</option></select></label>
          </div>

          <div className="jobs-list">
            {filteredJobs.map((job) => (
              <Link href={`/skelbimas/${job.id}`} key={job.id} className="job-card">
                <div className="job-card-top">
                  <div><h2>{job.title}</h2><p className="company-name">{job.company}</p></div>
                  <span className="pill">{job.type}</span>
                </div>
                <div className="job-meta"><span>📍 {job.location}</span><span>💶 {job.salary}</span><span>🕐 prieš {job.postedDaysAgo} d.</span><span>🏢 {job.sector}</span></div>
                <p className="job-summary">{job.description}</p>
                <div className="tag-row">{job.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
              </Link>
            ))}
            {filteredJobs.length === 0 && <div className="empty-state"><div className="empty-icon">🔎</div><h2>Nerasta atitinkančių skelbimų</h2><p>Pakeiskite filtrus arba paieškos žodžius.</p><button className="btn btn-secondary" onClick={clearFilters}>Išvalyti filtrus</button></div>}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
