import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function TermsPage() {
  return (
    <>
      <Navigation />
      <main className="legal-page">
        <article className="legal-card">
          <span className="eyebrow">VetKarjera</span>
          <h1>Naudojimosi taisyklės</h1>
          <p>Naudodamiesi „VetKarjera“ vartotojai turi pateikti teisingą informaciją ir atsakingai naudotis platformos funkcijomis.</p>
          <h2>Skelbimų turinys</h2>
          <p>Darbdaviai atsako už pateikiamų darbo skelbimų tikslumą, teisėtumą ir nediskriminacinį turinį.</p>
          <h2>Paskyrų naudojimas</h2>
          <p>Vartotojas atsako už savo paskyros duomenų tikslumą ir prisijungimo informacijos saugumą.</p>
        </article>
      </main>
      <Footer />
    </>
  );
}
