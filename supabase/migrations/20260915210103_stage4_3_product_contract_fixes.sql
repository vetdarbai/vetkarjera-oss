-- CEO approved Stage 4.3 product-contract corrections. No production application authorized.
begin;
set local lock_timeout='5s';

insert into public.autonomy_options(professional_role_code,code,label_lt) values
('veterinary_assistant','frequent_supervision','Reikalinga dažna priežiūra'),
('veterinary_assistant','minimal_help','Daugumą užduočių atlieku su minimalia pagalba'),
('veterinary_assistant','independent','Daugumą įprastų užduočių atlieku savarankiškai'),
('veterinary_assistant','can_train','Galiu apmokyti kitus komandos narius'),
('other_veterinary_specialty','frequent_help','Reikalinga dažnesnė kolegų pagalba'),
('other_veterinary_specialty','independent','Daugumą įprastų užduočių atlieku savarankiškai'),
('other_veterinary_specialty','complex_independent','Savarankiškai sprendžiu ir sudėtingesnes užduotis'),
('other_veterinary_specialty','mentor','Galiu konsultuoti / mokyti kitus');

insert into public.development_areas(professional_role_code,code,label_lt) values
('veterinary_assistant','inpatient_care','Stacionaro priežiūra'),
('veterinary_assistant','anesthesia','Anestezija'),
('veterinary_assistant','surgical_assistance','Operacinė / chirurginis asistavimas'),
('veterinary_assistant','laboratory','Laboratorija'),
('veterinary_assistant','diagnostic_procedures','Diagnostikos procedūros'),
('veterinary_assistant','client_communication','Klientų komunikacija'),
('veterinary_assistant','emergency','Skubi pagalba'),
('veterinary_assistant','other','Kita'),
('veterinary_pharmacy','veterinary_medicines','Veterinarinių vaistų žinios'),
('veterinary_pharmacy','antiparasitics','Antiparazitiniai preparatai'),
('veterinary_pharmacy','dermatology_products','Dermatologijos produktai'),
('veterinary_pharmacy','nutrition_supplements','Gyvūnų mityba / papildai'),
('veterinary_pharmacy','pharmacovigilance','Farmakologinis budrumas'),
('veterinary_pharmacy','pharmacy_processes','Vaistinės procesai ir dokumentacija'),
('veterinary_pharmacy','client_consulting','Klientų konsultavimas'),
('veterinary_pharmacy','sales_commerce','Pardavimai / komercija'),
('veterinary_pharmacy','other','Kita'),
('animal_health_commerce','b2b_sales','B2B pardavimai'),
('animal_health_commerce','negotiation','Derybos'),
('animal_health_commerce','key_account_management','Key Account Management'),
('animal_health_commerce','technical_products','Veterinarinių produktų techninės žinios'),
('animal_health_commerce','presentations','Prezentacijos / viešas kalbėjimas'),
('animal_health_commerce','training','Mokymų vedimas'),
('animal_health_commerce','market_analysis','Rinkos analizė'),
('animal_health_commerce','clinic_clients','Darbas su klinikomis'),
('animal_health_commerce','farm_clients','Darbas su ūkiais'),
('animal_health_commerce','team_management','Vadovavimas / komandos valdymas'),
('animal_health_commerce','other','Kita');

create or replace function private.save_specialist_step2(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_active(); profession text; item jsonb; begin
 perform private.require_keys(payload,array['home_location_code','home_country','home_city','experience_band_code','about_me','job_search_status_code','mobility_code','start_option_code','start_date','work_model_code','can_work_weekends','can_work_nights','can_be_on_call','profile_visibility','animal_groups','activity_areas','work_locations','workloads','schedules','interests','languages']);
 select professional_role_code into profession from public.specialist_profiles where user_id=uid for update;
 if profession is null then raise exception 'Complete STEP 1 first' using errcode='22023'; end if;
 if not exists(select 1 from public.locations where code=payload->>'home_location_code' and kind<>'nationwide' and is_active) or
 not exists(select 1 from public.experience_bands where code=payload->>'experience_band_code' and is_active) or
 not exists(select 1 from public.job_search_statuses where code=payload->>'job_search_status_code' and is_active) or
 not exists(select 1 from public.start_options where code=payload->>'start_option_code' and is_active) or
 not exists(select 1 from public.visibility_options where code=payload->>'profile_visibility' and is_active) then
 raise exception 'Required STEP 2 fields missing' using errcode='22023'; end if;
 if profession in ('veterinarian','veterinary_student','veterinary_pharmacy') and not exists(select 1 from public.specialist_education where user_id=uid and professional_role_code=profession) then raise exception 'Education required' using errcode='22023'; end if;
 if profession='veterinarian' and not exists(select 1 from private.specialist_licenses where user_id=uid) then raise exception 'License number required' using errcode='22023'; end if;

if payload ? 'animal_groups' and jsonb_typeof(payload->'animal_groups')<>'array' then raise exception 'Expected selection array' using errcode='22023'; end if;
if coalesce(jsonb_array_length(payload->'animal_groups'),0)=0 then raise exception 'Required animal_groups selection missing' using errcode='22023'; end if;
delete from public.specialist_animal_groups where user_id=uid; for item in select value from jsonb_array_elements(coalesce(payload->'animal_groups','[]')) loop
 if jsonb_typeof(item)<>'string' or not exists(select 1 from public.animal_groups where code=item#>>'{}' and is_active) then raise exception 'Invalid selection' using errcode='22023'; end if; insert into public.specialist_animal_groups(user_id,animal_group_code) values(uid,item#>>'{}'); end loop;
if payload ? 'activity_areas' and jsonb_typeof(payload->'activity_areas')<>'array' then raise exception 'Expected selection array' using errcode='22023'; end if;
if coalesce(jsonb_array_length(payload->'activity_areas'),0)=0 then raise exception 'Required activity_areas selection missing' using errcode='22023'; end if;
delete from public.specialist_activity_areas where user_id=uid; for item in select value from jsonb_array_elements(coalesce(payload->'activity_areas','[]')) loop
 if jsonb_typeof(item)<>'string' or not exists(select 1 from public.activity_areas where code=item#>>'{}' and is_active) then raise exception 'Invalid selection' using errcode='22023'; end if; insert into public.specialist_activity_areas(user_id,activity_area_code) values(uid,item#>>'{}'); end loop;
if payload ? 'work_locations' and jsonb_typeof(payload->'work_locations')<>'array' then raise exception 'Expected selection array' using errcode='22023'; end if;
if coalesce(jsonb_array_length(payload->'work_locations'),0)=0 then raise exception 'Required selection missing' using errcode='22023'; end if;
delete from public.specialist_work_locations where user_id=uid; for item in select value from jsonb_array_elements(coalesce(payload->'work_locations','[]')) loop
 if jsonb_typeof(item)<>'string' or not exists(select 1 from public.locations where code=item#>>'{}' and is_active and kind<>'abroad') then raise exception 'Invalid selection' using errcode='22023'; end if; insert into public.specialist_work_locations(user_id,location_code) values(uid,item#>>'{}'); end loop;
if payload ? 'workloads' and jsonb_typeof(payload->'workloads')<>'array' then raise exception 'Expected selection array' using errcode='22023'; end if;
if coalesce(jsonb_array_length(payload->'workloads'),0)=0 then raise exception 'Required selection missing' using errcode='22023'; end if;
delete from public.specialist_workloads where user_id=uid; for item in select value from jsonb_array_elements(coalesce(payload->'workloads','[]')) loop
 if jsonb_typeof(item)<>'string' or not exists(select 1 from public.workloads where code=item#>>'{}' and is_active) then raise exception 'Invalid selection' using errcode='22023'; end if; insert into public.specialist_workloads(user_id,workload_code) values(uid,item#>>'{}'); end loop;
if payload ? 'schedules' and jsonb_typeof(payload->'schedules')<>'array' then raise exception 'Expected selection array' using errcode='22023'; end if;
delete from public.specialist_schedules where user_id=uid; for item in select value from jsonb_array_elements(coalesce(payload->'schedules','[]')) loop
 if jsonb_typeof(item)<>'string' or not exists(select 1 from public.schedules where code=item#>>'{}' and is_active) then raise exception 'Invalid selection' using errcode='22023'; end if; insert into public.specialist_schedules(user_id,schedule_code) values(uid,item#>>'{}'); end loop;
if coalesce(jsonb_typeof(payload->'languages'),'null')<>'array' or jsonb_array_length(payload->'languages')=0 then raise exception 'Languages required' using errcode='22023'; end if;
 delete from public.specialist_languages where user_id=uid;
 for item in select value from jsonb_array_elements(payload->'languages') loop
 perform private.require_keys(item,array['language_code','proficiency_code','language_name']);
 insert into public.specialist_languages(user_id,language_code,proficiency_code,language_name)
 values(uid,item->>'language_code',item->>'proficiency_code',nullif(btrim(item->>'language_name'),'')); end loop;
 delete from public.specialist_interests where user_id=uid and professional_role_code=profession;
 for item in select value from jsonb_array_elements(coalesce(payload->'interests','[]')) loop
 insert into public.specialist_interests(user_id,professional_role_code,interest_code) values(uid,profession,item#>>'{}'); end loop;

if payload ? 'can_work_weekends' and jsonb_typeof(payload->'can_work_weekends') not in ('boolean','null') then raise exception 'Expected tri-state boolean' using errcode='22023'; end if;
if payload ? 'can_work_nights' and jsonb_typeof(payload->'can_work_nights') not in ('boolean','null') then raise exception 'Expected tri-state boolean' using errcode='22023'; end if;
if payload ? 'can_be_on_call' and jsonb_typeof(payload->'can_be_on_call') not in ('boolean','null') then raise exception 'Expected tri-state boolean' using errcode='22023'; end if;
update public.specialist_profiles set home_location_code=payload->>'home_location_code',home_country=nullif(btrim(payload->>'home_country'),''),home_city=nullif(btrim(payload->>'home_city'),''),experience_band_code=payload->>'experience_band_code',about_me=payload->>'about_me',job_search_status_code=payload->>'job_search_status_code',mobility_code=payload->>'mobility_code',start_option_code=payload->>'start_option_code',start_date=(payload->>'start_date')::date,work_model_code=payload->>'work_model_code',can_work_weekends=(payload->>'can_work_weekends')::boolean,can_work_nights=(payload->>'can_work_nights')::boolean,can_be_on_call=(payload->>'can_be_on_call')::boolean,profile_visibility=payload->>'profile_visibility' where user_id=uid; end $$;

create or replace function private.profile_completeness() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.require_active(); p public.specialist_profiles; step1 boolean; step2 boolean; applicable integer; filled integer; step3 numeric; begin
 select * into p from public.specialist_profiles where user_id=uid;
 if not found then return jsonb_build_object('step1',0,'step2',0,'step3',0,'total',0); end if;
 step1:=private.valid_text(p.first_name,100) and private.valid_text(p.last_name,100) and p.professional_role_code is not null
  and (p.professional_role_code<>'other_veterinary_specialty' or private.valid_text(p.specialty_free_text,200));
 step2:= p.home_location_code is not null and p.experience_band_code is not null and p.job_search_status_code is not null
 and p.start_option_code is not null and p.profile_visibility is not null
 and exists(select 1 from public.specialist_animal_groups where user_id=uid)
 and exists(select 1 from public.specialist_activity_areas where user_id=uid)
 and exists(select 1 from public.specialist_work_locations where user_id=uid)
 and exists(select 1 from public.specialist_workloads where user_id=uid)
 and exists(select 1 from public.specialist_languages where user_id=uid)
 and (p.professional_role_code not in ('veterinarian','veterinary_student','veterinary_pharmacy') or exists(select 1 from public.specialist_education where user_id=uid and professional_role_code=p.professional_role_code))
 and (p.professional_role_code<>'veterinarian' or exists(select 1 from private.specialist_licenses where user_id=uid));
 if p.professional_role_code='other_veterinary_specialty' then
  applicable:=3; select count(*) into filled from public.specialist_custom_competencies where user_id=uid;
 else
  select count(*) into applicable from public.competencies where professional_role_code=p.professional_role_code and is_active;
  select count(*) into filled from public.specialist_competencies sc join public.competencies c on c.professional_role_code=sc.professional_role_code and c.code=sc.competency_code
   where sc.user_id=uid and sc.professional_role_code=p.professional_role_code and c.is_active;
 end if;
 step3:=case when applicable>0 then least(30,round(30.0*filled/applicable,2)) else 0 end;
 return jsonb_build_object('step1',case when step1 then 20 else 0 end,'step2',case when step2 then 50 else 0 end,'step3',step3,
 'total',(case when step1 then 20 else 0 end)+(case when step2 then 50 else 0 end)+step3,'applicableCompetencies',applicable,'filledCompetencies',filled);
end $$;

-- Existing function owners, restricted grants and invoker API wrappers are preserved.
-- No autonomy options are added for student, pharmacy or commerce.
commit;
