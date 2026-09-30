import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { getActiveUser } from '@/lib/auth/session';
import { parseCompleteness, type ProfileBundle } from './view-model';

/** Owner-only projection. No private license number or privileged client enters this bundle. */
export async function readSpecialistProfile(): Promise<ProfileBundle | null> {
  const user = await getActiveUser();
  if (!user?.hasSpecialistProfile) return null;
  const c = await createClient();
  const [profile, education, animals, areas, interests, locations, workloads, schedules, languages, competencies, autonomy, development, custom, customDevelopment, completeness,
    roles, locationCatalog, experience, animalCatalog, areaCatalog, interestCatalog, roleInterests, search, workloadCatalog, scheduleCatalog, mobility, starts, models, languageCatalog, languageLevels, visibility, competencyCatalog, autonomyCatalog, developmentCatalog] = await Promise.all([
    c.from('specialist_profiles').select('*').eq('user_id', user.id).single(),
    c.from('specialist_education').select('*').eq('user_id', user.id), c.from('specialist_animal_groups').select('*').eq('user_id', user.id),
    c.from('specialist_activity_areas').select('*').eq('user_id', user.id), c.from('specialist_interests').select('*').eq('user_id', user.id),
    c.from('specialist_work_locations').select('*').eq('user_id', user.id), c.from('specialist_workloads').select('*').eq('user_id', user.id),
    c.from('specialist_schedules').select('*').eq('user_id', user.id), c.from('specialist_languages').select('*').eq('user_id', user.id),
    c.from('specialist_competencies').select('*').eq('user_id', user.id), c.from('specialist_autonomy').select('*').eq('user_id', user.id),
    c.from('specialist_development_areas').select('*').eq('user_id', user.id), c.from('specialist_custom_competencies').select('*').eq('user_id', user.id).order('slot'),
    c.from('specialist_custom_development').select('*').eq('user_id', user.id), c.rpc('profile_completeness'),
    c.from('professional_roles').select('*').eq('is_active', true).order('sort_order'), c.from('locations').select('*').eq('is_active', true).order('label_lt'),
    c.from('experience_bands').select('*').eq('is_active', true).order('sort_order'), c.from('animal_groups').select('*').eq('is_active', true).order('sort_order'),
    c.from('activity_areas').select('*').eq('is_active', true).order('sort_order'), c.from('professional_interests').select('*').eq('is_active', true).order('sort_order'),
    c.from('professional_role_interests').select('*'), c.from('job_search_statuses').select('*').eq('is_active', true).order('sort_order'),
    c.from('workloads').select('*').eq('is_active', true).order('sort_order'), c.from('schedules').select('*').eq('is_active', true).order('sort_order'),
    c.from('mobility_options').select('*').eq('is_active', true).order('sort_order'), c.from('start_options').select('*').eq('is_active', true).order('sort_order'),
    c.from('work_models').select('*').eq('is_active', true).order('sort_order'), c.from('languages').select('*').eq('is_active', true).order('sort_order'),
    c.from('language_levels').select('*').eq('is_active', true).order('sort_order'), c.from('visibility_options').select('*').eq('is_active', true).order('sort_order'),
    c.from('competencies').select('*').eq('is_active', true).order('sort_order'), c.from('autonomy_options').select('*').eq('is_active', true), c.from('development_areas').select('*').eq('is_active', true),
  ]);
  const required = [profile, education, animals, areas, interests, locations, workloads, schedules, languages, competencies, autonomy, development, custom, customDevelopment,
    roles, locationCatalog, experience, animalCatalog, areaCatalog, interestCatalog, roleInterests, search, workloadCatalog, scheduleCatalog, mobility, starts, models, languageCatalog, languageLevels, visibility, competencyCatalog, autonomyCatalog, developmentCatalog];
  if (!profile.data || required.some(r => r.error)) throw new Error('Profile read unavailable');
  return { data: { profile: profile.data, education: education.data!, animals: animals.data!, areas: areas.data!, interests: interests.data!, locations: locations.data!, workloads: workloads.data!, schedules: schedules.data!, languages: languages.data!, competencies: competencies.data!, autonomy: autonomy.data!, development: development.data!, custom: custom.data!, customDevelopment: customDevelopment.data!, completeness: completeness.error ? null : parseCompleteness(completeness.data) },
    catalogs: { roles: roles.data!, locations: locationCatalog.data!, experience: experience.data!, animals: animalCatalog.data!, areas: areaCatalog.data!, interests: interestCatalog.data!, roleInterests: roleInterests.data!, search: search.data!, workloads: workloadCatalog.data!, schedules: scheduleCatalog.data!, mobility: mobility.data!, starts: starts.data!, models: models.data!, languages: languageCatalog.data!, languageLevels: languageLevels.data!, visibility: visibility.data!, competencies: competencyCatalog.data!, autonomy: autonomyCatalog.data!, development: developmentCatalog.data! } };
}
