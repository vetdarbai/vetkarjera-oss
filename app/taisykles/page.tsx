import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function TermsPage() {
  return (
    <>
      <Navigation />
      <main className="legal-page"><article className="legal-card"><span className="eyebrow">MVP dokumentas</span><h1>Naudojimosi taisyklės</h1><p>VetKarjera šiuo metu yra vystomas prototipas. Funkcijos, susijusios su paskyromis, duomenų saugojimu, kandidatavimu ir mokėjimais, dar nėra produkcinės.</p><h2>Skelbimų turinys</h2><p>Ateityje darbdaviai bus atsakingi už pateikiamų darbo skelbimų tikslumą, teisėtumą ir nediskriminacinį turinį.</p><h2>Paskyrų naudojimas</h2><p>Vartotojas turės pateikti teisingus duomenis ir saugoti savo prisijungimo informaciją. Tikros paskyros bus aktyvuotos tik prijungus backend autentifikaciją.</p><div className="notice notice-info">Prieš produkcinį paleidimą taisykles būtina teisiškai peržiūrėti ir papildyti.</div></article></main>
      <Footer />
    </>
  );
}
