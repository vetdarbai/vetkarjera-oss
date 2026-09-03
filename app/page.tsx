'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { jobs } from '@/data/jobs';

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');

  const locations = useMemo(() => Array.from(new Set(jobs.map((job) => job.location))).sort(), []);
  const categories = useMemo(() => Array.from(new Set(jobs.map((job) => job.specialization))), []);
  const latestJobs = useMemo(() => [...jobs].sort((a, b) => a.postedDaysAgo - b.postedDaysAgo).slice(0, 6), []);

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (location) params.set('location', location);
    router.push(`/skelbimai${params.size ? `?${params.toString()}` : ''}`);
  };

  return (
    <>
      <Navigation />
      <main className="registry-home">
        <section className="registry-hero">
          <div className="registry-container">
            <h1>Veterinarijos darbo skelbimai</h1>
            <p>Darbo pasiūlymai veterinarijos specialistams visoje Lietuvoje.</p>

            <form className="home-search" onSubmit={search} role="search">
              <label className="sr-only" htmlFor="home-query">Pareigos arba raktažodis</label>
              <input id="home-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pareigos arba raktažodis" />
              <label className="sr-only" htmlFor="home-location">Miestas arba regionas</label>
              <select id="home-location" value={location} onChange={(event) => setLocation(event.target.value)}>
                <option value="">Miestas arba regionas</option>
                {locations.map((value) => <option key={value}>{value}</option>)}
              </select>
              <button type="submit" className="btn btn-primary">Ieškoti</button>
            </form>
          </div>
        </section>

        <nav className="category-strip" aria-label="Profesinės kategorijos">
          <div className="registry-container category-strip-inner">
            <span className="category-label">Profesinės kategorijos</span>
            <div className="category-links">
              {categories.slice(0, 4).map((category) => (
                <Link key={category} href={`/skelbimai?specialization=${encodeURIComponent(category)}`}>{category}</Link>
              ))}
              <Link href="/skelbimai" className="all-categories">Visos kategorijos</Link>
            </div>
          </div>
        </nav>

        <section className="latest-registry" aria-labelledby="latest-title">
          <div className="registry-container">
            <h2 id="latest-title">Naujausi darbo skelbimai</h2>
            <div className="registry-table" role="list">
              <div className="registry-table-head" aria-hidden="true">
                <span>Paskelbta</span><span>Pareigos ir darbdavys</span><span>Kategorija</span><span>Vieta</span><span>Atlygis</span><span>Etatas</span><span />
              </div>
              {latestJobs.map((job) => (
                <Link href={`/skelbimas/${job.id}`} key={job.id} className="registry-job" role="listitem">
                  <div className="registry-date">{job.postedDaysAgo <= 3 && <strong>Naujas</strong>}<time dateTime={job.postedDate}>{job.postedDate}</time></div>
                  <div className="registry-position"><h3>{job.title}</h3><span>{job.company}</span></div>
                  <div className="registry-category">{job.specialization}</div>
                  <dl className="registry-fact registry-place"><dt>Vieta</dt><dd>{job.location}</dd></dl>
                  <dl className="registry-fact registry-pay"><dt>Atlygis</dt><dd>{job.salary}</dd></dl>
                  <dl className="registry-fact registry-type"><dt>Etatas</dt><dd>{job.type}</dd></dl>
                  <span className="registry-row-action" aria-hidden="true">›</span>
                </Link>
              ))}
            </div>

            <div className="all-jobs-action"><Link href="/skelbimai">Visi darbo skelbimai</Link></div>

            <section className="employer-cta" aria-labelledby="employer-cta-title">
              <div><h2 id="employer-cta-title">Ieškote darbuotojo?</h2><p>Paskelbkite darbo pasiūlymą veterinarijos specialistams.</p></div>
              <Link href="/skelbti" className="btn employer-cta-button">Paskelbti darbo skelbimą</Link>
            </section>
          </div>
        </section>

        <section className="registration-links" aria-label="Registracijos pasirinkimai">
          <div className="registry-container registration-links-inner">
            <Link href="/registracija/kandidatas">Registruotis specialistui <span aria-hidden="true">›</span></Link>
            <Link href="/registracija/darbdavys">Registruotis darbdaviui <span aria-hidden="true">›</span></Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
