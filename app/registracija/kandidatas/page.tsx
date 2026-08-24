'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProgressBar from '@/components/ProgressBar';
import { candidateRoleOptions, employmentTypeOptions } from '@/data/candidateRoles';
import { CandidateRegistration, CandidateRoleType, initialCandidateRegistration } from '@/types/registration';

export default function CandidateRegistrationPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CandidateRegistration>(initialCandidateRegistration);
  const [done, setDone] = useState(false);
  const selectedRole = useMemo(() => candidateRoleOptions.find((item) => item.id === form.roleType), [form.roleType]);

  const setField = <K extends keyof CandidateRegistration>(field: K, value: CandidateRegistration[K]) => setForm((current) => ({ ...current, [field]: value }));
  const selectRole = (roleType: CandidateRoleType) => setForm((current) => ({ ...current, roleType, roleDetail: '', skills: '' }));
  const toggleEmployment = (value: string) => setField('employmentTypes', form.employmentTypes.includes(value) ? form.employmentTypes.filter((item) => item !== value) : [...form.employmentTypes, value]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert('Slaptažodžiai nesutampa.');
      return;
    }
    if (!form.agreedToTerms) {
      alert('Patvirtinkite taisykles ir privatumo informaciją.');
      return;
    }
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (done) {
    return (
      <>
        <Navigation />
        <main className="success-page"><div className="success-card"><div className="success-mark">✓</div><span className="eyebrow">Specialisto registracija</span><h1>Profilio forma paruošta</h1><p>Visas specialisto registracijos srautas veikia, tačiau šiame frontend etape duomenys nėra išsaugomi.</p><div className="notice notice-warning"><strong>Kitas etapas – backend.</strong><span>Prijungus autentifikaciją ir duomenų bazę šie duomenys galės sukurti tikrą profilį ir būti naudojami matching.</span></div><div className="success-actions"><Link href="/skelbimai" className="btn btn-primary">Peržiūrėti darbus</Link><Link href="/" className="btn btn-secondary">Į pagrindinį</Link></div></div></main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="registration-page"><div className="registration-wrap">
        <ProgressBar currentStep={step} totalSteps={3} />

        {step === 1 && <section className="registration-card"><div className="form-heading"><span className="eyebrow">Specialisto registracija</span><h1>Kokia jūsų profesinė kryptis?</h1><p>Pasirinkite artimiausią variantą. Kitame žingsnyje galėsite tiksliai parašyti, kokio darbo ar praktikos ieškote.</p></div><div className="choice-grid">{candidateRoleOptions.map((option) => <button key={option.id} type="button" className={`choice-card ${form.roleType === option.id ? 'selected' : ''}`} onClick={() => selectRole(option.id)}><span className="choice-icon">{option.icon}</span><strong>{option.label}</strong><small>{option.description}</small></button>)}</div><div className="form-actions end"><button className="btn btn-primary" disabled={!form.roleType} onClick={() => setStep(2)}>Tęsti →</button></div></section>}

        {step === 2 && <section className="registration-card"><div className="form-heading"><span className="eyebrow">{selectedRole?.icon} {selectedRole?.label}</span><h1>Jūsų profesinis profilis</h1><p>Šie laukai vėliau leis tiksliau suderinti jus su darbo pasiūlymais.</p></div><div className="form-stack">
          <label className="field"><span>{selectedRole?.detailLabel || 'Kokio darbo ieškote?'} *</span><input required value={form.roleDetail} onChange={(e) => setField('roleDetail', e.target.value)} placeholder={selectedRole?.detailPlaceholder} /><small>Šį lauką paliekame laisvą, kad galėtumėte tiksliai įvardinti savo kryptį.</small></label>
          <div className="form-grid two"><label className="field"><span>{form.roleType === 'student' ? 'Studijų kursas / etapas' : 'Patirtis'}</span><select value={form.experienceYears} onChange={(e) => setField('experienceYears', e.target.value)}><option value="">Pasirinkite</option>{form.roleType === 'student' ? <><option>1–2 kursas</option><option>3–4 kursas</option><option>5–6 kursas</option><option>Absolventas</option></> : <><option>Be patirties</option><option>Iki 1 metų</option><option>1–3 metai</option><option>3–5 metai</option><option>5–10 metų</option><option>10+ metų</option></>}</select></label><label className="field"><span>Išsilavinimas / kvalifikacija</span><input value={form.education} onChange={(e) => setField('education', e.target.value)} placeholder={form.roleType === 'student' ? 'Pvz. LSMU Veterinarinė medicina, 4 kursas' : 'Pvz. veterinarijos gydytojo magistras'} /></label></div>
          <div className="form-grid two"><label className="field"><span>Dabartinis miestas</span><input value={form.city} onChange={(e) => setField('city', e.target.value)} /></label><label className="field"><span>Kur norėtumėte dirbti?</span><input value={form.preferredLocations} onChange={(e) => setField('preferredLocations', e.target.value)} placeholder="Pvz. Kaunas, Vilnius, visa Lietuva, nuotoliu" /></label></div>
          <div className="field"><span>Dominantis darbo tipas</span><div className="chip-grid">{employmentTypeOptions.map((value) => <label className={`select-chip ${form.employmentTypes.includes(value) ? 'selected' : ''}`} key={value}><input type="checkbox" checked={form.employmentTypes.includes(value)} onChange={() => toggleEmployment(value)} /><span>{value}</span></label>)}</div></div>
          <div className="form-grid two"><label className="field"><span>Atlygio lūkestis</span><input value={form.salaryExpectation} onChange={(e) => setField('salaryExpectation', e.target.value)} placeholder="Pvz. nuo 2500 € bruto" /></label><label className="field"><span>Kada galėtumėte pradėti?</span><input value={form.availability} onChange={(e) => setField('availability', e.target.value)} placeholder="Pvz. iš karto, po 1 mėn., vasarą" /></label></div>
          <label className="field"><span>Pagrindiniai įgūdžiai, patirtis ar stiprybės</span><textarea rows={4} value={form.skills} onChange={(e) => setField('skills', e.target.value)} placeholder={skillsPlaceholder(form.roleType)} /></label>
          <label className="field"><span>Kalbos</span><input value={form.languages} onChange={(e) => setField('languages', e.target.value)} placeholder="Pvz. lietuvių, anglų B2, rusų" /></label>
          <div className="toggle-grid"><label className="check-line compact"><input type="checkbox" checked={form.drivingLicense} onChange={(e) => setField('drivingLicense', e.target.checked)} /><span>Turiu B kategorijos vairuotojo pažymėjimą</span></label><label className="check-line compact"><input type="checkbox" checked={form.openToTravel} onChange={(e) => setField('openToTravel', e.target.checked)} /><span>Galiu keliauti darbo reikalais</span></label></div>
        </div><div className="form-actions"><button className="btn btn-secondary" onClick={() => setStep(1)}>← Atgal</button><button className="btn btn-primary" disabled={!form.roleDetail} onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Tęsti →</button></div></section>}

        {step === 3 && <form className="registration-card" onSubmit={submit}><div className="form-heading"><span className="eyebrow">Paskutinis žingsnis</span><h1>Kontaktai ir profilio privatumas</h1><p>Veterinarijos rinka maža, todėl privatumo pasirinkimą įtraukiame jau registracijoje.</p></div><div className="form-stack">
          <div className="form-grid two"><label className="field"><span>Vardas *</span><input required value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} /></label><label className="field"><span>Pavardė *</span><input required value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} /></label></div>
          <div className="form-grid two"><label className="field"><span>El. paštas *</span><input type="email" required value={form.email} onChange={(e) => setField('email', e.target.value)} /></label><label className="field"><span>Telefonas</span><input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></label></div>
          <div className="form-grid two"><label className="field"><span>Slaptažodis *</span><input type="password" minLength={8} required value={form.password} onChange={(e) => setField('password', e.target.value)} /><small>Mažiausiai 8 simboliai.</small></label><label className="field"><span>Pakartoti slaptažodį *</span><input type="password" minLength={8} required value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} /></label></div>
          <fieldset className="privacy-fieldset"><legend>Kaip norite būti matomas darbdaviams?</legend><label className={`privacy-option ${form.privacyMode === 'active' ? 'selected' : ''}`}><input type="radio" name="privacy" checked={form.privacyMode === 'active'} onChange={() => setField('privacyMode', 'active')} /><div><strong>Aktyviai ieškau darbo</strong><span>Profilis gali būti rodomas tinkamiems darbdaviams.</span></div></label><label className={`privacy-option ${form.privacyMode === 'open' ? 'selected' : ''}`}><input type="radio" name="privacy" checked={form.privacyMode === 'open'} onChange={() => setField('privacyMode', 'open')} /><div><strong>Atviras geriems pasiūlymams</strong><span>Noriu gauti rekomendacijas, nors aktyviai neieškau.</span></div></label><label className={`privacy-option ${form.privacyMode === 'private' ? 'selected' : ''}`}><input type="radio" name="privacy" checked={form.privacyMode === 'private'} onChange={() => setField('privacyMode', 'private')} /><div><strong>Privatus profilis</strong><span>Profilio nerodyti viešai; ateityje tik siųsti man atitinkančius pasiūlymus.</span></div></label></fieldset>
          <label className="check-line"><input type="checkbox" required checked={form.agreedToTerms} onChange={(e) => setField('agreedToTerms', e.target.checked)} /><span>Sutinku su <Link href="/taisykles">naudojimosi taisyklėmis</Link> ir <Link href="/privatumas">privatumo informacija</Link>.</span></label>
        </div><div className="form-actions"><button className="btn btn-secondary" type="button" onClick={() => setStep(2)}>← Atgal</button><button className="btn btn-primary" type="submit">Užbaigti profilio formą</button></div></form>}
      </div></main>
      <Footer />
    </>
  );
}

function skillsPlaceholder(role: CandidateRoleType | '') {
  switch (role) {
    case 'veterinarian': return 'Pvz. minkštųjų audinių chirurgija, echoskopija, odontologija, galvijų reprodukcija...';
    case 'manager': return 'Pvz. B2B pardavimai, KAM, CRM, derybos, produkto paleidimai, tenderiai...';
    case 'student': return 'Pvz. atliktos praktikos, laboratoriniai įgūdžiai, savanorystė, dominančios klinikinės sritys...';
    case 'laboratory': return 'Pvz. mikrobiologija, PGR, hematologija, kokybės sistemos...';
    default: return 'Įrašykite svarbiausius įgūdžius ir patirtį, kurie padėtų darbdaviui suprasti jūsų stiprybes.';
  }
}
