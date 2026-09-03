'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import ProgressBar from '@/components/ProgressBar';
import { candidateRoleOptions, employmentTypeOptions } from '@/data/candidateRoles';
import { candidateQuestionnaire, experienceOptions, licensedCandidateRoles } from '@/data/candidateQuestions';
import { CandidateRegistration, CandidateRoleType, initialCandidateRegistration } from '@/types/registration';

export default function CandidateQuestionnaire() {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<CandidateRegistration>(initialCandidateRegistration);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const selectedRole = useMemo(() => candidateRoleOptions.find((option) => option.id === form.roleType), [form.roleType]);
  const requiresLicense = form.roleType !== '' && licensedCandidateRoles.includes(form.roleType);
  const questions = candidateQuestionnaire.questions;

  const setField = <K extends keyof CandidateRegistration>(field: K, value: CandidateRegistration[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const selectRole = (roleType: CandidateRoleType) => {
    setForm((current) => ({ ...current, roleType, roleDetail: '', experienceYears: '', skills: '' }));
  };

  const toggleEmployment = (value: string) => {
    setField('employmentTypes', form.employmentTypes.includes(value)
      ? form.employmentTypes.filter((item) => item !== value)
      : [...form.employmentTypes, value]);
  };

  const goToStep = (nextStep: number) => {
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const continueFromProfile = () => {
    if (requiresLicense && licenseInputRef.current && !licenseInputRef.current.checkValidity()) {
      licenseInputRef.current.reportValidity();
      return;
    }
    goToStep(3);
  };

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
      <section className="questionnaire-complete">
        <span className="section-kicker">Specialisto registracija</span>
        <h1>Registracijos forma užpildyta</h1>
        <p>Galite tęsti darbo pasiūlymų peržiūrą.</p>
        <div className="questionnaire-complete-actions">
          <Link href="/skelbimai" className="btn btn-primary">Peržiūrėti darbo skelbimus</Link>
          <Link href="/" className="btn btn-secondary">Į pagrindinį</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="questionnaire-shell">
      <header className="questionnaire-intro">
        <span className="section-kicker">{candidateQuestionnaire.intro.kicker}</span>
        <div className="questionnaire-intro-grid">
          <h1>Specialisto registracija</h1>
          <p>{candidateQuestionnaire.intro.description}</p>
        </div>
      </header>

      <div className="questionnaire-workspace">
        <aside className="questionnaire-sidebar">
          <ProgressBar currentStep={step} totalSteps={3} />
          <ol>
            <li className={step === 1 ? 'current' : step > 1 ? 'complete' : ''}><span>1</span><div><strong>Profesinė kryptis</strong><small>Pasirinkite artimiausią rolę</small></div></li>
            <li className={step === 2 ? 'current' : step > 2 ? 'complete' : ''}><span>2</span><div><strong>Profesinis profilis</strong><small>Patirtis ir darbo lūkesčiai</small></div></li>
            <li className={step === 3 ? 'current' : ''}><span>3</span><div><strong>Kontaktai ir privatumas</strong><small>Paskyros informacija</small></div></li>
          </ol>
        </aside>

        {step === 1 && (
          <section className="questionnaire-card" aria-labelledby="role-step-title">
            <div className="questionnaire-heading">
              <span>1 žingsnis iš 3</span>
              <h2 id="role-step-title">{candidateQuestionnaire.role.title}</h2>
              <p>{candidateQuestionnaire.role.description}</p>
            </div>
            <div className="role-options">
              {candidateRoleOptions.map((option) => (
                <button key={option.id} type="button" className={`role-option ${form.roleType === option.id ? 'selected' : ''}`} onClick={() => selectRole(option.id)} aria-pressed={form.roleType === option.id}>
                  <div><strong>{option.label}</strong><small>{option.description}</small></div>
                </button>
              ))}
            </div>
            <div className="questionnaire-actions questionnaire-actions-end">
              <button type="button" className="btn btn-primary" disabled={!form.roleType} onClick={() => goToStep(2)}>Tęsti</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="questionnaire-card" aria-labelledby="profile-step-title">
            <div className="questionnaire-heading">
              <span>2 žingsnis iš 3</span>
              <h2 id="profile-step-title">{candidateQuestionnaire.profile.title}</h2>
              <p>{candidateQuestionnaire.profile.description}</p>
            </div>

            <div className="questionnaire-fields">
              <div className="selected-role-line"><span>Pasirinkta kryptis</span><strong>{selectedRole?.label}</strong></div>

              <label className="field">
                <span>{selectedRole?.detailLabel || questions.roleDetail.label} *</span>
                <input required value={form.roleDetail} onChange={(event) => setField('roleDetail', event.target.value)} placeholder={selectedRole?.detailPlaceholder} />
                <small>{questions.roleDetail.help}</small>
              </label>

              {requiresLicense && (
                <div className="license-fieldset">
                  <div className="license-privacy-note"><div><strong>{candidateQuestionnaire.license.privacyTitle}</strong><p>{candidateQuestionnaire.license.privacyText}</p></div></div>
                  <label className="field" htmlFor={candidateQuestionnaire.license.id}>
                    <span>{candidateQuestionnaire.license.label} *</span>
                    <input ref={licenseInputRef} id={candidateQuestionnaire.license.id} type="text" required pattern=".*\S.*" autoComplete="off" aria-describedby="license-help" onInvalid={(event) => event.currentTarget.setCustomValidity(candidateQuestionnaire.license.requiredMessage)} onInput={(event) => event.currentTarget.setCustomValidity('')} />
                    <small id="license-help">{candidateQuestionnaire.license.help}</small>
                  </label>
                </div>
              )}

              <div className="form-grid two">
                <label className="field"><span>{form.roleType === 'student' ? 'Studijų kursas / etapas' : questions.experience.label}</span><select value={form.experienceYears} onChange={(event) => setField('experienceYears', event.target.value)}><option value="">Pasirinkite</option>{(form.roleType === 'student' ? experienceOptions.student : experienceOptions.professional).map((value) => <option key={value}>{value}</option>)}</select></label>
                <label className="field"><span>{questions.education.label}</span><input value={form.education} onChange={(event) => setField('education', event.target.value)} placeholder={form.roleType === 'student' ? 'Pvz. Veterinarinė medicina, 4 kursas' : 'Pvz. veterinarijos gydytojo magistras'} /></label>
              </div>

              <div className="form-grid two">
                <label className="field"><span>{questions.city.label}</span><input value={form.city} onChange={(event) => setField('city', event.target.value)} /></label>
                <label className="field"><span>{questions.preferredLocations.label}</span><input value={form.preferredLocations} onChange={(event) => setField('preferredLocations', event.target.value)} placeholder={questions.preferredLocations.placeholder} /></label>
              </div>

              <div className="field"><span>{questions.employmentTypes.label}</span><div className="chip-grid">{employmentTypeOptions.map((value) => <label className={`select-chip ${form.employmentTypes.includes(value) ? 'selected' : ''}`} key={value}><input type="checkbox" checked={form.employmentTypes.includes(value)} onChange={() => toggleEmployment(value)} /><span>{value}</span></label>)}</div></div>

              <div className="form-grid two">
                <label className="field"><span>{questions.salaryExpectation.label}</span><input value={form.salaryExpectation} onChange={(event) => setField('salaryExpectation', event.target.value)} placeholder={questions.salaryExpectation.placeholder} /></label>
                <label className="field"><span>{questions.availability.label}</span><input value={form.availability} onChange={(event) => setField('availability', event.target.value)} placeholder={questions.availability.placeholder} /></label>
              </div>

              <label className="field"><span>{questions.skills.label}</span><textarea rows={5} value={form.skills} onChange={(event) => setField('skills', event.target.value)} placeholder={selectedRole?.detailPlaceholder} /></label>
              <label className="field"><span>{questions.languages.label}</span><input value={form.languages} onChange={(event) => setField('languages', event.target.value)} placeholder={questions.languages.placeholder} /></label>
              <div className="toggle-grid">
                <label className="check-line compact"><input type="checkbox" checked={form.drivingLicense} onChange={(event) => setField('drivingLicense', event.target.checked)} /><span>{questions.drivingLicense.label}</span></label>
                <label className="check-line compact"><input type="checkbox" checked={form.openToTravel} onChange={(event) => setField('openToTravel', event.target.checked)} /><span>{questions.openToTravel.label}</span></label>
              </div>
            </div>

            <div className="questionnaire-actions">
              <button type="button" className="btn btn-secondary" onClick={() => goToStep(1)}>Atgal</button>
              <button type="button" className="btn btn-primary" disabled={!form.roleDetail} onClick={continueFromProfile}>Tęsti</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <form className="questionnaire-card" onSubmit={submit}>
            <div className="questionnaire-heading">
              <span>3 žingsnis iš 3</span>
              <h2>Kontaktai ir profilio privatumas</h2>
              <p>Nurodykite paskyros kontaktus ir pasirinkite profilio matomumą.</p>
            </div>
            <div className="questionnaire-fields">
              <div className="form-grid two">
                <label className="field"><span>Vardas *</span><input required value={form.firstName} onChange={(event) => setField('firstName', event.target.value)} /></label>
                <label className="field"><span>Pavardė *</span><input required value={form.lastName} onChange={(event) => setField('lastName', event.target.value)} /></label>
              </div>
              <div className="form-grid two">
                <label className="field"><span>El. paštas *</span><input type="email" required autoComplete="email" value={form.email} onChange={(event) => setField('email', event.target.value)} /></label>
                <label className="field"><span>Telefonas</span><input type="tel" autoComplete="tel" value={form.phone} onChange={(event) => setField('phone', event.target.value)} /></label>
              </div>
              <div className="form-grid two">
                <label className="field"><span>Slaptažodis *</span><input type="password" minLength={8} required autoComplete="new-password" value={form.password} onChange={(event) => setField('password', event.target.value)} /><small>Mažiausiai 8 simboliai.</small></label>
                <label className="field"><span>Pakartoti slaptažodį *</span><input type="password" minLength={8} required autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setField('confirmPassword', event.target.value)} /></label>
              </div>

              <fieldset className="privacy-fieldset">
                <legend>Kaip norite būti matomas darbdaviams?</legend>
                <label className={`privacy-option ${form.privacyMode === 'active' ? 'selected' : ''}`}><input type="radio" name="privacy" checked={form.privacyMode === 'active'} onChange={() => setField('privacyMode', 'active')} /><div><strong>Aktyviai ieškau darbo</strong><span>Profilis gali būti rodomas tinkamiems darbdaviams.</span></div></label>
                <label className={`privacy-option ${form.privacyMode === 'open' ? 'selected' : ''}`}><input type="radio" name="privacy" checked={form.privacyMode === 'open'} onChange={() => setField('privacyMode', 'open')} /><div><strong>Atviras geriems pasiūlymams</strong><span>Noriu gauti rekomendacijas, nors aktyviai neieškau.</span></div></label>
                <label className={`privacy-option ${form.privacyMode === 'private' ? 'selected' : ''}`}><input type="radio" name="privacy" checked={form.privacyMode === 'private'} onChange={() => setField('privacyMode', 'private')} /><div><strong>Privatus profilis</strong><span>Profilio nerodyti darbdaviams.</span></div></label>
              </fieldset>

              <label className="check-line"><input type="checkbox" required checked={form.agreedToTerms} onChange={(event) => setField('agreedToTerms', event.target.checked)} /><span>Sutinku su <Link href="/taisykles">naudojimosi taisyklėmis</Link> ir <Link href="/privatumas">privatumo informacija</Link>.</span></label>
            </div>
            <div className="questionnaire-actions">
              <button type="button" className="btn btn-secondary" onClick={() => goToStep(2)}>Atgal</button>
              <button type="submit" className="btn btn-primary">Užbaigti registraciją</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
