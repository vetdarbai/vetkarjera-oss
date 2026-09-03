'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const roleOptions = ['Veterinarijos gydytojas', 'Veterinarijos studentas / praktikantas', 'Veterinarijos asistentas / felčeris', 'Vadybininkas / komercijos specialistas', 'Laboratorijos / diagnostikos specialistas', 'Ūkio / gyvulininkystės specialistas', 'Reguliavimo / kokybės specialistas', 'Administracijos / klientų aptarnavimo specialistas', 'Kita pozicija'];

export default function CreateJobPage() {
  const [role, setRole] = useState('');
  const [done, setDone] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (done) return <><Navigation /><main className="success-page"><div className="success-card"><h1>Skelbimo forma užpildyta</h1><p>Galite grįžti į pagrindinį puslapį arba peržiūrėti darbo skelbimus.</p><div className="success-actions"><Link href="/" className="btn btn-primary">Į pagrindinį</Link><Link href="/skelbimai" className="btn btn-secondary">Peržiūrėti skelbimus</Link></div></div></main><Footer /></>;

  return (
    <><Navigation /><main className="registration-page"><div className="registration-wrap narrow"><form className="registration-card" onSubmit={submit}><div className="form-heading"><span className="eyebrow">Darbdaviams</span><h1>Sukurti darbo pasiūlymą</h1><p>Pateikite aiškią informaciją apie poziciją, darbo sąlygas ir lūkesčius kandidatui.</p></div><div className="form-stack">
      <label className="field"><span>Kokio specialisto ieškote? *</span><select required value={role} onChange={(e) => setRole(e.target.value)}><option value="">Pasirinkite</option>{roleOptions.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="field"><span>Pareigų pavadinimas / patikslinimas *</span><input required placeholder={role.includes('Vadybininkas') ? 'Pvz. Key Account Manager, pirkimų vadybininkas...' : role.includes('Veterinarijos gydytojas') ? 'Pvz. veterinarijos gydytojas chirurgas...' : 'Tiksliai įrašykite pozicijos pavadinimą'} /></label>
      <div className="form-grid two"><label className="field"><span>Miestas / teritorija *</span><input required /></label><label className="field"><span>Darbo tipas *</span><select required defaultValue=""><option value="" disabled>Pasirinkite</option><option>Pilnas etatas</option><option>Dalinis etatas</option><option>Praktika / stažuotė</option><option>Projektinis / laikinas</option><option>Nuotolinis / hibridinis</option></select></label></div>
      <div className="form-grid two"><label className="field"><span>Atlygio intervalas</span><input placeholder="Pvz. 2500–3500 € bruto" /></label><label className="field"><span>Kandidatavimo terminas</span><input type="date" /></label></div>
      <label className="field"><span>Trumpas pasiūlymo aprašymas *</span><textarea rows={4} required placeholder="Kuo ši pozicija įdomi ir kodėl žmogui verta kandidatuoti?" /></label>
      <label className="field"><span>Pagrindinės atsakomybės *</span><textarea rows={5} required placeholder="Po vieną atsakomybę eilutėje..." /></label>
      <label className="field"><span>Ko tikitės iš kandidato *</span><textarea rows={5} required placeholder="Patirtis, kvalifikacija, kompetencijos..." /></label>
      <label className="field"><span>Ką siūlote *</span><textarea rows={5} required placeholder="Atlygis, grafikas, mokymai, mentorystė, priemonės..." /></label>
      <label className="field"><span>Kontaktinis el. paštas *</span><input type="email" required /></label>
      <label className="check-line"><input type="checkbox" required /><span>Patvirtinu, kad pateikta informacija yra teisinga ir darbo pasiūlymas nediskriminuoja kandidatų.</span></label>
      </div><div className="form-actions end"><button className="btn btn-primary" type="submit">Patikrinti skelbimo formą</button></div></form></div></main><Footer /></>
  );
}
