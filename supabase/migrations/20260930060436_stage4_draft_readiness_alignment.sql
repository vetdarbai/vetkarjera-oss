-- Stage 4 alignment: partial drafts; CEO-approved readiness dependency.
-- Local QA only until separately authorized for production.
begin;
set local lock_timeout='5s';
grant vetkarjera_profile_writer to current_user with inherit true;
grant vetkarjera_profile_writer to current_user with set true;
grant create on schema private to vetkarjera_profile_writer;

alter table public.specialist_profiles drop constraint specialist_other_text;
alter table public.specialist_profiles drop constraint specialist_home;
alter table public.specialist_profiles add constraint specialist_home check(home_location_code is distinct from 'nationwide');
alter table public.specialist_profiles drop constraint specialist_start;
-- Incomplete dates/country/city are retained as draft. Readiness checks their context.
alter table public.specialist_education drop constraint education_shape;
alter table public.specialist_languages alter column proficiency_code drop not null;
alter table public.specialist_languages drop constraint specialist_languages_check;

create or replace function private.save_specialist_step1(payload jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_active(); p public.specialist_profiles; patch jsonb;
begin
 perform private.require_keys(payload,array['first_name','last_name','professional_role_code','specialty_free_text']);
 select * into p from public.specialist_profiles where user_id=uid for update;
 if not found then raise exception 'Specialist profile required' using errcode='22023'; end if;
 select coalesce(jsonb_object_agg(key,case when jsonb_typeof(value)='string' then to_jsonb(nullif(btrim(value#>>'{}'),'')) else value end),'{}') into patch from jsonb_each(payload);
 p:=jsonb_populate_record(p,patch);
 if p.professional_role_code is not null and not exists(select 1 from public.professional_roles where code=p.professional_role_code and is_active) then raise exception 'Invalid profession' using errcode='22023'; end if;
 update public.specialist_profiles set first_name=p.first_name,last_name=p.last_name,professional_role_code=p.professional_role_code,specialty_free_text=p.specialty_free_text where user_id=uid;
end $$;

-- Preserve strict second-profile creation independently of draft saves.
create or replace function private.create_second_profile(kind text,payload jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_active();
begin
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if kind='specialist' then
  if not exists(select 1 from public.specialist_profiles where user_id=uid) then
   perform private.require_keys(payload,array['first_name','last_name','professional_role_code','specialty_free_text']);
   if not private.valid_text(payload->>'first_name',100) or not private.valid_text(payload->>'last_name',100)
     or not exists(select 1 from public.professional_roles where code=payload->>'professional_role_code' and is_active)
     or (payload->>'professional_role_code'='other_veterinary_specialty' and not private.valid_text(payload->>'specialty_free_text',200))
   then raise exception 'Invalid specialist creation fields' using errcode='22023'; end if;
   insert into public.specialist_profiles(user_id) values(uid);
   perform private.save_specialist_step1(payload);
  end if;
 elsif kind='employer' then
  if not exists(select 1 from public.employer_profiles where user_id=uid) then perform private.save_employer_step1(payload); end if;
 else raise exception 'Invalid profile kind' using errcode='22023';
 end if;
end $$;

create or replace function private.save_specialist_step2(payload jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_active(); p public.specialist_profiles; patch jsonb; item jsonb;
begin
 perform private.require_keys(payload,array['home_location_code','home_country','home_city','experience_band_code','about_me','job_search_status_code','mobility_code','start_option_code','start_date','work_model_code','can_work_weekends','can_work_nights','can_be_on_call','profile_visibility','animal_groups','activity_areas','work_locations','workloads','schedules','interests','languages']);
 select * into p from public.specialist_profiles where user_id=uid for update;
 if not found then raise exception 'Specialist profile required' using errcode='22023'; end if;
 select coalesce(jsonb_object_agg(key,case when jsonb_typeof(value)='string' then to_jsonb(nullif(btrim(value#>>'{}'),'')) else value end),'{}') into patch
 from jsonb_each(payload) where key=any(array['home_location_code','home_country','home_city','experience_band_code','about_me','job_search_status_code','mobility_code','start_option_code','start_date','work_model_code','can_work_weekends','can_work_nights','can_be_on_call','profile_visibility']);
 p:=jsonb_populate_record(p,patch);
 if payload ? 'home_location_code' and p.home_location_code is not null and not exists(select 1 from public.locations where code=p.home_location_code and is_active) then raise exception 'Invalid home_location_code' using errcode='22023'; end if;
 if payload ? 'experience_band_code' and p.experience_band_code is not null and not exists(select 1 from public.experience_bands where code=p.experience_band_code and is_active) then raise exception 'Invalid experience_band_code' using errcode='22023'; end if;
 if payload ? 'job_search_status_code' and p.job_search_status_code is not null and not exists(select 1 from public.job_search_statuses where code=p.job_search_status_code and is_active) then raise exception 'Invalid job_search_status_code' using errcode='22023'; end if;
 if payload ? 'mobility_code' and p.mobility_code is not null and not exists(select 1 from public.mobility_options where code=p.mobility_code and is_active) then raise exception 'Invalid mobility_code' using errcode='22023'; end if;
 if payload ? 'start_option_code' and p.start_option_code is not null and not exists(select 1 from public.start_options where code=p.start_option_code and is_active) then raise exception 'Invalid start_option_code' using errcode='22023'; end if;
 if payload ? 'work_model_code' and p.work_model_code is not null and not exists(select 1 from public.work_models where code=p.work_model_code and is_active) then raise exception 'Invalid work_model_code' using errcode='22023'; end if;
 if payload ? 'profile_visibility' and p.profile_visibility is not null and not exists(select 1 from public.visibility_options where code=p.profile_visibility and is_active) then raise exception 'Invalid profile_visibility' using errcode='22023'; end if;

 if payload ? 'animal_groups' then
  delete from public.specialist_animal_groups where user_id=uid;
  for item in select value from jsonb_array_elements(payload->'animal_groups') loop
   if jsonb_typeof(item)<>'string' or not exists(select 1 from public.animal_groups where code=item#>>'{}' and is_active) then raise exception 'Invalid animal_groups' using errcode='22023'; end if;
   insert into public.specialist_animal_groups(user_id,animal_group_code) values(uid,item#>>'{}');
  end loop;
 end if;

 if payload ? 'activity_areas' then
  delete from public.specialist_activity_areas where user_id=uid;
  for item in select value from jsonb_array_elements(payload->'activity_areas') loop
   if jsonb_typeof(item)<>'string' or not exists(select 1 from public.activity_areas where code=item#>>'{}' and is_active) then raise exception 'Invalid activity_areas' using errcode='22023'; end if;
   insert into public.specialist_activity_areas(user_id,activity_area_code) values(uid,item#>>'{}');
  end loop;
 end if;

 if payload ? 'work_locations' then
  delete from public.specialist_work_locations where user_id=uid;
  for item in select value from jsonb_array_elements(payload->'work_locations') loop
   if jsonb_typeof(item)<>'string' or not exists(select 1 from public.locations where code=item#>>'{}' and is_active and kind<>'abroad') then raise exception 'Invalid work_locations' using errcode='22023'; end if;
   insert into public.specialist_work_locations(user_id,location_code) values(uid,item#>>'{}');
  end loop;
 end if;

 if payload ? 'workloads' then
  delete from public.specialist_workloads where user_id=uid;
  for item in select value from jsonb_array_elements(payload->'workloads') loop
   if jsonb_typeof(item)<>'string' or not exists(select 1 from public.workloads where code=item#>>'{}' and is_active) then raise exception 'Invalid workloads' using errcode='22023'; end if;
   insert into public.specialist_workloads(user_id,workload_code) values(uid,item#>>'{}');
  end loop;
 end if;

 if payload ? 'schedules' then
  delete from public.specialist_schedules where user_id=uid;
  for item in select value from jsonb_array_elements(payload->'schedules') loop
   if jsonb_typeof(item)<>'string' or not exists(select 1 from public.schedules where code=item#>>'{}' and is_active) then raise exception 'Invalid schedules' using errcode='22023'; end if;
   insert into public.specialist_schedules(user_id,schedule_code) values(uid,item#>>'{}');
  end loop;
 end if;
 if payload ? 'languages' then
  delete from public.specialist_languages where user_id=uid;
  for item in select value from jsonb_array_elements(payload->'languages') loop
   perform private.require_keys(item,array['language_code','proficiency_code','language_name']);
   if not exists(select 1 from public.languages where code=item->>'language_code' and is_active)
     or (item->>'proficiency_code' is not null and not exists(select 1 from public.language_levels where code=item->>'proficiency_code' and is_active))
   then raise exception 'Invalid language' using errcode='22023'; end if;
   insert into public.specialist_languages(user_id,language_code,proficiency_code,language_name)
   values(uid,item->>'language_code',item->>'proficiency_code',nullif(btrim(item->>'language_name'),''));
  end loop;
 end if;
 if payload ? 'interests' then
  if p.professional_role_code is null and jsonb_array_length(payload->'interests')>0 then raise exception 'Profession context required for interests' using errcode='22023'; end if;
  delete from public.specialist_interests where user_id=uid and professional_role_code=p.professional_role_code;
  for item in select value from jsonb_array_elements(payload->'interests') loop
   if jsonb_typeof(item)<>'string' or not exists(select 1 from public.professional_interests where code=item#>>'{}' and is_active) then raise exception 'Invalid interest' using errcode='22023'; end if;
   insert into public.specialist_interests(user_id,professional_role_code,interest_code) values(uid,p.professional_role_code,item#>>'{}');
  end loop;
 end if;
 update public.specialist_profiles set home_location_code=p.home_location_code,home_country=p.home_country,home_city=p.home_city,experience_band_code=p.experience_band_code,about_me=p.about_me,job_search_status_code=p.job_search_status_code,mobility_code=p.mobility_code,start_option_code=p.start_option_code,start_date=p.start_date,work_model_code=p.work_model_code,can_work_weekends=p.can_work_weekends,can_work_nights=p.can_work_nights,can_be_on_call=p.can_be_on_call,profile_visibility=p.profile_visibility where user_id=uid;
end $$;

create or replace function private.save_education(payload jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_active(); profession text; e public.specialist_education; patch jsonb;
begin
 perform private.require_keys(payload,array['institution_code','institution_name','country','program_or_qualification','graduation_year','current_course','current_course_or_study_year']);
 select professional_role_code into profession from public.specialist_profiles where user_id=uid for update;
 if profession is null then raise exception 'Profession context required for education' using errcode='22023'; end if;
 select * into e from public.specialist_education where user_id=uid and professional_role_code=profession;
 select coalesce(jsonb_object_agg(key,case when jsonb_typeof(value)='string' then to_jsonb(nullif(btrim(value#>>'{}'),'')) else value end),'{}') into patch from jsonb_each(payload);
 e:=jsonb_populate_record(e,patch);
 if e.institution_code='lsmu' then e.program_or_qualification:='veterinary_medicine'; end if;
 if profession not in ('veterinarian','veterinary_student') and e.institution_code is not null then raise exception 'Invalid education institution context' using errcode='22023'; end if;
 insert into public.specialist_education(user_id,professional_role_code,institution_code,institution_name,country,program_or_qualification,graduation_year,current_course,current_course_or_study_year)
 values(uid,profession,e.institution_code,e.institution_name,e.country,e.program_or_qualification,e.graduation_year,e.current_course,e.current_course_or_study_year)
 on conflict(user_id,professional_role_code) do update set institution_code=excluded.institution_code,institution_name=excluded.institution_name,country=excluded.country,program_or_qualification=excluded.program_or_qualification,graduation_year=excluded.graduation_year,current_course=excluded.current_course,current_course_or_study_year=excluded.current_course_or_study_year,updated_at=now();
end $$;

create function private.profile_required_state() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare uid uuid:=private.require_active(); p public.specialist_profiles; e public.specialist_education; missing jsonb; s1 boolean; s2 boolean;
begin
 select * into p from public.specialist_profiles where user_id=uid;
 select * into e from public.specialist_education where user_id=uid and professional_role_code=p.professional_role_code;
 select coalesce(jsonb_agg(jsonb_build_object('field',field,'step',step,'reason','required') order by step,field),'[]') into missing
 from (values
 ('first_name',1,not private.valid_text(p.first_name,100)),
 ('last_name',1,not private.valid_text(p.last_name,100)),
 ('professional_role_code',1,p.professional_role_code is null),
 ('specialty_free_text',1,p.professional_role_code='other_veterinary_specialty' and not private.valid_text(p.specialty_free_text,200)),
 ('home_location_code',2,p.home_location_code is null),
 ('home_country',2,p.home_location_code='abroad' and not private.valid_text(p.home_country,100)),
 ('home_city',2,p.home_location_code='abroad' and not private.valid_text(p.home_city,100)),
 ('experience_band_code',2,p.experience_band_code is null),
 ('job_search_status_code',2,p.job_search_status_code is null),
 ('start_option_code',2,p.start_option_code is null),
 ('start_date',2,p.start_option_code='specific_date' and p.start_date is null),
 ('profile_visibility',2,p.profile_visibility is null),
 ('animal_groups',2,not exists(select 1 from public.specialist_animal_groups where user_id=uid)),
 ('activity_areas',2,not exists(select 1 from public.specialist_activity_areas where user_id=uid)),
 ('work_locations',2,not exists(select 1 from public.specialist_work_locations where user_id=uid)),
 ('workloads',2,not exists(select 1 from public.specialist_workloads where user_id=uid)),
 ('languages',2,not exists(select 1 from public.specialist_languages where user_id=uid)),
 ('languages.proficiency_code',2,exists(select 1 from public.specialist_languages where user_id=uid and proficiency_code is null)),
 ('languages.language_name',2,exists(select 1 from public.specialist_languages where user_id=uid and language_code='other' and not private.valid_text(language_name,100))),
 ('education.institution_code',2,p.professional_role_code in ('veterinarian','veterinary_student') and e.institution_code is null),
 ('education.institution_name',2,(p.professional_role_code='veterinary_pharmacy' or (p.professional_role_code in ('veterinarian','veterinary_student') and e.institution_code='other')) and not private.valid_text(e.institution_name,200)),
 ('education.country',2,p.professional_role_code in ('veterinarian','veterinary_student') and e.institution_code='other' and not private.valid_text(e.country,100)),
 ('education.program_or_qualification',2,(p.professional_role_code='veterinary_pharmacy' or (p.professional_role_code in ('veterinarian','veterinary_student') and e.institution_code='other')) and not private.valid_text(e.program_or_qualification,200)),
 ('education.current_course',2,p.professional_role_code='veterinary_student' and e.institution_code='lsmu' and e.current_course is null),
 ('education.current_course_or_study_year',2,p.professional_role_code='veterinary_student' and e.institution_code='other' and not private.valid_text(e.current_course_or_study_year,100)),
 ('license_number',2,p.professional_role_code='veterinarian' and not exists(select 1 from private.specialist_licenses where user_id=uid))
 ) requirements(field,step,is_missing) where is_missing;
 s1:=not exists(select 1 from jsonb_array_elements(missing) m where m->>'step'='1');
 s2:=p.professional_role_code is not null and not exists(select 1 from jsonb_array_elements(missing) m where m->>'step'='2');
 return jsonb_build_object('step1Complete',s1,'step2Complete',s2,'missingRequired',missing);
end $$;
alter function private.profile_required_state() owner to vetkarjera_profile_writer;
revoke all on function private.profile_required_state() from public,anon,authenticated;

create or replace function private.profile_completeness() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.require_active(); p public.specialist_profiles; state jsonb; s1 boolean; s2 boolean; applicable integer; filled integer; step3 numeric; total numeric;
begin
 select * into p from public.specialist_profiles where user_id=uid;
 state:=private.profile_required_state(); s1:=(state->>'step1Complete')::boolean; s2:=(state->>'step2Complete')::boolean;
 if p.professional_role_code='other_veterinary_specialty' then
  applicable:=3; select count(*) into filled from public.specialist_custom_competencies where user_id=uid;
 else
  select count(*) into applicable from public.competencies where professional_role_code=p.professional_role_code and is_active;
  select count(*) into filled from public.specialist_competencies sc join public.competencies c on c.professional_role_code=sc.professional_role_code and c.code=sc.competency_code
   where sc.user_id=uid and sc.professional_role_code=p.professional_role_code and c.is_active;
 end if;
 step3:=case when applicable>0 then least(30,round(30.0*filled/applicable,2)) else 0 end;
 total:=(case when s1 then 20 else 0 end)+(case when s1 and s2 then 50 else 0 end)+step3;
 return state || jsonb_build_object('step1',case when s1 then 20 else 0 end,'step2',case when s1 and s2 then 50 else 0 end,'step3',step3,'total',total,
 'applicableCompetencies',applicable,'filledCompetencies',filled,'readyToApply',total>=70,'readinessState',case when total=100 then 'complete' when total>=70 then 'ready' else 'not_ready' end,'contractVersion',2);
end $$;
revoke create on schema private from vetkarjera_profile_writer;
grant vetkarjera_profile_writer to current_user with inherit false;
grant vetkarjera_profile_writer to current_user with set false;
commit;
