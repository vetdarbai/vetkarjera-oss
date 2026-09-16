import catalogs from './catalogs.json';

export type ProfessionalRole = 'veterinarian' | 'veterinary_student' | 'veterinary_assistant' | 'veterinary_pharmacy' | 'animal_health_commerce' | 'other_veterinary_specialty';
export type SpecialistStep1 = { first_name: string; last_name: string; professional_role_code: ProfessionalRole; specialty_free_text?: string | null };
export type EmployerStep1 = { organization_name_input: string; organization_type_code: string; organization_type_other?: string | null };
export type Education = {
  institution_code?: 'lsmu' | 'other' | null; institution_name?: string | null;
  country?: string | null; program_or_qualification?: string | null;
  graduation_year?: number | null; current_course?: number | null; current_course_or_study_year?: string | null;
};
export type SpecialistStep2 = {
  home_location_code: string; home_country?: string | null; home_city?: string | null;
  experience_band_code: string; about_me?: string | null;
  job_search_status_code: 'actively_looking' | 'open_to_offers' | 'not_looking';
  mobility_code?: string | null; start_option_code: string; start_date?: string | null;
  work_model_code?: 'on_site' | 'hybrid' | 'remote' | null;
  can_work_weekends?: boolean | null; can_work_nights?: boolean | null; can_be_on_call?: boolean | null;
  profile_visibility: 'registered_employers' | 'application_only' | 'hidden';
  animal_groups: string[]; activity_areas: string[]; interests?: string[];
  work_locations: string[]; workloads: string[]; schedules?: string[];
  languages: { language_code: string; proficiency_code: string; language_name?: string | null }[];
};
export type StandardLevel = 'with_assistance' | 'independent' | 'can_teach';
export type StudentLevel = 'theory_only' | 'with_assistance' | 'supervised_confident';
export type SpecialistStep3 = {
  competencies?: { competency_code: string; level: StandardLevel | StudentLevel | null }[];
  autonomy_code?: string | null; development_areas?: string[];
  custom_competencies?: { name: string; level: StandardLevel }[]; custom_development?: string[];
};
export type AccountCapabilities = { id: string; hasSpecialistProfile: boolean; hasEmployerProfile: boolean; isAdmin: boolean };
export type Completeness = { step1: number; step2: number; step3: number; total: number; applicableCompetencies?: number; filledCompetencies?: number };
export type ProfileResult<T = undefined> = { ok: true; data?: T } | { ok: false; message: string };

export function parseCapabilities(value: unknown): AccountCapabilities | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.hasSpecialistProfile !== 'boolean' || typeof v.hasEmployerProfile !== 'boolean' || typeof v.isAdmin !== 'boolean') return null;
  return { id: v.id, hasSpecialistProfile: v.hasSpecialistProfile, hasEmployerProfile: v.hasEmployerProfile, isAdmin: v.isAdmin };
}

/** Size check is defense in depth; RPC enforces unknown fields and database constraints. */
export function validPayload(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  try { return JSON.stringify(value).length <= 32_000; } catch { return false; }
}

/** Only an allowlisted non-privileged signup choice is copied to Auth metadata. */
export function registrationProfile(kind: unknown, value: unknown): Record<string, string | number | null> | null {
  if (!validPayload(value)) return null;
  const v = value as Record<string, unknown>;
  const text = (key: string, limit: number) => typeof v[key] === 'string' && (v[key] as string).trim().length > 0 && (v[key] as string).trim().length <= limit;
  if (kind === 'specialist') {
    if (!text('first_name', 100) || !text('last_name', 100) || !catalogs.catalogs.professional_roles.some(([code]) => code === v.professional_role_code) || (v.professional_role_code === 'other_veterinary_specialty' && !text('specialty_free_text', 200))) return null;
    if (Object.keys(v).some(key => !['first_name','last_name','professional_role_code','specialty_free_text'].includes(key))) return null;
    return { profile_contract_version: 2, account_role: kind, first_name: (v.first_name as string).trim(), last_name: (v.last_name as string).trim(), professional_role_code: v.professional_role_code as string, specialty_free_text: text('specialty_free_text', 200) ? (v.specialty_free_text as string).trim() : null };
  }
  if (kind === 'employer') {
    if (!text('organization_name_input', 200) || !catalogs.catalogs.organization_types.some(([code]) => code === v.organization_type_code) || (v.organization_type_code === 'other' && !text('organization_type_other', 200))) return null;
    if (Object.keys(v).some(key => !['organization_name_input','organization_type_code','organization_type_other'].includes(key))) return null;
    return { profile_contract_version: 2, account_role: kind, organization_name_input: (v.organization_name_input as string).trim(), organization_type_code: v.organization_type_code as string, organization_type_other: text('organization_type_other', 200) ? (v.organization_type_other as string).trim() : null };
  }
  return null;
}
