'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { jobs } from '@/data/jobs';

const formatDate = (value: string) => new Intl.DateTimeFormat('lt-LT', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
}).format(new Date(`${value}T00:00:00Z`));

const getStatus = (postedDaysAgo: number) => postedDaysAgo <= 3 ? 'Naujas' : 'Aktyvus';

export default function JobsPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [location, setLocation] = useState(() => searchParams.get('location') || '');
  const [specialization, setSpecialization] = useState(() => searchParams.get('specialization') || '');
  const [type, setType] = useState('');
  const [sector, setSector] = useState('');
  const [sort, setSort] = useState('newest');

  const locations = Array.from(new Set(jobs.map((job) => job.location))).sort();
  const specializations = Array.from(new Set(jobs.map((job) => job.specialization))).sort();
  const types = Array.from(new Set(jobs.map((job) => job.type))).sort();
  const sectors = Array.from(new Set(jobs.map((job) => job.sector))).sort();

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = jobs.filter((job) => {
      const searchable = [job.title, job.company, job.description, job.specialization, job.sector, ...job.tags]
        .join(' ')
        .toLowerCase();

      return (!q || searchable.includes(q))
        && (!location || job.location === location)
        && (!specialization || job.specialization === specialization)
        && (!type || job.type === type)
        && (!sector || job.sector === sector);
    });

    return [...result].sort((a, b) => {
      if (sort === 'oldest') return b.postedDaysAgo - a.postedDaysAgo;
      if (sort === 'salary-high') return (b.salaryTo || b.salaryFrom || 0) - (a.salaryTo || a.salaryFrom || 0);
      if (sort === 'salary-low') return (a.salaryFrom || a.salaryTo || 0) - (b.salaryFrom || b.salaryTo || 0);
      return a.postedDaysAgo - b.postedDaysAgo;
    });
  }, [query, location, specialization, type, sector, sort]);

  const activeFilterCount = [query, location, specialization, type, sector].filter(Boolean).length;

  const clearFilters = () => {
    setQuery('');
    setLocation('');
    setSpecialization('');
    setType('');
    setSector('');
    setSort('newest');
  };

  return (
    <>
      <Navigation />
      <main className="jobs-page">
        <header className="jobs-header">
          <div className="jobs-header-inner">
            <div className="jobs-heading-grid">
              <h1>Darbo skelbimai</h1>
              <p>Veterinarijos darbo pasiūlymai visoje Lietuvoje.</p>
            </div>
          </div>
        </header>

        <section className="jobs-filter-section" aria-label="Darbo skelbimų filtrai">
          <div className="jobs-filter-bar">
            <label className="filter-control filter-control-search">
              <span>Pozicija arba raktažodis</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pvz., chirurgas, laboratorija..." />
            </label>
            <label className="filter-control">
              <span>Miestas</span>
              <select value={location} onChange={(event) => setLocation(event.target.value)}>
                <option value="">Visos vietos</option>
                {locations.map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="filter-control">
              <span>Profesijos kategorija</span>
              <select value={specialization} onChange={(event) => setSpecialization(event.target.value)}>
                <option value="">Visos kategorijos</option>
                {specializations.map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <details className="more-filters">
              <summary>
                Papildomi filtrai
                {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              </summary>
              <div className="more-filters-panel">
                <label className="filter-control">
                  <span>Etatas</span>
                  <select value={type} onChange={(event) => setType(event.target.value)}>
                    <option value="">Visi tipai</option>
                    {types.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label className="filter-control">
                  <span>Sektorius</span>
                  <select value={sector} onChange={(event) => setSector(event.target.value)}>
                    <option value="">Visi sektoriai</option>
                    {sectors.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <button type="button" className="text-button" onClick={clearFilters}>Išvalyti visus filtrus</button>
              </div>
            </details>
          </div>
        </section>

        <section className="jobs-results">
          <div className="jobs-results-top">
            <p><strong>{filteredJobs.length}</strong> {filteredJobs.length === 1 ? 'pasiūlymas' : 'pasiūlymai'}</p>
            <label className="jobs-sort">
              <span>Rikiuoti</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="newest">Naujausi pirmiau</option>
                <option value="oldest">Seniausi pirmiau</option>
                <option value="salary-high">Didžiausias atlygis</option>
                <option value="salary-low">Mažiausias atlygis</option>
              </select>
            </label>
          </div>

          <div className="job-rows">
            {filteredJobs.map((job) => (
              <Link href={`/skelbimas/${job.id}`} key={job.id} className="job-row">
                <div className="job-row-status">
                  <span className={`status-badge ${job.postedDaysAgo <= 3 ? 'status-new' : ''}`}>{getStatus(job.postedDaysAgo)}</span>
                  <time dateTime={job.postedDate}>{formatDate(job.postedDate)}</time>
                </div>
                <div className="job-row-main">
                  <span className="job-sector">{job.sector}</span>
                  <h2>{job.title}</h2>
                  <p className="job-row-company">{job.company}</p>
                  <p className="job-row-description">{job.description}</p>
                </div>
                <dl className="job-row-facts">
                  <div><dt>Vieta</dt><dd>{job.location}</dd></div>
                  <div><dt>Atlygis</dt><dd>{job.salary}</dd></div>
                  <div><dt>Etatas</dt><dd>{job.type}</dd></div>
                </dl>
                <span className="job-row-arrow" aria-hidden="true">›</span>
              </Link>
            ))}
          </div>

          {filteredJobs.length === 0 && (
            <div className="jobs-empty">
              <span>0 rezultatų</span>
              <h2>Šįkart tinkamų pasiūlymų neradome.</h2>
              <p>Pabandykite trumpesnį raktažodį arba išvalykite pasirinktus filtrus.</p>
              <button type="button" className="btn btn-secondary" onClick={clearFilters}>Išvalyti filtrus</button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
