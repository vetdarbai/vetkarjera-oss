'use client';
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import Navigation from './Navigation';
import Footer from './Footer';
import LogoutButton from './LogoutButton';
import { ProfileDialog, ProfileSection, SelectField, TextField } from './ProfileFields';
import ProfileProfessional from './ProfileProfessional';
import ProfileCompetencies from './ProfileCompetencies';
import { ProfileLicense, ProfilePhoto } from './ProfileOwnerAssets';
import { saveEducation, saveSpecialistStep1, saveSpecialistStep2, saveSpecialistStep3 } from '@/app/profilis/actions';
import { reloadSpecialistProfile } from '@/app/profilis/read';
import { changedPatch, educationDraft, label, missingLabel, readinessLabel, standardLevels, studentLevels, step1Draft, step2Draft, step3Draft, stepNames, type ProfileBundle, type Option } from '@/lib/profiles/view-model';
import type { ProfileResult, SpecialistStep1Draft, StandardLevel } from '@/lib/profiles/contracts';

function Values({ rows }: { rows: [string, ReactNode][] }) {
  return <dl className="profile-values">{rows.map(([title, value]) => <div key={title}><dt>{title}</dt><dd>{value || 'Nepasirinkta'}</dd></div>)}</dl>;
}
function OverviewSection({ title, edit, children }: { title: string; edit: () => void; children: ReactNode }) {
  return <section className="profile-section"><div className="profile-section-heading"><h2>{title}</h2><button type="button" className="profile-text-button" onClick={edit}>Redaguoti</button></div>{children}</section>;
}
export default function SpecialistProfile({ initial }: { initial: ProfileBundle }) {
  const [bundle, setBundle] = useState(initial), [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [one, setOne] = useState(step1Draft(initial.data)), [two, setTwo] = useState(step2Draft(initial.data)), [education, setEducation] = useState(educationDraft(initial.data)), [three, setThree] = useState(step3Draft(initial.data));
  const [pending, setPending] = useState(false), [saved, setSaved] = useState(false), [error, setError] = useState(''), [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [confirmProfession, setConfirmProfession] = useState(false), [exit, setExit] = useState<(() => void) | null>(null), [licenseDirty, setLicenseDirty] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const discardExit = useRef(false);
  const readRetrySnapshot = useRef<{ one: typeof one; two: typeof two; education: typeof education; three: typeof three } | null>(null);
  const d = bundle.data, p = d.profile, c = bundle.catalogs, role = p.professional_role_code, completeness = d.completeness;
  const changed = (a: object, b: object) => JSON.stringify(a) !== JSON.stringify(b);
  const dirty = (step === 1 ? changed(step1Draft(d), one) : step === 2 ? changed(step2Draft(d), two) || changed(educationDraft(d), education) : step === 3 ? changed(step3Draft(d), three) : false) || licenseDirty;
  useEffect(() => {
    if (!dirty) return;
    discardExit.current = false;
    const unload = (e: BeforeUnloadEvent) => { if (!discardExit.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, [dirty]);
  const licenseChanged = useCallback((value: boolean) => setLicenseDirty(value), []);
  const refresh = useCallback(async () => {
    try { const r = await reloadSpecialistProfile(); if (r.ok && r.bundle) { setBundle(r.bundle); return r.bundle; } }
    catch { /* A failed read must not fabricate readiness or repeat a successful write. */ }
    setBundle(current => ({ ...current, data: { ...current.data, completeness: null } }));
    return null;
  }, []);
  function reset(value = bundle) { setOne(step1Draft(value.data)); setTwo(step2Draft(value.data)); setEducation(educationDraft(value.data)); setThree(step3Draft(value.data)); setFieldErrors({}); setError(''); setSaved(false); readRetrySnapshot.current = null; }
  function navigate(next: 0 | 1 | 2 | 3) {
    if (pending) return;
    const go = () => { reset(); setStep(next); setLicenseDirty(false); window.scrollTo({ top: 0 }); requestAnimationFrame(() => titleRef.current?.focus()); };
    if (dirty) setExit(() => go); else go();
  }
  function captureLink(e: MouseEvent<HTMLDivElement>) {
    if (!dirty || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, window.location.href);
    if (url.origin !== window.location.origin || url.href === window.location.href) return;
    if (pending) { e.preventDefault(); e.stopPropagation(); return; }
    e.preventDefault(); e.stopPropagation(); setExit(() => () => { window.location.assign(url.href); });
  }
  async function save(professionConfirmed = false) {
    if (pending || error.startsWith('Pakeitimai išsaugoti')) return;
    const errors: Record<string, string> = {};
    if (step === 2) {
      if ((two.about_me?.length ?? 0) > 500) errors.about_me = 'Aprašymas negali viršyti 500 simbolių.';
      if (education.graduation_year != null && (!Number.isInteger(education.graduation_year) || education.graduation_year < 1900 || education.graduation_year > 2200)) errors.graduation_year = 'Įveskite metus nuo 1900 iki 2200.';
    }
    if (step === 3) {
      three.custom_competencies?.forEach((r, i) => { if (!r.name.trim() || !r.level) errors['custom-' + i] = 'Įveskite kompetencijos pavadinimą ir pasirinkite lygį.'; else if (three.custom_competencies?.some((v, n) => n !== i && v.name.trim() === r.name.trim())) errors['custom-' + i] = 'Ši kompetencija jau įrašyta.'; });
      three.custom_development?.forEach((r, i) => { if (!r.trim()) errors['development-' + i] = 'Įveskite tobulėjimo sritį.'; else if (three.custom_development?.some((v, n) => n !== i && v.trim() === r.trim())) errors['development-' + i] = 'Ši tobulėjimo sritis jau įrašyta.'; });
    }
    setFieldErrors(errors); setError('');
    if (Object.keys(errors).length) return;
    if (step === 1 && role && one.professional_role_code !== role && !professionConfirmed) { setConfirmProfession(true); return; }
    setConfirmProfession(false); setPending(true); setSaved(false);
    let result: ProfileResult = { ok: true };
    try {
      if (step === 1) result = await saveSpecialistStep1(changedPatch(step1Draft(d), one));
      if (step === 2) {
        const educationPatch = changedPatch(educationDraft(d), education);
        if (Object.keys(educationPatch).length) result = await saveEducation(educationPatch);
        if (result.ok) result = await saveSpecialistStep2(changedPatch(step2Draft(d), two));
      }
      // STEP3 is an existing full replacement contract, so send the complete role-context state.
      if (step === 3) result = await saveSpecialistStep3({ ...three, custom_competencies: three.custom_competencies?.map(row => ({ name: row.name, level: row.level as StandardLevel })) }); // Empty draft levels were rejected above; RPC independently validates supplied values.
      if (!result.ok) { setError('Nepavyko išsaugoti profilio.'); return; }
      const fresh = await refresh();
      if (fresh) { reset(fresh); setSaved(true); }
      else {
        // The write succeeded. Do not suggest re-sending it or fabricate completeness.
        setBundle({ ...bundle, data: { ...d, completeness: null } });
        readRetrySnapshot.current = { one, two, education, three };
        setError('Pakeitimai išsaugoti. Nepavyko atnaujinti profilio peržiūros. Įvesti duomenys liko formoje.');
      }
    } catch { setError('Nepavyko susisiekti su serveriu.'); }
    finally { setPending(false); }
  }
  async function retryRead() {
    setPending(true);
    try {
      const snapshot = readRetrySnapshot.current, fresh = await refresh();
      if (fresh) {
        reset(fresh);
        // Keep edits made after the write succeeded but its follow-up read failed.
        if (snapshot) {
          setOne({ ...step1Draft(fresh.data), ...changedPatch(snapshot.one, one) });
          setTwo({ ...step2Draft(fresh.data), ...changedPatch(snapshot.two, two) });
          setEducation({ ...educationDraft(fresh.data), ...changedPatch(snapshot.education, education) });
          setThree({ ...step3Draft(fresh.data), ...changedPatch(snapshot.three, three) });
        }
        setSaved(true);
      }
    }
    catch { /* Keep the saved-write notice and current fields if the read still fails. */ }
    finally { setPending(false); }
  }
  const join = (options: Option[], codes: string[]) => codes.length ? codes.map(s => label(options, s)).join(', ') : 'Nepasirinkta';
  const currentEducation = d.education.find(r => r.professional_role_code === role);
  const educationSummary = currentEducation ? [currentEducation.institution_code === 'lsmu' ? 'Lietuvos sveikatos mokslų universitetas (LSMU) – Veterinarinė medicina' : currentEducation.institution_name,
    currentEducation.institution_code !== 'lsmu' && currentEducation.program_or_qualification, currentEducation.graduation_year].filter(Boolean).join(' · ') : 'Nepasirinkta';
  const searchLabel = (value: string | null) => value === 'actively_looking' ? 'Aktyviai ieškau' : value === 'not_looking' ? 'Šiuo metu neieškau' : label(c.search, value);
  const step2Description = role ? 'Galite išsaugoti ir neužpildytą dalį.' : 'Galite išsaugoti ir neužpildytą dalį. Profesijai skirtus laukus galėsite pildyti išsaugoję profesijos pasirinkimą.';
  return <div className="specialist-profile-page" onClickCapture={captureLink}><Navigation /><main className={'profile-shell ' + (step ? 'editing' : 'overview')}>
    {step > 0 && <><button type="button" className="profile-back profile-text-button" onClick={() => navigate(0)}>‹ Grįžti į profilį</button><aside className="profile-steps" aria-label="Profilio dalys">{stepNames.map((s, i) => <button key={s} type="button" aria-current={step === i + 1 ? 'step' : undefined} onClick={() => navigate((i + 1) as 1 | 2 | 3)} disabled={pending}>{s}</button>)}</aside><div className="profile-mobile-steps"><SelectField title="Profilio dalis" value={String(step)} options={stepNames.map((s, i) => ({ code: String(i + 1), label_lt: `${i + 1} iš 3 · ${s}` }))} onChange={s => { if (s) navigate(Number(s) as 1 | 2 | 3); }} disabled={pending} /></div></>}
    <div className="profile-content">
      {step === 0 ? <>
        <div className="profile-identity"><ProfilePhoto /><div><p className="profile-eyebrow">Specialisto profilis</p><h1 ref={titleRef} tabIndex={-1}>{[p.first_name, p.last_name].filter(Boolean).join(' ') || 'Specialisto profilis'}</h1><p>{label(c.roles, role)}{role === 'other_veterinary_specialty' && p.specialty_free_text ? ' · ' + p.specialty_free_text : ''}{p.home_location_code ? ' · ' + label(c.locations, p.home_location_code) : ''}</p></div></div>
        <section className="profile-readiness" aria-label="Profilio paruoštumas">{completeness ? <><div className="profile-readiness-heading"><h2>{readinessLabel(completeness.readinessState)}</h2><strong>{completeness.total} %</strong></div><progress value={completeness.total} max={100} aria-label="Profilio užpildymas" />{completeness.readinessState === 'complete' ? <p>Profilis paruoštas kandidatavimui.</p> : completeness.readyToApply ? <p>Kompetencijas ir tobulėjimo sritis galite papildyti vėliau.</p> : <><p>Dar trūksta: {Array.from(new Set(completeness.missingRequired.map(m => missingLabel(m.field)))).join(', ')}.</p><button className="profile-button" type="button" onClick={() => navigate(completeness.missingRequired.some(m => m.step === 1) ? 1 : 2)}>Tęsti pildymą</button></>}</> : <><h2>Profilio paruoštumas šiuo metu nepasiekiamas.</h2><button type="button" className="profile-button secondary" onClick={() => void refresh()}>Bandyti dar kartą</button></>}</section>
        <OverviewSection title="Pagrindiniai duomenys" edit={() => navigate(1)}><Values rows={[
          ['Vardas ir pavardė', [p.first_name,p.last_name].filter(Boolean).join(' ')], ['Profesija', label(c.roles, role)], ...(role === 'other_veterinary_specialty' ? [['Specialybės pavadinimas', p.specialty_free_text] as [string, ReactNode]] : []), ['Vieta', label(c.locations,p.home_location_code)],
        ]} /></OverviewSection>
        <OverviewSection title="Profesinis profilis" edit={() => navigate(2)}><Values rows={[
          ['Išsilavinimas', educationSummary], ['Darbo patirtis', label(c.experience,p.experience_band_code)], ['Gyvūnų grupės', join(c.animals,d.animals.map(r => r.animal_group_code))], ['Veiklos sritys', join(c.areas,d.areas.map(r => r.activity_area_code))],
          ...(p.about_me ? [['Apie mane',p.about_me] as [string, ReactNode]] : []), ...(d.interests.some(r => r.professional_role_code === role) ? [['Profesiniai interesai',join(c.interests,d.interests.filter(r => r.professional_role_code === role).map(r => r.interest_code))] as [string, ReactNode]] : []),
        ]} /></OverviewSection>
        <OverviewSection title="Darbo pageidavimai" edit={() => navigate(2)}><Values rows={[
          ['Darbo paieškos statusas',searchLabel(p.job_search_status_code)], ['Pageidaujamos darbo vietos', join(c.locations,d.locations.map(r => r.location_code))], ['Pageidaujamas darbo krūvis', join(c.workloads,d.workloads.map(r => r.workload_code))], ['Kada galėtumėte pradėti?', [label(c.starts,p.start_option_code),p.start_option_code === 'specific_date' ? p.start_date : null].filter(Boolean).join(' · ')],
          ['Pageidaujamas darbo grafikas',join(c.schedules,d.schedules.map(r => r.schedule_code))], ['Mobilumas dėl darbo',label(c.mobility,p.mobility_code)], ['Darbo modelis',label(c.models,p.work_model_code)],
          ['Darbas savaitgaliais',p.can_work_weekends == null ? 'Nepasirinkta' : p.can_work_weekends ? 'Taip' : 'Ne'], ['Naktinis darbas',p.can_work_nights == null ? 'Nepasirinkta' : p.can_work_nights ? 'Taip' : 'Ne'], ['Budėjimai',p.can_be_on_call == null ? 'Nepasirinkta' : p.can_be_on_call ? 'Taip' : 'Ne'],
        ]} /></OverviewSection>
        <OverviewSection title="Kalbos" edit={() => navigate(2)}>{d.languages.length ? <Values rows={d.languages.map(r => [r.language_code === 'other' ? r.language_name || 'Kita kalba' : label(c.languages,r.language_code),label(c.languageLevels,r.proficiency_code)])} /> : <p className="profile-helper">Nepasirinkta</p>}</OverviewSection>
        <OverviewSection title="Kompetencijos ir tobulėjimas" edit={() => navigate(3)}><div className="profile-competency-summary">{d.competencies.filter(r => r.professional_role_code === role).map(r => <Values key={r.competency_code} rows={[[label(c.competencies,r.competency_code),label(role === 'veterinary_student' ? studentLevels : standardLevels,r.level)]]} />)}{role === 'other_veterinary_specialty' && d.custom.map(r => <Values key={r.slot} rows={[[r.name,label(standardLevels,r.level)]]} />)}</div>{!(d.competencies.some(r => r.professional_role_code === role) || (role === 'other_veterinary_specialty' && d.custom.length)) && <p className="profile-helper">Šią dalį galite papildyti vėliau.</p>}{d.autonomy.filter(r => r.professional_role_code === role).map(r => <Values key={r.autonomy_code} rows={[["Bendras savarankiškumas klinikinėje praktikoje",label(c.autonomy.filter(o => o.professional_role_code === role),r.autonomy_code)]]} />)}{d.development.some(r => r.professional_role_code === role) && <Values rows={[["Kur norėtumėte tobulėti?",join(c.development.filter(o => o.professional_role_code === role),d.development.filter(r => r.professional_role_code === role).map(r => r.area_code))]]} />}{role === 'other_veterinary_specialty' && d.customDevelopment.length > 0 && <Values rows={[["Kur norėtumėte tobulėti?",d.customDevelopment.map(r => r.name).join(', ')]]} />}</OverviewSection>
        <OverviewSection title="Savininko valdymas" edit={() => navigate(2)}><p className="profile-helper">Matoma tik jums.</p><Values rows={[["Profilio matomumas",label(c.visibility,p.profile_visibility)]]} />{role === 'veterinarian' && <ProfileLicense onSaved={async () => { await refresh(); }} onDirty={licenseChanged} />}</OverviewSection><LogoutButton />
      </> : <>
        <h1 ref={titleRef} tabIndex={-1}>{stepNames[step - 1]}</h1><p className="profile-intro">{step === 3 ? 'Šią dalį galite pildyti palaipsniui.' : step2Description}</p>
        <form noValidate onSubmit={e => { e.preventDefault(); void save(); }}><fieldset className="profile-form-fields" disabled={pending}>
          {step === 1 && <><ProfileSection title="Pagrindiniai duomenys"><TextField title="Vardas" value={one.first_name} maxLength={100} onChange={s => setOne({ ...one, first_name: s.trim() ? s : null })} /><TextField title="Pavardė" value={one.last_name} maxLength={100} onChange={s => setOne({ ...one, last_name: s.trim() ? s : null })} /><SelectField title="Profesija" options={c.roles} value={one.professional_role_code} onChange={s => setOne({ ...one, professional_role_code: (s || null) as SpecialistStep1Draft['professional_role_code'] })} />{one.professional_role_code === 'other_veterinary_specialty' && <TextField title="Specialybės pavadinimas" value={one.specialty_free_text} maxLength={200} onChange={s => setOne({ ...one, specialty_free_text: s.trim() ? s : null })} />}</ProfileSection><ProfilePhoto editable /></>}
          {step === 2 && <ProfileProfessional role={role} catalogs={c} value={two} education={education} onChange={setTwo} onEducation={setEducation} errors={fieldErrors} />}
          {step === 3 && <ProfileCompetencies role={role} catalogs={c} value={three} onChange={setThree} errors={fieldErrors} />}
        </fieldset>
        {error && <div className="profile-notice error" role="alert"><div><strong>{error}</strong><p>Įvesti duomenys liko formoje.</p></div><button type="button" className="profile-button secondary" disabled={pending} onClick={() => void (error.startsWith('Pakeitimai išsaugoti') ? retryRead() : save())}>Bandyti dar kartą</button></div>}
        {saved && !dirty && <div className="profile-notice success" role="status"><strong>Pakeitimai išsaugoti.</strong>{completeness && !completeness.readyToApply && <p>Dar trūksta: {Array.from(new Set(completeness.missingRequired.map(m => missingLabel(m.field)))).join(', ')}.</p>}</div>}
        <div className="profile-save"><p role="status">{pending ? 'Išsaugoma…' : dirty ? 'Yra neišsaugotų pakeitimų.' : saved ? 'Pakeitimai išsaugoti.' : 'Nėra neišsaugotų pakeitimų.'}</p><button type="submit" className="profile-button" disabled={pending || !dirty || error.startsWith('Pakeitimai išsaugoti') || (licenseDirty && !changed(step2Draft(d),two) && !changed(educationDraft(d),education))}>{pending ? 'Išsaugoma…' : 'Išsaugoti'}</button></div></form>
        {step === 2 && role === 'veterinarian' && <ProfileSection title="Savininko valdymas"><ProfileLicense onSaved={async () => { await refresh(); }} onDirty={licenseChanged} /></ProfileSection>}
      </>}
    </div>
  </main><Footer />
  {confirmProfession && <ProfileDialog title="Keisti profesiją?" onClose={() => setConfirmProfession(false)}><p>Pakeitus profesiją, gali pasikeisti rodomi profesiniai laukai, kompetencijos ir profilio užpildymo procentas.</p><div className="profile-dialog-actions"><button type="button" className="profile-button secondary" onClick={() => setConfirmProfession(false)}>Grįžti</button><button type="button" className="profile-button" onClick={() => void save(true)}>Išsaugoti pakeitimą</button></div></ProfileDialog>}
  {exit && <ProfileDialog title="Yra neišsaugotų pakeitimų." onClose={() => setExit(null)}><p>Išeiti neišsaugojus pakeitimų?</p><div className="profile-dialog-actions"><button type="button" className="profile-button secondary" onClick={() => setExit(null)}>Tęsti redagavimą</button><button type="button" className="profile-button danger" onClick={() => { const go = exit; discardExit.current = true; setExit(null); setLicenseDirty(false); go(); }}>Išeiti neišsaugojus</button></div></ProfileDialog>}
  </div>;
}
