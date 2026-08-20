import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import './darbdavys.css';

export default function Darbdavys() {
  return (
    <>
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">🏥 Veterinarijos klinikoms ir darbdaviams</div>
          
          <h1>Raskite geriausius veterinarijos specialistus</h1>
          
          <p className="hero-description">
            Skelbkite darbo pasiūlymus nemokamai ir pasiekite  
            veterinarijos gydytojus visoje Lietuvoje.
          </p>

          <button className="btn btn-primary">
            <span>📝</span>
            <span>Skelbti darbo pasiūlymą</span>
          </button>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits">
        <div className="benefits-container">
          <h2 className="section-title">Kodėl pasirinkti VetKarjera?</h2>
          
          <div className="benefits-grid">
            <div className="benefit-card">
              <div className="benefit-icon">🎯</div>
              <h3 className="benefit-title">Tikslinė auditorija</h3>
              <p className="benefit-description">
                Jūsų skelbimus mato tik veterinarijos specialistai – niekas kito. 
                Taupomos laiką ir gaunate kokybiškas aplikacijas.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">💰</div>
              <h3 className="benefit-title">Nemokamai pradėti</h3>
              <p className="benefit-description">
                Skelbkite darbo pasiūlymus nemokamai. Mokėkite tik už papildomas 
                funkcijas, jei jų reikia.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">⚡</div>
              <h3 className="benefit-title">Greitas rezultatas</h3>
              <p className="benefit-description">
                Skelbimas publikuojamas iš karto. Pirmąsias aplikacijas gaukite 
                jau per 24 valandas.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">📊</div>
              <h3 className="benefit-title">Paprasta valdyti</h3>
              <p className="benefit-description">
                Patogi darbdavio panelė leidžia valdyti visus skelbimus ir aplikacijas 
                vienoje vietoje.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">🤖</div>
              <h3 className="benefit-title">AI pagalba (netrukus)</h3>
              <p className="benefit-description">
                Dirbtinis intelektas padės sukurti patrauklų skelbimą ir surasti 
                tinkamiausius kandidatus.
              </p>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon">🔒</div>
              <h3 className="benefit-title">Saugumas ir privatumas</h3>
              <p className="benefit-description">
                Visi duomenys saugomi pagal GDPR reikalavimus. Jūsų informacija – 
                saugi ir konfidenciali.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}