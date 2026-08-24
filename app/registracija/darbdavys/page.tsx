'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProgressBar from '@/components/ProgressBar';
import {
  initialEmployerRegistration,
  EmployerOrgType,
  EmployerRegistration,
} from '@/types/registration';
import {
  animalTypeOptions,
  clinicTypeOptions,
  farmAnimalOptions,
  farmSizeOptions,
  orgTypeOptions,
  teamSizeOptions,
  territoryOptions,
  wholesaleActivityOptions,
  wholesalePositionOptions,
} from '@/data/orgTypes';

export default function EmployerRegistrationPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<EmployerRegistration>(initialEmployerRegistration);
  const [done, setDone] = useState(false);
  const selectedOrg = useMemo(() => orgTypeOptions.find((item) => item.id === form.orgType), [form.orgType]);

  const setField = <K extends keyof EmployerRegistration>(field: K, value: EmployerRegistration[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setAdditional = (field: string, value: string | boolean | string[]) => {
    setForm((current) => ({
      ...current,
      additionalData: { ...current.additionalData, [field]: value },
    }));
  };

  const toggleAdditionalArray = (field: 'animalTypes' | 'mainActivity' | 'typicalPositions' | 'animalSpecies', value: string) => {
    const current = (form.additionalData[field] || []) as string[];
    setAdditional(field, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  };

  const selectOrg = (orgType: EmployerOrgType) => {
    setForm((current) => ({ ...current, orgType, additionalData: {} }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      alert('Slaptažodžiai nesutampa.');
      return;
    }
    if (!form.agreedToTerms) {
      alert('Patvirtinkite, kad sutinkate su taisyklėmis ir privatumo informacija.');
      return;
    }
    setDone(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (done) {
    return (
      <>
        <Navigation />
        <main className="success-page">
          <div className="success-card">
            <div className="success-mark">✓</div>
            <span className="eyebrow">Darbdavio registracija</span>
            <h1>Forma paruošta</h1>
            <p>Organizacijos registracijos srautas veikia. Šiame frontend etape duomenys nėra išsaugomi.</p>
            <div className="notice notice-warning"><strong>Kitas techninis etapas – backend.</strong><span>Reikės autentifikacijos ir duomenų bazės, kad ši registracija sukurtų tikrą paskyrą.</span></div>
            <div className="success-actions"><Link href="/" className="btn btn-primary">Į pagrindinį</Link><Link href="/skelbti" className="btn btn-secondary">Peržiūrėti skelbimo formą</Link></div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navigation />
      <main className="registration-page">
        <div className="registration-wrap">
          <ProgressBar currentStep={step} totalSteps={3} />

          {step === 1 && (
            <section className="registration-card">
              <div className="form-heading"><span className="eyebrow">Darbdavio registracija</span><h1>Kokia jūsų organizacija?</h1><p>Pasirinkimas padės parodyti tik jūsų veiklai aktualius klausimus.</p></div>
              <div className="choice-grid">
                {orgTypeOptions.map((option) => (
                  <button key={option.id} type="button" className={`choice-card ${form.orgType === option.id ? 'selected' : ''}`} onClick={() => selectOrg(option.id)}>
                    <span className="choice-icon">{option.icon}</span><strong>{option.label}</strong><small>{option.description}</small>
                  </button>
                ))}
              </div>
              <div className="form-actions end"><button className="btn btn-primary" type="button" disabled={!form.orgType} onClick={() => setStep(2)}>Tęsti →</button></div>
            </section>
          )}

          {step === 2 && (
            <section className="registration-card">
              <div className="form-heading"><span className="eyebrow">{selectedOrg?.icon} {selectedOrg?.label}</span><h1>Apie organizaciją</h1><p>Ši informacija vėliau galės būti naudojama organizacijos profiliui ir tikslesniam matching.</p></div>
              <div className="form-stack">
                <div className="form-grid two"><label className="field"><span>Organizacijos pavadinimas *</span><input required value={form.orgName} onChange={(e) => setField('orgName', e.target.value)} /></label><label className="field"><span>Miestas / vietovė *</span><input required value={form.city} onChange={(e) => setField('city', e.target.value)} /></label></div>
                <div className="form-grid two"><label className="field"><span>Interneto svetainė</span><input type="url" placeholder="https://" value={form.website} onChange={(e) => setField('website', e.target.value)} /></label><label className="field"><span>Komandos dydis *</span><select required value={form.teamSize} onChange={(e) => setField('teamSize', e.target.value)}><option value="">Pasirinkite</option>{teamSizeOptions.map((item) => <option key={item}>{item}</option>)}</select></label></div>
                <label className="field"><span>Trumpai apie organizaciją *</span><textarea rows={4} required value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Kuo užsiimate, kuo išsiskiriate, kokia jūsų komanda?" /></label>

                {form.orgType === 'clinic' && <div className="dynamic-box"><h2>Klinikos profilis</h2><ChoiceCheckboxes label="Su kokiais gyvūnais dirbate?" values={animalTypeOptions} selected={form.additionalData.animalTypes || []} onToggle={(value) => toggleAdditionalArray('animalTypes', value)} /><label className="field"><span>Klinikos tipas</span><select value={form.additionalData.clinicType || ''} onChange={(e) => setAdditional('clinicType', e.target.value)}><option value="">Pasirinkite</option>{clinicTypeOptions.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Kiek veterinarijos gydytojų dirba komandoje?</span><input type="number" min="0" value={form.additionalData.vetCount || ''} onChange={(e) => setAdditional('vetCount', e.target.value)} /></label><div className="toggle-grid"><Check label="Priimame studentus praktikai" checked={Boolean(form.additionalData.acceptsInterns)} onChange={(value) => setAdditional('acceptsInterns', value)} /><Check label="Turime kelias klinikas / padalinius" checked={Boolean(form.additionalData.hasMultipleLocations)} onChange={(value) => setAdditional('hasMultipleLocations', value)} /></div></div>}

                {form.orgType === 'wholesale' && <div className="dynamic-box"><h2>Didmenos / distributoriaus profilis</h2><ChoiceCheckboxes label="Pagrindinė veiklos sritis" values={wholesaleActivityOptions} selected={form.additionalData.mainActivity || []} onToggle={(value) => toggleAdditionalArray('mainActivity', value)} /><label className="field"><span>Veiklos teritorija</span><select value={form.additionalData.operatingTerritory || ''} onChange={(e) => setAdditional('operatingTerritory', e.target.value)}><option value="">Pasirinkite</option>{territoryOptions.map((item) => <option key={item}>{item}</option>)}</select></label><ChoiceCheckboxes label="Kokius specialistus dažniausiai samdote?" values={wholesalePositionOptions} selected={form.additionalData.typicalPositions || []} onToggle={(value) => toggleAdditionalArray('typicalPositions', value)} /></div>}

                {form.orgType === 'pharma' && <div className="dynamic-box"><h2>Farmacinės įmonės profilis</h2><label className="field"><span>Veiklos sritis / produktų kategorijos</span><textarea rows={3} value={form.additionalData.activityArea || ''} onChange={(e) => setAdditional('activityArea', e.target.value)} /></label><label className="field"><span>Darbo teritorija</span><input placeholder="Pvz. Lietuva, Baltijos šalys" value={form.additionalData.workTerritory || ''} onChange={(e) => setAdditional('workTerritory', e.target.value)} /></label><div className="toggle-grid"><Check label="Pozicijos susijusios su pardavimais" checked={Boolean(form.additionalData.salesRelated)} onChange={(value) => setAdditional('salesRelated', value)} /><Check label="Samdome techninius veterinarijos specialistus" checked={Boolean(form.additionalData.hiresVetSpecialists)} onChange={(value) => setAdditional('hiresVetSpecialists', value)} /></div></div>}

                {form.orgType === 'farm' && <div className="dynamic-box"><h2>Ūkio / gyvulininkystės profilis</h2><ChoiceCheckboxes label="Gyvūnų rūšys" values={farmAnimalOptions} selected={form.additionalData.animalSpecies || []} onToggle={(value) => toggleAdditionalArray('animalSpecies', value)} /><label className="field"><span>Ūkio dydis</span><select value={form.additionalData.farmSize || ''} onChange={(e) => setAdditional('farmSize', e.target.value)}><option value="">Pasirinkite</option>{farmSizeOptions.map((item) => <option key={item}>{item}</option>)}</select></label><div className="toggle-grid"><Check label="Turime nuolatinį veterinarijos gydytoją" checked={Boolean(form.additionalData.hasPermanentVet)} onChange={(value) => setAdditional('hasPermanentVet', value)} /><Check label="Priimame studentus praktikai" checked={Boolean(form.additionalData.acceptsStudents)} onChange={(value) => setAdditional('acceptsStudents', value)} /></div></div>}

                {form.orgType === 'government' && <div className="dynamic-box"><h2>Institucijos profilis</h2><div className="form-grid two"><label className="field"><span>Padalinio pavadinimas</span><input value={form.additionalData.institutionName || ''} onChange={(e) => setAdditional('institutionName', e.target.value)} /></label><label className="field"><span>Regionas</span><input value={form.additionalData.region || ''} onChange={(e) => setAdditional('region', e.target.value)} /></label></div><label className="field"><span>Kokius specialistus dažniausiai samdote?</span><textarea rows={3} value={form.additionalData.specialistTypes || ''} onChange={(e) => setAdditional('specialistTypes', e.target.value)} /></label><Check label="Siūlome praktikos / stažuočių vietas" checked={Boolean(form.additionalData.offersInternships)} onChange={(value) => setAdditional('offersInternships', value)} /></div>}

                {['pharmacy','university','laboratory','shelter','production','other'].includes(form.orgType) && <div className="dynamic-box"><h2>Papildoma informacija</h2><label className="field"><span>Trumpai apibūdinkite veiklos sritį</span><textarea rows={4} value={form.additionalData.activityDescription || ''} onChange={(e) => setAdditional('activityDescription', e.target.value)} placeholder="Ką veikia organizacija ir kokių žmonių dažniausiai ieškote?" /></label></div>}
              </div>
              <div className="form-actions"><button className="btn btn-secondary" type="button" onClick={() => setStep(1)}>← Atgal</button><button className="btn btn-primary" type="button" disabled={!form.orgName || !form.city || !form.description || !form.teamSize} onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Tęsti →</button></div>
            </section>
          )}

          {step === 3 && (
            <form className="registration-card" onSubmit={submit}>
              <div className="form-heading"><span className="eyebrow">Paskutinis žingsnis</span><h1>Kontaktinis asmuo ir paskyra</h1><p>Prisijungimo duomenys kol kas nėra siunčiami į serverį.</p></div>
              <div className="form-stack">
                <div className="form-grid two"><label className="field"><span>Vardas *</span><input required value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} /></label><label className="field"><span>Pavardė *</span><input required value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} /></label></div>
                <div className="form-grid two"><label className="field"><span>Pareigos *</span><input required value={form.position} onChange={(e) => setField('position', e.target.value)} placeholder="Pvz. klinikos vadovas" /></label><label className="field"><span>Telefonas</span><input type="tel" value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></label></div>
                <label className="field"><span>El. paštas *</span><input type="email" required value={form.email} onChange={(e) => setField('email', e.target.value)} /></label>
                <div className="form-grid two"><label className="field"><span>Slaptažodis *</span><input type="password" minLength={8} required value={form.password} onChange={(e) => setField('password', e.target.value)} /><small>Mažiausiai 8 simboliai.</small></label><label className="field"><span>Pakartoti slaptažodį *</span><input type="password" minLength={8} required value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} /></label></div>
                <label className="check-line"><input type="checkbox" required checked={form.agreedToTerms} onChange={(e) => setField('agreedToTerms', e.target.checked)} /><span>Sutinku su <Link href="/taisykles">naudojimosi taisyklėmis</Link> ir <Link href="/privatumas">privatumo informacija</Link>.</span></label>
              </div>
              <div className="form-actions"><button className="btn btn-secondary" type="button" onClick={() => setStep(2)}>← Atgal</button><button className="btn btn-primary" type="submit">Užbaigti registracijos formą</button></div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function ChoiceCheckboxes({ label, values, selected, onToggle }: { label: string; values: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return <div className="field"><span>{label}</span><div className="chip-grid">{values.map((value) => <label className={`select-chip ${selected.includes(value) ? 'selected' : ''}`} key={value}><input type="checkbox" checked={selected.includes(value)} onChange={() => onToggle(value)} /><span>{value}</span></label>)}</div></div>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="check-line compact"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>;
}
