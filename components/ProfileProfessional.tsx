'use client';
import { useId } from 'react';
import type { Education, SpecialistStep2Draft } from '@/lib/profiles/contracts';
import type { ProfileCatalogs } from '@/lib/profiles/view-model';
import { ChoiceField, MultiField, ProfileSection, SelectField, TextField } from './ProfileFields';

type Props = { role: string | null; catalogs: ProfileCatalogs; value: SpecialistStep2Draft; education: Education; onChange: (v: SpecialistStep2Draft) => void; onEducation: (v: Education) => void; errors: Record<string, string> };
export default function ProfileProfessional({ role, catalogs: c, value: v, education: e, onChange, onEducation, errors }: Props) {
  const aboutId = useId();
  const aboutError = (v.about_me?.length ?? 0) > 500 ? 'Aprašymas negali viršyti 500 simbolių.' : '';
  const set = <K extends keyof SpecialistStep2Draft>(key: K, val: SpecialistStep2Draft[K]) => onChange({ ...v, [key]: val });
  const edu = <K extends keyof Education>(key: K, val: Education[K]) => onEducation({ ...e, [key]: val });
  const interests = c.interests.filter(o => c.roleInterests.some(r => r.professional_role_code === role && r.interest_code === o.code));
  const search = c.search.map(o => ({ ...o, label_lt: o.code === 'actively_looking' ? 'Aktyviai ieškau' : o.code === 'not_looking' ? 'Šiuo metu neieškau' : o.label_lt }));
  const languages = v.languages ?? [];
  const chosen = languages.map(l => l.language_code);
  const institutionOptions = [{ code: 'lsmu', label_lt: 'Lietuvos sveikatos mokslų universitetas (LSMU) – Veterinarinė medicina' }, { code: 'other', label_lt: 'Kita' }];
  const bool = [{ code: 'true', label_lt: 'Taip' }, { code: 'false', label_lt: 'Ne' }];
  const boolValue = (value: boolean | null | undefined) => value == null ? '' : String(value);
  return <>
    <ProfileSection title="Vieta"><SelectField title="Gyvenamoji vieta" options={c.locations.filter(o => o.kind !== 'nationwide')} value={v.home_location_code} onChange={s => set('home_location_code', s || null)} />{v.home_location_code === 'abroad' && <div className="profile-grid"><TextField title="Šalis" value={v.home_country} maxLength={100} onChange={s => set('home_country', s.trim() ? s : null)} /><TextField title="Miestas" value={v.home_city} maxLength={100} onChange={s => set('home_city', s.trim() ? s : null)} /></div>}</ProfileSection>
    <ProfileSection title="Išsilavinimas" optional={!['veterinarian','veterinary_student','veterinary_pharmacy'].includes(role ?? '')}>
      {!role ? <p className="profile-helper">Pirmiausia išsaugokite profesijos pasirinkimą pagrindiniuose duomenyse.</p> : <>
      {['veterinarian','veterinary_student'].includes(role) && <SelectField title="Mokymo įstaiga" options={institutionOptions} value={e.institution_code} onChange={s => edu('institution_code', (s || null) as Education['institution_code'])} />}
      {(!['veterinarian','veterinary_student'].includes(role) || e.institution_code === 'other') && <div className="profile-grid"><TextField title="Mokymo įstaigos pavadinimas" value={e.institution_name} maxLength={200} onChange={s => edu('institution_name', s.trim() ? s : null)} /><TextField title="Šalis" value={e.country} maxLength={100} onChange={s => edu('country', s.trim() ? s : null)} /><TextField title="Studijų programa / kvalifikacija" value={e.program_or_qualification} maxLength={200} onChange={s => edu('program_or_qualification', s.trim() ? s : null)} /></div>}
      {role === 'veterinary_student' && (e.institution_code === 'lsmu' ? <SelectField title="Studijų kursas" value={e.current_course == null ? '' : String(e.current_course)} options={Array.from({ length: 6 }, (_, i) => ({ code: String(i + 1), label_lt: String(i + 1) }))} onChange={s => edu('current_course', s ? Number(s) : null)} /> : e.institution_code === 'other' ? <TextField title="Studijų kursas / metai" value={e.current_course_or_study_year} maxLength={100} onChange={s => edu('current_course_or_study_year', s.trim() ? s : null)} /> : null)}
      <TextField title="Baigimo metai" optional type="number" value={e.graduation_year} error={errors.graduation_year} onChange={s => edu('graduation_year', s ? Number(s) : null)} />
      </>}
    </ProfileSection>
    <ProfileSection title="Darbo patirtis"><SelectField title="Darbo patirtis" value={v.experience_band_code} options={c.experience} onChange={s => set('experience_band_code', s || null)} /></ProfileSection>
    <ProfileSection title="Gyvūnų grupės"><MultiField title="Gyvūnų grupės" value={v.animal_groups ?? []} options={c.animals} onChange={s => set('animal_groups', s)} /></ProfileSection>
    <ProfileSection title="Veiklos sritys"><MultiField title="Veiklos sritys" value={v.activity_areas ?? []} options={c.areas} onChange={s => set('activity_areas', s)} /></ProfileSection>
    <ProfileSection title="Apie mane" optional><div className="profile-field"><label className="visually-hidden" htmlFor={aboutId}>Apie mane</label><textarea id={aboutId} value={v.about_me ?? ''} rows={4} onChange={ev => set('about_me', ev.target.value || null)} aria-invalid={!!aboutError} aria-describedby={aboutId + '-count' + (aboutError ? ' ' + aboutId + '-error' : '')} /><div id={aboutId + '-count'} className="profile-counter">{(v.about_me ?? '').length} / 500</div>{aboutError && <p id={aboutId + '-error'} className="profile-field-error" role="alert">{aboutError}</p>}</div></ProfileSection>
    {interests.length > 0 && <ProfileSection title="Profesiniai interesai" optional><MultiField title="Profesiniai interesai" value={v.interests ?? []} options={interests} onChange={s => set('interests', s)} /></ProfileSection>}
    <ProfileSection title="Darbo pageidavimai"><div className="profile-grid">
      <SelectField title="Darbo paieškos statusas" value={v.job_search_status_code} options={search} onChange={s => set('job_search_status_code', (s || null) as SpecialistStep2Draft['job_search_status_code'])} />
      <SelectField title="Kada galėtumėte pradėti?" value={v.start_option_code} options={c.starts} onChange={s => set('start_option_code', s || null)} />
      {v.start_option_code === 'specific_date' && <TextField title="Darbo pradžios data" type="date" value={v.start_date} onChange={s => set('start_date', s || null)} />}
      <SelectField title="Mobilumas dėl darbo" value={v.mobility_code} options={c.mobility} onChange={s => set('mobility_code', s || null)} />
      <SelectField title="Darbo modelis" value={v.work_model_code} options={c.models} onChange={s => set('work_model_code', (s || null) as SpecialistStep2Draft['work_model_code'])} />
    </div><MultiField title="Pageidaujamos darbo vietos" value={v.work_locations ?? []} options={c.locations.filter(o => o.kind !== 'abroad')} onChange={s => set('work_locations', s)} /><MultiField title="Pageidaujamas darbo krūvis" value={v.workloads ?? []} options={c.workloads} onChange={s => set('workloads', s)} /><MultiField title="Pageidaujamas darbo grafikas" value={v.schedules ?? []} options={c.schedules} onChange={s => set('schedules', s)} /><div className="profile-grid three">
      <SelectField title="Darbas savaitgaliais" value={boolValue(v.can_work_weekends)} options={bool} onChange={s => set('can_work_weekends', s ? s === 'true' : null)} />
      <SelectField title="Naktinis darbas" value={boolValue(v.can_work_nights)} options={bool} onChange={s => set('can_work_nights', s ? s === 'true' : null)} />
      <SelectField title="Budėjimai" value={boolValue(v.can_be_on_call)} options={bool} onChange={s => set('can_be_on_call', s ? s === 'true' : null)} />
    </div></ProfileSection>
    <ProfileSection title="Kalbos">{languages.map((l, i) => <div className="profile-language" key={l.language_code}>
      <SelectField title="Kalba" value={l.language_code} options={c.languages.filter(o => o.code === l.language_code || !chosen.includes(o.code))} onChange={s => { if (!s) return; set('languages', languages.map((r, n) => n === i ? { ...r, language_code: s, language_name: null } : r)); }} />
      <SelectField title="Mokėjimo lygis" value={l.proficiency_code} options={c.languageLevels} onChange={s => set('languages', languages.map((r, n) => n === i ? { ...r, proficiency_code: s || null } : r))} />
      <button type="button" className="profile-remove" aria-label={'Pašalinti kalbą: ' + c.languages.find(o => o.code === l.language_code)?.label_lt} onClick={() => set('languages', languages.filter((_, n) => n !== i))}>Pašalinti</button>
      {l.language_code === 'other' && <TextField title="Kalbos pavadinimas" value={l.language_name} maxLength={100} onChange={s => set('languages', languages.map((r, n) => n === i ? { ...r, language_name: s.trim() ? s : null } : r))} />}
    </div>)}<SelectField title="Pridėti kalbą" value="" empty="Pasirinkite kalbą" options={c.languages.filter(o => !chosen.includes(o.code))} onChange={s => { if (s) set('languages', [...languages, { language_code: s, proficiency_code: null }]); }} /></ProfileSection>
    <ProfileSection title="Profilio matomumas"><ChoiceField title="Profilio matomumas" value={v.profile_visibility} options={c.visibility} onChange={s => set('profile_visibility', s as SpecialistStep2Draft['profile_visibility'])} /></ProfileSection>
  </>;
}
