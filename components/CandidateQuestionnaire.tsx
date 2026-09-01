'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import ProgressBar from '@/components/ProgressBar';
import { candidateRoleOptions, employmentTypeOptions } from '@/data/candidateRoles';
import { candidateQuestionnaire, experienceOptions, licensedCandidateRoles } from '@/data/candidateQuestions';
import { CandidateRegistration, CandidateRoleType, initialCandidateRegistration } from '@/types/registration';

type ProfessionalField =
  | 'roleDetail'
  | 'experienceYears'
  | 'education'
  | 'city'
  | 'preferredLocations'
  | 'employmentTypes'
  | 'salaryExpectation'
  | 'availability'
  | 'skills'
  | 'languages'
  | 'drivingLicense'
  | 'openToTravel';

export default function CandidateQuestionnaire() {
  const [step, setStep] = useState(1);
  const [validated, setValidated] = useState(false);
  const [form, setForm] = useState<CandidateRegistration>(initialCandidateRegistration);
  const selectedRole = useMemo(() => candidateRoleOptions.find((option) => option.id === form.roleType), [form.roleType]);
  const requiresLicense = form.roleType !== '' && licensedCandidateRoles.includes(form.roleType);
  const questions = candidateQuestionnaire.questions;

  const setField = <K extends ProfessionalField>(field: K, value: CandidateRegistration[K]) => {
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

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    if (!element.checkValidity()) {
      element.reportValidity();
      return;
    }

    setValidated(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const restart = () => {
    setForm(initialCandidateRegistration);
    setValidated(false);
    setStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (validated) {
    return (
      <section className="questionnaire-complete">
        <span className="section-kicker">Anketos patikra baigta</span>
        <h1>Profesinė informacija užpildyta.</h1>
        <p>Forma sėkmingai praėjo kliento pusės validaciją. Jokia informacija — įskaitant licencijos numerį — nebuvo išsaugota ar išsiųsta.</p>
        <div className="questionnaire-complete-actions">
          <Link href="/skelbimai" className="btn btn-primary">Peržiūrėti skelbimus <span>→</span></Link>
          <button type="button" className="btn btn-secondary" onClick={restart}>Pildyti iš naujo</button>
        </div>
      </section>
    );
  }

  return (
    <div className="questionnaire-shell">
      <header className="questionnaire-intro">
        <span className="section-kicker">{candidateQuestionnaire.intro.kicker}</span>
        <div className="questionnaire-intro-grid">
          <h1>{candidateQuestionnaire.intro.title}</h1>
          <p>{candidateQuestionnaire.intro.description}</p>
        </div>
      </header>

      <div className="questionnaire-workspace">
        <aside className="questionnaire-sidebar">
          <ProgressBar currentStep={step} totalSteps={2} />
          <ol>
            <li className={step === 1 ? 'current' : 'complete'}><span>01</span><div><strong>Profesinė rolė</strong><small>Pasirinkite artimiausią kryptį</small></div></li>
            <li className={step === 2 ? 'current' : ''}><span>02</span><div><strong>Profesinis profilis</strong><small>Patirtis ir darbo lūkesčiai</small></div></li>
          </ol>
          <p>Anketa yra demonstracinė. Jos duomenys nėra saugomi.</p>
        </aside>

        {step === 1 && (
          <section className="questionnaire-card" aria-labelledby="role-step-title">
            <div className="questionnaire-heading">
              <span>01 / 02</span>
              <h2 id="role-step-title">{candidateQuestionnaire.role.title}</h2>
              <p>{candidateQuestionnaire.role.description}</p>
            </div>
            <div className="role-options">
              {candidateRoleOptions.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  className={`role-option ${form.roleType === option.id ? 'selected' : ''}`}
                  onClick={() => selectRole(option.id)}
                  aria-pressed={form.roleType === option.id}
                >
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{option.label}</strong><small>{option.description}</small></div>
                  <i aria-hidden="true">{form.roleType === option.id ? '✓' : '→'}</i>
                </button>
              ))}
            </div>
            <div className="questionnaire-actions questionnaire-actions-end">
              <button type="button" className="btn btn-primary" disabled={!form.roleType} onClick={() => { setStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Tęsti <span>→</span></button>
            </div>
          </section>
        )}

        {step === 2 && (
          <form className="questionnaire-card" onSubmit={submit} noValidate>
            <div className="questionnaire-heading">
              <span>02 / 02</span>
              <h2>{candidateQuestionnaire.profile.title}</h2>
              <p>{candidateQuestionnaire.profile.description}</p>
            </div>

            <div className="questionnaire-fields">
              <div className="selected-role-line"><span>Pasirinkta rolė</span><strong>{selectedRole?.label}</strong></div>

              <label className="field">
                <span>{selectedRole?.detailLabel || questions.roleDetail.label} *</span>
                <input required value={form.roleDetail} onChange={(event) => setField('roleDetail', event.target.value)} placeholder={selectedRole?.detailPlaceholder} />
                <small>{questions.roleDetail.help}</small>
              </label>

              {requiresLicense && (
                <div className="license-fieldset">
                  <div className="license-privacy-note">
                    <span aria-hidden="true">!</span>
                    <div><strong>{candidateQuestionnaire.license.privacyTitle}</strong><p>{candidateQuestionnaire.license.privacyText}</p></div>
                  </div>
                  <label className="field" htmlFor={candidateQuestionnaire.license.id}>
                    <span>{candidateQuestionnaire.license.label} *</span>
                    <input
                      id={candidateQuestionnaire.license.id}
                      type="text"
                      required
                      pattern=".*\S.*"
                      autoComplete="off"
                      aria-describedby="license-help"
                      onInvalid={(event) => event.currentTarget.setCustomValidity(candidateQuestionnaire.license.requiredMessage)}
                      onInput={(event) => event.currentTarget.setCustomValidity('')}
                    />
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
              <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>← Atgal</button>
              <button type="submit" className="btn btn-primary">Patikrinti anketą <span>→</span></button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
