import type { Database } from '@/types/database';
import type { Completeness, Education, SpecialistStep1Draft, SpecialistStep2Draft, SpecialistStep3, StandardLevel } from './contracts';

type Tables = Database['public']['Tables'];
export type Row<N extends keyof Tables> = Tables[N]['Row'];
export type Option = { code: string; label_lt: string };
export type ProfileCatalogs = {
  roles: Option[]; locations: (Option & { kind: string })[]; experience: Option[];
  animals: Option[]; areas: Option[]; interests: Option[];
  roleInterests: Row<'professional_role_interests'>[];
  search: Option[]; workloads: Option[]; schedules: Option[]; mobility: Option[];
  starts: Option[]; models: Option[]; languages: Option[]; languageLevels: Option[]; visibility: Option[];
  competencies: Row<'competencies'>[]; autonomy: Row<'autonomy_options'>[]; development: Row<'development_areas'>[];
};
export type ProfileData = {
  profile: Row<'specialist_profiles'>;
  education: Row<'specialist_education'>[];
  animals: Row<'specialist_animal_groups'>[]; areas: Row<'specialist_activity_areas'>[];
  interests: Row<'specialist_interests'>[]; locations: Row<'specialist_work_locations'>[];
  workloads: Row<'specialist_workloads'>[]; schedules: Row<'specialist_schedules'>[];
  languages: Row<'specialist_languages'>[]; competencies: Row<'specialist_competencies'>[];
  autonomy: Row<'specialist_autonomy'>[]; development: Row<'specialist_development_areas'>[];
  custom: Row<'specialist_custom_competencies'>[]; customDevelopment: Row<'specialist_custom_development'>[];
  completeness: Completeness | null;
};
export type ProfileBundle = { data: ProfileData; catalogs: ProfileCatalogs };
export type ProfileStep3Draft = Omit<SpecialistStep3, 'custom_competencies'> & { custom_competencies?: { name: string; level: StandardLevel | '' }[] };
export const stepNames = ['Pagrindiniai duomenys', 'Profesinis profilis', 'Kompetencijos ir tobulėjimas'] as const;
export const groupLabels: Record<string, string> = {
  procedures: 'Procedūros', lab_diagnostics: 'Laboratorija / diagnostika', anesthesia_surgery: 'Anestezija / chirurgija', clinical_areas: 'Klinikinės kryptys',
  patient_care: 'Paciento priežiūra', procedures_assistance: 'Procedūros ir asistavimas', laboratory: 'Laboratorija', communication: 'Komunikacija',
  anesthesia_operating_room: 'Anestezija ir operacinė', diagnostic_support: 'Diagnostikos pagalba', clinic_operations: 'Klinikos veikla', basic_clinical: 'Klinikiniai pagrindai', diagnostics: 'Diagnostika', communication_documentation: 'Komunikacija ir dokumentacija', veterinary_medicines: 'Veterinariniai vaistai', customer_consulting: 'Klientų konsultavimas', pharmacy_operations: 'Vaistinės veikla', documentation_safety: 'Dokumentacija ir sauga', commercial: 'Komercija', sales_clients: 'Pardavimai ir klientai', market_clients: 'Rinka ir klientai', product_technical: 'Produktų žinios', presentations_training: 'Prezentacijos ir mokymai', account_management: 'Klientų valdymas', work_organization: 'Darbo organizavimas',
};
export const standardLevels: Option[] = [
  { code: 'with_assistance', label_lt: 'Atlieku su pagalba' }, { code: 'independent', label_lt: 'Atlieku savarankiškai' }, { code: 'can_teach', label_lt: 'Galiu mokyti kitus' },
];
export const studentLevels: Option[] = [
  { code: 'theory_only', label_lt: 'Turiu teorinių žinių' }, { code: 'with_assistance', label_lt: 'Atlieku su pagalba' }, { code: 'supervised_confident', label_lt: 'Atlieku užtikrintai prižiūrint gydytojui' },
];
const missingLabels: Record<string, string> = {
  first_name: 'vardas', last_name: 'pavardė', professional_role_code: 'profesija', specialty_free_text: 'specialybės pavadinimas',
  home_location_code: 'gyvenamoji vieta', home_country: 'gyvenamosios vietos šalis', home_city: 'gyvenamosios vietos miestas',
  experience_band_code: 'darbo patirtis', job_search_status_code: 'darbo paieškos statusas', start_option_code: 'darbo pradžia', start_date: 'darbo pradžios data',
  profile_visibility: 'profilio matomumas', animal_groups: 'gyvūnų grupės', activity_areas: 'veiklos sritys', work_locations: 'pageidaujamos darbo vietos', workloads: 'pageidaujamas darbo krūvis',
  languages: 'kalbos', 'languages.proficiency_code': 'kalbos mokėjimo lygis', 'languages.language_name': 'kitos kalbos pavadinimas',
  'education.institution_code': 'mokymo įstaiga', 'education.institution_name': 'mokymo įstaigos pavadinimas', 'education.country': 'studijų šalis',
  'education.program_or_qualification': 'studijų programa / kvalifikacija', 'education.current_course': 'studijų kursas', 'education.current_course_or_study_year': 'studijų kursas / metai', license_number: 'licencijos numeris',
};
export function missingLabel(field: string) { return missingLabels[field] ?? 'profilio duomenys'; }
export function label(options: Option[], code: string | null | undefined) { return options.find(o => o.code === code)?.label_lt ?? 'Nepasirinkta'; }
export function readinessLabel(state: Completeness['readinessState']) {
  return state === 'complete' ? 'Išsamus profilis' : state === 'ready' ? 'Profilis paruoštas kandidatavimui' : 'Profilis dar neparuoštas kandidatavimui';
}
/** Route using the server's required gaps and scored sections, not a client score. */
export function nextIncompleteStep(value: Completeness): 1 | 2 | 3 {
  const required = value.missingRequired.find(m => m.step === 1) ?? value.missingRequired[0];
  if (required) return required.step;
  if (!value.step1Complete) return 1;
  if (!value.step2Complete) return 2;
  return value.step3 < 30 ? 3 : 2;
}
export function parseCompleteness(value: unknown): Completeness | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Completeness;
  if (v.contractVersion !== 2 || ![v.step1, v.step2, v.step3, v.total].every(n => typeof n === 'number' && Number.isFinite(n)) ||
    typeof v.readyToApply !== 'boolean' || typeof v.step1Complete !== 'boolean' || typeof v.step2Complete !== 'boolean' ||
    !['not_ready','ready','complete'].includes(v.readinessState) || !Array.isArray(v.missingRequired) ||
    !v.missingRequired.every(m => m && typeof m.field === 'string' && [1,2].includes(m.step) && m.reason === 'required')) return null;
  return { step1: v.step1, step2: v.step2, step3: v.step3, total: v.total, step1Complete: v.step1Complete, step2Complete: v.step2Complete,
    missingRequired: v.missingRequired.map(m => ({ field: m.field, step: m.step, reason: m.reason })), readyToApply: v.readyToApply, readinessState: v.readinessState, contractVersion: 2,
    ...(typeof v.applicableCompetencies === 'number' ? { applicableCompetencies: v.applicableCompetencies } : {}), ...(typeof v.filledCompetencies === 'number' ? { filledCompetencies: v.filledCompetencies } : {}) };
}
export function step1Draft(d: ProfileData): SpecialistStep1Draft {
  const p = d.profile;
  return { first_name: p.first_name, last_name: p.last_name, professional_role_code: p.professional_role_code as SpecialistStep1Draft['professional_role_code'], specialty_free_text: p.specialty_free_text };
}
export function step2Draft(d: ProfileData): SpecialistStep2Draft {
  const p = d.profile;
  return {
    home_location_code: p.home_location_code, home_country: p.home_country, home_city: p.home_city, experience_band_code: p.experience_band_code,
    about_me: p.about_me, job_search_status_code: p.job_search_status_code as SpecialistStep2Draft['job_search_status_code'], mobility_code: p.mobility_code,
    start_option_code: p.start_option_code, start_date: p.start_date,
    can_work_weekends: p.can_work_weekends, can_work_nights: p.can_work_nights, can_be_on_call: p.can_be_on_call,
    profile_visibility: p.profile_visibility as SpecialistStep2Draft['profile_visibility'],
    animal_groups: d.animals.map(r => r.animal_group_code), activity_areas: d.areas.map(r => r.activity_area_code),
    work_locations: d.locations.map(r => r.location_code), workloads: d.workloads.map(r => r.workload_code),
    interests: d.interests.filter(r => r.professional_role_code === p.professional_role_code).map(r => r.interest_code),
    languages: d.languages.map(r => ({ language_code: r.language_code, proficiency_code: r.proficiency_code, language_name: r.language_name })),
  };
}
export function educationDraft(d: ProfileData): Education {
  const e = d.education.find(r => r.professional_role_code === d.profile.professional_role_code);
  return { institution_code: e?.institution_code as Education['institution_code'] ?? null, institution_name: e?.institution_name ?? null, country: e?.country ?? null,
    program_or_qualification: e?.program_or_qualification ?? null, graduation_year: e?.graduation_year ?? null, current_course: e?.current_course ?? null, current_course_or_study_year: e?.current_course_or_study_year ?? null };
}
export function step3Draft(d: ProfileData): ProfileStep3Draft {
  const role = d.profile.professional_role_code;
  return { competencies: d.competencies.filter(r => r.professional_role_code === role).map(r => ({ competency_code: r.competency_code, level: r.level as NonNullable<SpecialistStep3['competencies']>[number]['level'] })),
    autonomy_code: d.autonomy.find(r => r.professional_role_code === role)?.autonomy_code ?? null,
    development_areas: d.development.filter(r => r.professional_role_code === role).map(r => r.area_code),
    custom_competencies: role === 'other_veterinary_specialty' ? d.custom.map(r => ({ name: r.name, level: r.level as NonNullable<SpecialistStep3['custom_competencies']>[number]['level'] })) : [],
    custom_development: role === 'other_veterinary_specialty' ? d.customDevelopment.map(r => r.name) : [] };
}
/** Compare only the edited part; omitted keys preserve server state. */
export function changedPatch<T extends object>(before: T, after: T): Partial<T> {
  return Object.fromEntries(Object.entries(after).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(before[k as keyof T]))) as Partial<T>;
}
