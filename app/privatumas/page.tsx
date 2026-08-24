import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Navigation />
      <main className="legal-page"><article className="legal-card"><span className="eyebrow">MVP dokumentas</span><h1>Privatumo informacija</h1><p><strong>Ši versija yra techninis prototipas.</strong> Registracijos formose įvesti duomenys šiuo metu nėra siunčiami į serverį ir nėra išsaugomi.</p><h2>Prieš viešą paleidimą</h2><p>Prijungus backend turės būti apibrėžti duomenų valdytojas, tvarkymo tikslai, teisiniai pagrindai, saugojimo terminai, duomenų gavėjai, vartotojų teisės, slapukai ir saugumo priemonės.</p><h2>Duomenų kiekio mažinimas</h2><p>VetKarjera turėtų rinkti tik informaciją, reikalingą paskyrai, darbo paieškai, kandidatavimui ir darbdavio funkcijoms. Jautrūs ar pertekliniai duomenys neturėtų būti renkami be būtinybės.</p><div className="notice notice-info">Prieš produkcinį paleidimą šį tekstą turi peržiūrėti teisininkas arba BDAR specialistas.</div></article></main>
      <Footer />
    </>
  );
}
