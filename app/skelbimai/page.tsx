import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { jobs } from '@/data/jobs';
import './skelbimai.css';

export default function Skelbimai() {
  return (
    <>
      <Navigation />
      
      <div className="container">
        {/* Page Header */}
        <div className="page-header">
          <h1 className="page-title">Darbo skelbimai</h1>
          <p className="page-subtitle">Rask tobulai tinkantį darbą veterinarijos srityje</p>
        </div>

        {/* Search & Filters */}
        <div className="search-section">
          <div className="search-bar">
            <input 
              type="text" 
              className="search-input" 
              placeholder="Ieškoti pagal pareigų pavadinimą ar raktažodį..."
            />
            <button className="search-btn">🔍 Ieškoti</button>
          </div>

          <div className="filters">
            <div className="filter-group">
              <label className="filter-label">Lokacija</label>
              <select className="filter-select">
                <option value="">Visos lokacijos</option>
                <option value="vilnius">Vilnius</option>
                <option value="kaunas">Kaunas</option>
                <option value="klaipeda">Klaipėda</option>
                <option value="siauliai">Šiauliai</option>
                <option value="panevezys">Panevėžys</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Specializacija</label>
              <select className="filter-select">
                <option value="">Visos specializacijos</option>
                <option value="bendroji">Bendroji praktika</option>
                <option value="chirurgija">Chirurgija</option>
                <option value="egzotiniai">Egzotiniai gyvūnai</option>
                <option value="odontologija">Odontologija</option>
                <option value="oftalmologija">Oftalmologija</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label">Darbo tipas</label>
              <select className="filter-select">
                <option value="">Visi tipai</option>
                <option value="pilna">Pilnas etatas</option>
                <option value="dalinis">Dalinis etatas</option>
                <option value="laikinas">Laikinas</option>
                <option value="praktika">Praktika</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Header */}
        <div className="results-header">
          <p className="results-count">Rasta <strong>{jobs.length} skelbimai</strong></p>
          <select className="sort-select">
            <option value="newest">Naujausi</option>
            <option value="oldest">Seniausi</option>
            <option value="salary-high">Atlyginimas (didėjimo tvarka)</option>
            <option value="salary-low">Atlyginimas (mažėjimo tvarka)</option>
          </select>
        </div>

        {/* Job Listings */}
        <div className="jobs-grid">
          {jobs.map((job) => (
            <Link href={`/skelbimas/${job.id}`} key={job.id} className="job-card">
              <div className="job-header">
                <div>
                  <h2 className="job-title">{job.title}</h2>
                  <p className="job-company">🏥 {job.company}</p>
                </div>
                <span className="job-badge">{job.type}</span>
              </div>
              <div className="job-meta">
                <span className="job-meta-item">📍 {job.location}</span>
                <span className="job-meta-item">💰 {job.salary}</span>
                <span className="job-meta-item">🕐 Paskelbta prieš {job.postedDaysAgo} {job.postedDaysAgo === 1 ? 'dieną' : 'dienas'}</span>
              </div>
              <p className="job-description">
                {job.description}
              </p>
              <div className="job-tags">
                {job.tags.map((tag, index) => (
                  <span key={index} className="job-tag">{tag}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </>
  );
}
