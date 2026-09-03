import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Navigation />
      <main className="legal-page">
        <article className="legal-card">
          <span className="eyebrow">VetKarjera</span>
          <h1>Privatumo informacija</h1>
          <p>„VetKarjera“ siekia rinkti tik informaciją, reikalingą paskyrai, darbo paieškai, kandidatavimui ir darbdavio funkcijoms.</p>
          <h2>Duomenų kiekio mažinimas</h2>
          <p>Jautrūs ar pertekliniai duomenys neturėtų būti renkami be būtinybės. Veterinarijos praktikos licencijos numeris skirtas tik paskyrai patikrinti ir nėra rodomas darbdaviams, kandidatams ar viešiems lankytojams.</p>
          <h2>Duomenų saugumas</h2>
          <p>Asmens ir profesinė informacija turi būti tvarkoma tik aiškiai apibrėžtais platformos naudojimo tikslais.</p>
        </article>
      </main>
      <Footer />
    </>
  );
}
