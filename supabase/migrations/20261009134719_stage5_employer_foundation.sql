begin;
set local lock_timeout='5s';
-- Approved Stage 5.2 architecture. Expand only; never fabricate organizations
-- from employer shells. An unexpected nonempty legacy org needs a mapping review.
lock table public.organizations,public.organization_memberships in share row exclusive mode;
do $$ begin
 if exists(select 1 from public.organizations) or exists(select 1 from public.organization_memberships) then
  raise exception 'Stage5 requires reviewed empty organization baseline' using errcode='55000';
 end if;
end $$;

create role vetkarjera_organization_writer nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
create role vetkarjera_organization_reader nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
grant vetkarjera_organization_writer,vetkarjera_organization_reader to postgres with inherit true,set true;
grant create on schema private to vetkarjera_organization_writer,vetkarjera_organization_reader;
grant usage on schema public,private to vetkarjera_organization_writer,vetkarjera_organization_reader;
grant execute on function private.has_active_session(),private.require_active(),private.is_admin()
 to vetkarjera_organization_writer,vetkarjera_organization_reader;
grant select on public.profiles,public.employer_profiles to vetkarjera_organization_writer,vetkarjera_organization_reader;
create policy organization_writer_profile on public.profiles for select to vetkarjera_organization_writer using(true);
create policy organization_reader_profile on public.profiles for select to vetkarjera_organization_reader using(true);
create policy organization_writer_shell on public.employer_profiles for select to vetkarjera_organization_writer using(true);
create policy organization_reader_shell on public.employer_profiles for select to vetkarjera_organization_reader using(true);

create function private.org_normalize(value text) returns text language sql immutable security invoker set search_path='' as $$
 select lower(translate(regexp_replace(normalize(btrim(value,E' \t\n\r'),NFC),'\s+',' ','g'),'ĄČĘĖĮŠŲŪŽ','ąčęėįšųūž'))
$$;

alter table public.organizations alter column name drop not null;
alter table public.organizations add column organization_type_code text references public.organization_types(code),
 add column organization_type_other text check(length(organization_type_other)<=200),
 add column description text check(length(description)<=1500),
 add column website text check(website is null or (length(website)<=2048 and website ~ '^https?://')),
 add column facebook_url text check(facebook_url is null or (length(facebook_url)<=2048 and facebook_url ~ '^https?://')),
 add column instagram_url text check(instagram_url is null or (length(instagram_url)<=2048 and instagram_url ~ '^https?://')),
 add column linkedin_url text check(linkedin_url is null or (length(linkedin_url)<=2048 and linkedin_url ~ '^https?://')),
 add column public_phone text check(length(public_phone)<=40),
 add column public_email text check(length(public_email)<=254),
 add column employee_size_code text,
 add column street_address text check(length(street_address)<=200),
 add constraint organization_name_length check(name is null or length(btrim(name)) between 1 and 200);
alter table public.organization_memberships drop constraint organization_memberships_user_id_fkey;
alter table public.organization_memberships add foreign key(user_id) references public.profiles(id) on delete cascade,
 add column role_code text not null default 'owner' check(role_code='owner');
create unique index organization_one_owner on public.organization_memberships(organization_id) where revoked_at is null;
-- jobs_membership_fkey and all jobs workflow remain unchanged.

create table public.organization_legal_forms(code text primary key,label_lt text not null,requires_organization_code boolean not null,sort_order smallint not null,is_active boolean not null default true);
create table public.organization_employee_size_ranges(code text primary key,label_lt text not null,sort_order smallint not null,is_active boolean not null default true);
alter table public.organizations add foreign key(employee_size_code) references public.organization_employee_size_ranges(code);
create table public.organization_locations(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
 city_name text not null check(length(btrim(city_name)) between 1 and 100),city_key text not null check(city_key=private.org_normalize(city_name)),
 municipality_code text references public.locations(code),sort_order integer not null default 0 check(sort_order>=0),
 created_at timestamptz not null default now(),unique(organization_id,city_key));
create index organization_locations_municipality_idx on public.organization_locations(municipality_code);
create table public.organization_slug_registry(
 slug text primary key check(length(slug) between 1 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 organization_id uuid not null references public.organizations(id) on delete restrict,is_current boolean not null,
 created_at timestamptz not null default now(),replaced_at timestamptz);
create unique index organization_current_slug on public.organization_slug_registry(organization_id) where is_current;
create index organization_slug_org_idx on public.organization_slug_registry(organization_id);
create table public.organization_benefit_options(code text primary key,label_lt text not null,sort_order smallint not null,is_active boolean not null default true);
create table public.organization_benefits(organization_id uuid references public.organizations(id) on delete restrict,
 benefit_code text references public.organization_benefit_options(code),primary key(organization_id,benefit_code));
create index organization_benefit_code_idx on public.organization_benefits(benefit_code);
create table public.organization_custom_benefits(id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,
 label text not null check(length(btrim(label)) between 1 and 120),sort_order integer not null default 0 check(sort_order>=0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create unique index organization_custom_benefit_unique on public.organization_custom_benefits(organization_id,private.org_normalize(label));

create table public.organization_attribute_groups(type_code text references public.organization_types(code),group_code text,
 label_lt text not null,value_kind text not null check(value_kind in ('choice','text')),selection_mode text not null default 'multi' check(selection_mode in ('single','multi')),
 allow_other boolean not null,sort_order smallint not null,is_active boolean not null default true,primary key(type_code,group_code));
create table public.organization_attribute_options(type_code text,group_code text,option_code text,label_lt text not null,
 sort_order smallint not null,is_active boolean not null default true,primary key(type_code,group_code,option_code),
 foreign key(type_code,group_code) references public.organization_attribute_groups(type_code,group_code));
create table public.organization_attribute_selections(organization_id uuid references public.organizations(id) on delete restrict,
 type_revision bigint check(type_revision>0),type_code text,group_code text,option_code text,
 primary key(organization_id,type_revision,type_code,group_code,option_code),
 foreign key(type_code,group_code,option_code) references public.organization_attribute_options(type_code,group_code,option_code));
create index organization_selection_option_idx on public.organization_attribute_selections(type_code,group_code,option_code);
create table public.organization_attribute_text_values(id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,type_revision bigint not null check(type_revision>0),
 type_code text not null,group_code text not null,value_text text not null check(length(btrim(value_text)) between 1 and 200),
 sort_order integer not null default 0 check(sort_order>=0),
 foreign key(type_code,group_code) references public.organization_attribute_groups(type_code,group_code));
create unique index organization_text_unique on public.organization_attribute_text_values(organization_id,type_revision,type_code,group_code,private.org_normalize(value_text));
create index organization_text_group_idx on public.organization_attribute_text_values(type_code,group_code);

create table private.organization_controls(
 organization_id uuid primary key references public.organizations(id) on delete restrict,
 profile_state text not null default 'draft' check(profile_state in ('draft','active','suspended','archived')),
 row_version bigint not null default 1 check(row_version>0),legal_revision bigint not null default 1 check(legal_revision>0),
 ownership_revision bigint not null default 1 check(ownership_revision>0),type_revision bigint not null default 1 check(type_revision>0),
 identity_case_id uuid,representation_case_id uuid,state_changed_at timestamptz not null default now(),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 suspended_at timestamptz,archived_at timestamptz,state_reason text check(length(state_reason)<=1000));
create table private.organization_legal_details(organization_id uuid primary key references public.organizations(id) on delete restrict,
 legal_name text check(legal_name is null or length(btrim(legal_name)) between 1 and 200),
 legal_form_code text references public.organization_legal_forms(code),legal_code text check(length(legal_code)<=64),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index organization_legal_form_idx on private.organization_legal_details(legal_form_code);
create table private.organization_representative_details(id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,user_id uuid references public.profiles(id) on delete set null,
 ownership_revision bigint not null check(ownership_revision>0),representative_revision bigint not null default 1 check(representative_revision>0),
 first_name text check(first_name is null or length(btrim(first_name)) between 1 and 100),
 last_name text check(last_name is null or length(btrim(last_name)) between 1 and 100),
 capacity text check(length(capacity)<=200),private_phone text check(length(private_phone)<=40),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(organization_id,ownership_revision));
create index organization_representative_user_idx on private.organization_representative_details(user_id);
create table private.organization_media_current(
 organization_id uuid references public.organizations(id) on delete restrict,kind text check(kind in ('logo','cover')),
 object_path text not null unique,version uuid not null,sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 size_bytes bigint not null check(size_bytes>0),width integer not null check(width>0),height integer not null check(height>0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(organization_id,kind),
 check(object_path=organization_id::text||'/'||kind||'/'||version::text||'.webp'),
 check((kind='logo' and size_bytes<=256000 and width<=512 and height<=512) or
       (kind='cover' and size_bytes<=614400 and width<=1600 and height<=1600)));
create table private.organization_verification_cases(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
 scope text not null check(scope in ('identity','representation')),subject_user_id uuid references public.profiles(id) on delete set null,
 requester uuid references public.profiles(id) on delete set null,reviewer uuid references public.profiles(id) on delete set null,
 subject_user_snapshot uuid,requester_snapshot uuid,reviewer_snapshot uuid,
 legal_revision bigint not null,ownership_revision bigint,representative_revision bigint,
 method text check(method in ('domain_email','official_contact','official_phone','documents_manual')),
 status text not null default 'pending' check(status in ('pending','approved','needs_info','cancelled')),
 submitted_at timestamptz not null default now(),resolved_at timestamptz,reason text check(length(reason)<=1000),
 check(scope<>'representation' or (ownership_revision>0 and representative_revision>0)),
 check(status<>'pending' or scope<>'representation' or subject_user_id is not null),
 check(status<>'approved' or (method is not null and reviewer_snapshot is not null and resolved_at is not null)));
create unique index organization_pending_identity on private.organization_verification_cases(organization_id) where scope='identity' and status='pending';
create unique index organization_pending_representation on private.organization_verification_cases(organization_id,subject_user_id) where scope='representation' and status='pending';
create table private.organization_verification_evidence(
 id uuid primary key default gen_random_uuid(),case_id uuid not null references private.organization_verification_cases(id) on delete restrict,
 method text not null check(method in ('domain_email','official_contact','official_phone','documents_manual')),
 source_kind text not null check(source_kind in ('submitted_reference','independently_obtained')),
 reference text not null check(length(btrim(reference)) between 1 and 2000),note text check(length(note)<=2000),
 recorded_by uuid references public.profiles(id) on delete set null,recorded_at timestamptz not null default now());
alter table private.organization_controls add foreign key(identity_case_id) references private.organization_verification_cases(id),
 add foreign key(representation_case_id) references private.organization_verification_cases(id);
create table private.organization_legal_change_requests(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
 requester uuid references public.profiles(id) on delete set null,reviewer uuid references public.profiles(id) on delete set null,
 expected_legal_revision bigint not null,expected_ownership_revision bigint not null,
 proposed_legal_name text not null check(length(btrim(proposed_legal_name)) between 1 and 200),
 proposed_legal_form_code text not null references public.organization_legal_forms(code),proposed_legal_code text check(length(proposed_legal_code)<=64),
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled','needs_info')),
 created_at timestamptz not null default now(),resolved_at timestamptz,reason text check(length(reason)<=1000));
create unique index organization_pending_legal_change on private.organization_legal_change_requests(organization_id) where status='pending';
create table private.organization_ownership_transfers(
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete restrict,
 from_user_id uuid references public.profiles(id) on delete set null,to_user_id uuid references public.profiles(id) on delete set null,
 status text not null default 'pending' check(status in ('pending','accepted','cancelled','declined','expired')),
 expected_ownership_revision bigint not null,expected_legal_revision bigint not null,
 created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '7 days',resolved_at timestamptz,
 check(status<>'pending' or(from_user_id is not null and to_user_id is not null and from_user_id<>to_user_id)));
create unique index organization_pending_transfer on private.organization_ownership_transfers(organization_id) where status='pending';
create table private.organization_audit_events(id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete restrict,actor uuid references public.profiles(id) on delete set null,
 event_code text not null check(event_code in ('created','public_saved','locations_saved','legal_saved','representative_saved','type_saved','benefits_saved',
 'media_logo_replaced','media_cover_replaced','media_logo_removed','media_cover_removed','verification_requested','verification_resolved',
 'legal_change_requested','legal_change_resolved','transfer_requested','transfer_resolved','profile_state')),
 case_id uuid references private.organization_verification_cases(id),transfer_id uuid references private.organization_ownership_transfers(id),
 legal_change_request_id uuid references private.organization_legal_change_requests(id),
 occurred_at timestamptz not null default now(),details jsonb not null default '{}' check(jsonb_typeof(details)='object'));

insert into public.organization_types(code,label_lt,sort_order) values
('veterinary_clinic','Veterinarijos klinika / ligoninė / gydykla / kabinetas',1),
('farm_livestock_poultry','Gyvulininkystės ūkis / ŽŪB / paukštynas / gyvūnų auginimo įmonė',2),
('veterinary_retail_pharmacy','Veterinarijos vaistinė / vaistinių tinklas',3),
('veterinary_wholesale_distributor','Veterinarijos distributorius / didmenininkas',4),
('animal_health_pharma_products','Gamintojas / gyvūnų sveikatos / farmacijos / pašarų / papildų įmonė',5),
('public_institution','Valstybinė institucija / priežiūros tarnyba',6),
('university_research_education','Universitetas / kolegija / profesinė mokykla / mokslo ar tyrimų įstaiga',7),
('laboratory_diagnostics','Veterinarijos laboratorija / diagnostikos centras',8),
('shelter_ngo','Gyvūnų prieglauda / NVO / gyvūnų gerovės organizacija',9),
('animal_care_physiotherapy','Gyvūnų reabilitacija / fizioterapija / priežiūros paslaugos',10),
('veterinary_equipment_technology','Veterinarinė įranga / technologijos / veterinarijos paslaugų įmonė',11),
('professional_association','Asociacija / profesinė organizacija',12),
('other','Kita veterinarijos / gyvūnų sveikatos sektoriaus organizacija',13),
('individual_activity','Fizinis asmuo / individuali veikla',14)
on conflict(code) do update set label_lt=excluded.label_lt,sort_order=excluded.sort_order;
insert into public.organization_legal_forms(code,label_lt,requires_organization_code,sort_order) values
('uab','UAB',true,1),
('mb','MB',true,2),
('vsi','VšĮ',true,3),
('ab','AB',true,4),
('zub','ŽŪB',true,5),
('budgetary_institution','Biudžetinė įstaiga',true,6),
('association','Asociacija',true,7),
('individual_activity','Individuali veikla',false,8),
('natural_person','Fizinis asmuo',false,9),
('other','Kita',true,10);
insert into public.organization_employee_size_ranges(code,label_lt,sort_order) values
('size_1','1–5',1),
('size_2','6–15',2),
('size_3','16–30',3),
('size_4','31–50',4),
('size_5','51–100',5),
('size_6','100+',6);
insert into public.organization_benefit_options(code,label_lt,sort_order) values
('flexible_schedule','Lankstus darbo grafikas',1),
('training_conferences','Mokymai ir konferencijos',2),
('career_growth','Karjeros augimas',3),
('modern_equipment','Moderni įranga',4),
('bonuses','Premijos',5),
('fuel_compensation','Kuro kompensacija',6),
('relocation_support','Persikėlimo pagalba',7),
('extra_leave','Papildomos atostogos',8),
('employee_discounts','Nuolaidos darbuotojams',9),
('international_team','Tarptautinė komanda',10),
('mentorship','Mentorystė',11);
insert into public.organization_attribute_groups(type_code,group_code,label_lt,value_kind,allow_other,sort_order) values
('veterinary_clinic','animals','Gyvūnų grupės','choice',true,1),
('veterinary_clinic','clinical_areas','Klinikinės sritys','choice',true,2),
('veterinary_clinic','working_models','Darbo modeliai','choice',false,3),
('farm_livestock_poultry','species','Gyvūnų rūšys','choice',true,1),
('farm_livestock_poultry','operation_direction','Veiklos kryptys','choice',true,2),
('farm_livestock_poultry','work_site_model','Darbo vietos modelis','choice',false,3),
('veterinary_retail_pharmacy','operating_model','Veiklos modeliai','choice',false,1),
('veterinary_retail_pharmacy','product_activity_areas','Produktų / veiklos sritys','choice',true,2),
('veterinary_retail_pharmacy','veterinary_services','Veterinarinės paslaugos','choice',true,3),
('veterinary_retail_pharmacy','customer_segments','Klientų segmentai','text',false,4),
('veterinary_wholesale_distributor','product_areas','Produktų sritys','choice',true,1),
('veterinary_wholesale_distributor','animal_market_segments','Gyvūnų / rinkos segmentai','choice',false,2),
('animal_health_pharma_products','activity_product_areas','Veiklos / produktų sritys','choice',true,1),
('animal_health_pharma_products','animal_segments','Gyvūnų segmentai','choice',false,2),
('public_institution','activity_areas','Veiklos sritys','choice',true,1),
('public_institution','units','Padaliniai','text',false,2),
('university_research_education','activity_areas','Veiklos sritys','choice',true,1),
('university_research_education','opportunities','Galimybės','choice',true,2),
('laboratory_diagnostics','diagnostic_areas','Diagnostikos sritys','choice',true,1),
('laboratory_diagnostics','served_sectors_species','Aptarnaujami sektoriai / rūšys','text',false,2),
('shelter_ngo','activity_areas','Veiklos sritys','choice',true,1),
('animal_care_physiotherapy','activity_areas','Veiklos sritys','choice',true,1),
('veterinary_equipment_technology','activity_areas','Veiklos sritys','choice',true,1),
('professional_association','activity_areas','Veiklos sritys','choice',true,1),
('other','activity_areas','Veiklos sritys','text',false,1),
('individual_activity','activity_areas','Veiklos sritys','choice',true,1);
insert into public.organization_attribute_options(type_code,group_code,option_code,label_lt,sort_order) values
('veterinary_clinic','animals','dogs','Šunys',1),
('veterinary_clinic','animals','cats','Katės',2),
('veterinary_clinic','animals','exotics','Egzotiniai gyvūnai',3),
('veterinary_clinic','animals','horses','Arkliai',4),
('veterinary_clinic','animals','farm_animals','Ūkiniai gyvūnai',5),
('veterinary_clinic','animals','other','Kita',6),
('veterinary_clinic','clinical_areas','general_practice','Bendroji praktika',1),
('veterinary_clinic','clinical_areas','internal_medicine','Vidaus ligos',2),
('veterinary_clinic','clinical_areas','surgery','Chirurgija',3),
('veterinary_clinic','clinical_areas','diagnostics','Diagnostika',4),
('veterinary_clinic','clinical_areas','dentistry','Odontologija',5),
('veterinary_clinic','clinical_areas','dermatology','Dermatologija',6),
('veterinary_clinic','clinical_areas','cardiology','Kardiologija',7),
('veterinary_clinic','clinical_areas','orthopedics_traumatology','Ortopedija / traumatologija',8),
('veterinary_clinic','clinical_areas','ophthalmology','Oftalmologija',9),
('veterinary_clinic','clinical_areas','anesthesiology','Anesteziologija',10),
('veterinary_clinic','clinical_areas','intensive_care','Intensyvioji terapija',11),
('veterinary_clinic','clinical_areas','reproduction','Reprodukcija',12),
('veterinary_clinic','clinical_areas','other','Kita',13),
('veterinary_clinic','working_models','regular_clinic','Įprasta klinika',1),
('veterinary_clinic','working_models','24_7','24/7',2),
('veterinary_clinic','working_models','emergency','Skubi pagalba',3),
('veterinary_clinic','working_models','on_call','Budėjimai',4),
('veterinary_clinic','working_models','inpatient','Stacionaras',5),
('farm_livestock_poultry','species','cattle','Galvijai',1),
('farm_livestock_poultry','species','pigs','Kiaulės',2),
('farm_livestock_poultry','species','poultry','Paukščiai',3),
('farm_livestock_poultry','species','horses','Arkliai',4),
('farm_livestock_poultry','species','sheep_goats','Avys / ožkos',5),
('farm_livestock_poultry','species','other','Kita',6),
('farm_livestock_poultry','operation_direction','dairy','Pienininkystė',1),
('farm_livestock_poultry','operation_direction','beef_cattle','Mėsinė galvijininkystė',2),
('farm_livestock_poultry','operation_direction','pig_production','Kiaulininkystė',3),
('farm_livestock_poultry','operation_direction','poultry_production','Paukštininkystė',4),
('farm_livestock_poultry','operation_direction','breeding_reproduction','Veisimas / reprodukcija',5),
('farm_livestock_poultry','operation_direction','mixed_farming','Mišrus ūkis',6),
('farm_livestock_poultry','operation_direction','other','Kita',7),
('farm_livestock_poultry','work_site_model','one_farm','Vienas ūkis',1),
('farm_livestock_poultry','work_site_model','multiple_sites','Kelios vietos',2),
('farm_livestock_poultry','work_site_model','mobile_work','Mobilus darbas',3),
('veterinary_retail_pharmacy','operating_model','physical_pharmacy','Fizinė vaistinė',1),
('veterinary_retail_pharmacy','operating_model','pharmacy_chain','Vaistinių tinklas',2),
('veterinary_retail_pharmacy','operating_model','ecommerce','Elektroninė prekyba',3),
('veterinary_retail_pharmacy','product_activity_areas','veterinary_medicines','Veterinariniai vaistai',1),
('veterinary_retail_pharmacy','product_activity_areas','feed','Pašarai',2),
('veterinary_retail_pharmacy','product_activity_areas','supplements','Papildai',3),
('veterinary_retail_pharmacy','product_activity_areas','animal_care_hygiene_products','Gyvūnų priežiūros / higienos produktai',4),
('veterinary_retail_pharmacy','product_activity_areas','veterinary_supplies','Veterinarinės prekės',5),
('veterinary_retail_pharmacy','product_activity_areas','other','Kita',6),
('veterinary_retail_pharmacy','veterinary_services','microchipping','Ženklinimas mikroschemomis',1),
('veterinary_retail_pharmacy','veterinary_services','vaccination','Vakcinacija',2),
('veterinary_retail_pharmacy','veterinary_services','consultation','Konsultacijos',3),
('veterinary_retail_pharmacy','veterinary_services','other','Kita',4),
('veterinary_wholesale_distributor','product_areas','veterinary_medicines','Veterinariniai vaistai',1),
('veterinary_wholesale_distributor','product_areas','vaccines_biological_products','Vakcinos / biologiniai produktai',2),
('veterinary_wholesale_distributor','product_areas','feed','Pašarai',3),
('veterinary_wholesale_distributor','product_areas','supplements','Papildai',4),
('veterinary_wholesale_distributor','product_areas','diagnostics','Diagnostika',5),
('veterinary_wholesale_distributor','product_areas','veterinary_equipment','Veterinarinė įranga',6),
('veterinary_wholesale_distributor','product_areas','consumables','Eksploatacinės medžiagos',7),
('veterinary_wholesale_distributor','product_areas','animal_care_products','Gyvūnų priežiūros produktai',8),
('veterinary_wholesale_distributor','product_areas','other','Kita',9),
('veterinary_wholesale_distributor','animal_market_segments','companion_animals','Gyvūnai augintiniai',1),
('veterinary_wholesale_distributor','animal_market_segments','livestock','Ūkiniai gyvūnai',2),
('veterinary_wholesale_distributor','animal_market_segments','horses','Arkliai',3),
('veterinary_wholesale_distributor','animal_market_segments','mixed','Mišrūs segmentai',4),
('animal_health_pharma_products','activity_product_areas','veterinary_medicines','Veterinariniai vaistai',1),
('animal_health_pharma_products','activity_product_areas','vaccines_biological_products','Vakcinos / biologiniai produktai',2),
('animal_health_pharma_products','activity_product_areas','diagnostics','Diagnostika',3),
('animal_health_pharma_products','activity_product_areas','feed','Pašarai',4),
('animal_health_pharma_products','activity_product_areas','supplements','Papildai',5),
('animal_health_pharma_products','activity_product_areas','animal_care_products','Gyvūnų priežiūros produktai',6),
('animal_health_pharma_products','activity_product_areas','other','Kita',7),
('animal_health_pharma_products','animal_segments','companion_animals','Gyvūnai augintiniai',1),
('animal_health_pharma_products','animal_segments','livestock','Ūkiniai gyvūnai',2),
('animal_health_pharma_products','animal_segments','horses','Arkliai',3),
('animal_health_pharma_products','animal_segments','mixed','Mišrūs segmentai',4),
('public_institution','activity_areas','animal_health','Gyvūnų sveikata',1),
('public_institution','activity_areas','animal_welfare','Gyvūnų gerovė',2),
('public_institution','activity_areas','food_safety','Maisto sauga',3),
('public_institution','activity_areas','veterinary_medicines_control','Veterinarinių vaistų kontrolė',4),
('public_institution','activity_areas','border_control','Pasienio kontrolė',5),
('public_institution','activity_areas','disease_surveillance_control','Ligų stebėsena / kontrolė',6),
('public_institution','activity_areas','administration','Administravimas',7),
('public_institution','activity_areas','laboratory_control','Laboratorinė kontrolė',8),
('public_institution','activity_areas','other','Kita',9),
('university_research_education','activity_areas','education_teaching','Švietimas / mokymas',1),
('university_research_education','activity_areas','clinical_activity','Klinikinė veikla',2),
('university_research_education','activity_areas','research','Moksliniai tyrimai',3),
('university_research_education','activity_areas','laboratory','Laboratorinė veikla',4),
('university_research_education','activity_areas','continuing_professional_education','Tęstinis profesinis mokymas',5),
('university_research_education','activity_areas','other','Kita',6),
('university_research_education','opportunities','student_practice','Studentų praktika',1),
('university_research_education','opportunities','internships','Stažuotės',2),
('university_research_education','opportunities','residency','Rezidentūra',3),
('university_research_education','opportunities','study_programmes','Studijų programos',4),
('university_research_education','opportunities','continuing_qualification_courses','Kvalifikacijos tobulinimas / kursai',5),
('university_research_education','opportunities','research_opportunities','Tyrimų galimybės',6),
('university_research_education','opportunities','doctoral_academic_career','Doktorantūra / akademinė karjera',7),
('university_research_education','opportunities','international_placements_exchanges','Tarptautinės stažuotės / mainai',8),
('university_research_education','opportunities','other','Kita',9),
('laboratory_diagnostics','diagnostic_areas','clinical_pathology','Klinikinė patologija',1),
('laboratory_diagnostics','diagnostic_areas','microbiology','Mikrobiologija',2),
('laboratory_diagnostics','diagnostic_areas','molecular_diagnostics','Molekulinė diagnostika',3),
('laboratory_diagnostics','diagnostic_areas','pathology_histology','Patologija / histologija',4),
('laboratory_diagnostics','diagnostic_areas','parasitology','Parazitologija',5),
('laboratory_diagnostics','diagnostic_areas','toxicology','Toksikologija',6),
('laboratory_diagnostics','diagnostic_areas','food_feed_testing','Maisto / pašarų tyrimai',7),
('laboratory_diagnostics','diagnostic_areas','other','Kita',8),
('shelter_ngo','activity_areas','animal_sheltering_care','Gyvūnų globa / priežiūra',1),
('shelter_ngo','activity_areas','rescue','Gelbėjimas',2),
('shelter_ngo','activity_areas','adoption','Gyvūnų įvaikinimas',3),
('shelter_ngo','activity_areas','animal_welfare','Gyvūnų gerovė',4),
('shelter_ngo','activity_areas','veterinary_care','Veterinarinė pagalba',5),
('shelter_ngo','activity_areas','education_awareness','Švietimas / informavimas',6),
('shelter_ngo','activity_areas','other','Kita',7),
('animal_care_physiotherapy','activity_areas','physiotherapy','Fizioterapija',1),
('animal_care_physiotherapy','activity_areas','rehabilitation','Reabilitacija',2),
('animal_care_physiotherapy','activity_areas','hydrotherapy','Hidroterapija',3),
('animal_care_physiotherapy','activity_areas','postoperative_rehabilitation','Pooperacinė reabilitacija',4),
('animal_care_physiotherapy','activity_areas','mobility_pain_management','Judėjimo / skausmo valdymas',5),
('animal_care_physiotherapy','activity_areas','animal_care','Gyvūnų priežiūra',6),
('animal_care_physiotherapy','activity_areas','other','Kita',7),
('veterinary_equipment_technology','activity_areas','veterinary_equipment','Veterinarinė įranga',1),
('veterinary_equipment_technology','activity_areas','diagnostic_equipment','Diagnostinė įranga',2),
('veterinary_equipment_technology','activity_areas','laboratory_equipment','Laboratorinė įranga',3),
('veterinary_equipment_technology','activity_areas','software_it','Programinė įranga / IT',4),
('veterinary_equipment_technology','activity_areas','technical_service','Techninė priežiūra',5),
('veterinary_equipment_technology','activity_areas','consulting_training','Konsultavimas / mokymas',6),
('veterinary_equipment_technology','activity_areas','other','Kita',7),
('professional_association','activity_areas','professional_representation','Profesinis atstovavimas',1),
('professional_association','activity_areas','continuing_professional_development','Profesinės kvalifikacijos tobulinimas',2),
('professional_association','activity_areas','events_conferences','Renginiai / konferencijos',3),
('professional_association','activity_areas','member_services','Paslaugos nariams',4),
('professional_association','activity_areas','advocacy','Interesų atstovavimas',5),
('professional_association','activity_areas','standards_guidelines','Standartai / gairės',6),
('professional_association','activity_areas','other','Kita',7),
('individual_activity','activity_areas','veterinary_practice','Veterinarinė praktika',1),
('individual_activity','activity_areas','consulting','Konsultavimas',2),
('individual_activity','activity_areas','animal_care','Gyvūnų priežiūra',3),
('individual_activity','activity_areas','rehabilitation_physiotherapy','Reabilitacija / fizioterapija',4),
('individual_activity','activity_areas','training_education','Mokymas / švietimas',5),
('individual_activity','activity_areas','other','Kita',6);

-- Narrow internal helpers; public wrappers remain SECURITY INVOKER.
create function private.org_actor() returns uuid language sql stable security invoker set search_path='' as $$ select private.require_active() $$;
-- Public/read predicates must return NULL rather than throw for absent sessions.
-- The existing postgres-owned session checker remains the Auth trust boundary.
create function private.org_live_actor() returns uuid language sql stable security invoker set search_path='' as $$
 select case when private.has_active_session() then private.require_active() else null::uuid end
$$;
-- Single-purpose confirmed transfer target lookup. Kept postgres-owned: the
-- organization roles never acquire Auth schema/table privileges. No API EXECUTE.
create function private.stage5_confirmed_transfer_target(oid uuid,target_email text) returns uuid language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_active(); target uuid; begin
 if not private.is_admin() and not exists(select 1 from public.organization_memberships
   where organization_id=oid and user_id=actor and revoked_at is null) then
  raise exception 'Organization owner or trusted administrator required' using errcode='42501';
 end if;
 select id into target from auth.users where lower(email)=lower(target_email) and email_confirmed_at is not null;
 return target;
end $$;
revoke all on function private.stage5_confirmed_transfer_target(uuid,text) from public,anon,authenticated;
grant execute on function private.stage5_confirmed_transfer_target(uuid,text) to vetkarjera_organization_writer;
create function private.org_owner(oid uuid) returns uuid language sql stable security invoker set search_path='' as $$
 select user_id from public.organization_memberships where organization_id=oid and revoked_at is null
$$;
create function private.org_approved(oid uuid,component text) returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from private.organization_controls c join private.organization_verification_cases v
 on v.id=case when component='identity' then c.identity_case_id else c.representation_case_id end
 left join private.organization_representative_details r on r.organization_id=c.organization_id and r.ownership_revision=c.ownership_revision
 where c.organization_id=oid and v.organization_id=oid and v.scope=component and v.status='approved' and v.legal_revision=c.legal_revision
 and (component='identity' or(v.subject_user_id=private.org_owner(oid) and v.ownership_revision=c.ownership_revision and v.representative_revision=r.representative_revision)));
$$;
create function private.org_can_edit(oid uuid) returns boolean language sql stable security invoker set search_path='' as $$
 select private.org_owner(oid)=private.org_live_actor() and
 exists(select 1 from private.organization_controls c where c.organization_id=oid and c.profile_state not in ('suspended','archived')
 and (private.org_approved(oid,'representation') or (c.ownership_revision=1 and not exists(
 select 1 from private.organization_verification_cases v where v.organization_id=oid and v.scope='representation' and v.ownership_revision=1 and v.status='approved'))))
$$;
create function private.org_readable(oid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.organization_controls c where c.organization_id=oid and
 (c.profile_state='active' or (private.has_active_session() and (private.org_owner(oid)=private.org_live_actor() or private.is_admin()))))
$$;
create function private.org_current_answer(oid uuid,kind text,rev bigint) returns boolean language sql stable security definer set search_path='' as $$
 select private.org_readable(oid) and exists(select 1 from public.organizations o join private.organization_controls c on c.organization_id=o.id
 where o.id=oid and o.organization_type_code=kind and c.type_revision=rev)
$$;
create function private.org_type_complete(oid uuid) returns boolean language sql stable security invoker set search_path='' as $$
 with ctx as(select o.organization_type_code t,c.type_revision r from public.organizations o join private.organization_controls c on c.organization_id=o.id where o.id=oid),
 valid_groups as(
 select distinct s.group_code from public.organization_attribute_selections s join ctx on s.type_code=ctx.t and s.type_revision=ctx.r
 join public.organization_attribute_options op on(op.type_code,op.group_code,op.option_code)=(s.type_code,s.group_code,s.option_code)
 where s.organization_id=oid and op.is_active and(s.option_code<>'other' or exists(
 select 1 from public.organization_attribute_text_values v where(v.organization_id,v.type_revision,v.type_code,v.group_code)=(s.organization_id,s.type_revision,s.type_code,s.group_code) and length(btrim(v.value_text))>0)))
 select coalesce(case t
 when 'veterinary_clinic' then exists(select 1 from valid_groups where group_code='animals') and exists(select 1 from valid_groups where group_code='clinical_areas')
 when 'farm_livestock_poultry' then exists(select 1 from valid_groups where group_code='species') and exists(select 1 from valid_groups where group_code='operation_direction')
 when 'veterinary_retail_pharmacy' then exists(select 1 from valid_groups where group_code='operating_model') and exists(select 1 from valid_groups where group_code='product_activity_areas')
 when 'veterinary_wholesale_distributor' then exists(select 1 from valid_groups where group_code='product_areas')
 when 'animal_health_pharma_products' then exists(select 1 from valid_groups where group_code='activity_product_areas')
 when 'laboratory_diagnostics' then exists(select 1 from valid_groups where group_code='diagnostic_areas')
 when 'other' then exists(select 1 from public.organization_attribute_text_values v,ctx where v.organization_id=oid and v.type_code='other' and v.type_revision=ctx.r and v.group_code='activity_areas' and length(btrim(v.value_text))>0)
 when 'public_institution' then exists(select 1 from valid_groups where group_code='activity_areas')
 when 'university_research_education' then exists(select 1 from valid_groups where group_code='activity_areas')
 when 'shelter_ngo' then exists(select 1 from valid_groups where group_code='activity_areas')
 when 'animal_care_physiotherapy' then exists(select 1 from valid_groups where group_code='activity_areas')
 when 'veterinary_equipment_technology' then exists(select 1 from valid_groups where group_code='activity_areas')
 when 'professional_association' then exists(select 1 from valid_groups where group_code='activity_areas')
 when 'individual_activity' then exists(select 1 from valid_groups where group_code='activity_areas')
 else false end,false) from ctx
$$;
create function private.org_completeness(oid uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 with flags as(select
 o.name is not null and o.organization_type_code is not null and exists(select 1 from public.organization_locations where organization_id=oid) s1,
 l.legal_name is not null and f.is_active and (not f.requires_organization_code or nullif(btrim(l.legal_code),'') is not null)
 and r.user_id=private.org_owner(oid) and r.first_name is not null and r.last_name is not null and nullif(btrim(r.capacity),'') is not null and nullif(btrim(r.private_phone),'') is not null s2,
 nullif(btrim(o.description),'') is not null d,
 exists(select 1 from private.organization_media_current where organization_id=oid and kind='logo') logo,
 exists(select 1 from private.organization_media_current where organization_id=oid and kind='cover') cover,
 coalesce(private.org_type_complete(oid),false) typ,
 exists(select 1 from public.organization_benefits where organization_id=oid) or exists(select 1 from public.organization_custom_benefits where organization_id=oid) benefits
 from public.organizations o join private.organization_controls c on c.organization_id=o.id
 left join private.organization_legal_details l on l.organization_id=o.id left join public.organization_legal_forms f on f.code=l.legal_form_code
 left join private.organization_representative_details r on r.organization_id=o.id and r.ownership_revision=c.ownership_revision where o.id=oid),
 points as(select coalesce(s1,false) s1,coalesce(s1 and s2,false) s2,d,logo,cover,typ,benefits,
 (case when s1 then 20 else 0 end)+(case when s1 and s2 then 50 else 0 end) required,
 (case when d then 10 else 0 end)+(case when logo then 5 else 0 end)+(case when cover then 5 else 0 end)+(case when typ then 5 else 0 end)+(case when benefits then 5 else 0 end) quality from flags)
 select jsonb_build_object('step1',case when s1 then 20 else 0 end,'step2',case when s2 then 50 else 0 end,
 'requiredComplete',s1 and s2,'quality',quality,'total',required+quality,'typeBlockComplete',typ,'typeQualityPoints',case when typ then 5 else 0 end,
 'descriptionPoints',case when d then 10 else 0 end,'logoPoints',case when logo then 5 else 0 end,'coverPoints',case when cover then 5 else 0 end,'benefitPoints',case when benefits then 5 else 0 end) from points
$$;
create function private.org_recalculate(oid uuid) returns void language plpgsql security invoker set search_path='' as $$
declare complete boolean; begin
 complete:=coalesce((private.org_completeness(oid)->>'requiredComplete')::boolean,false);
 update private.organization_controls set profile_state=case when profile_state in('suspended','archived') then profile_state when complete then 'active' else 'draft' end,
 row_version=row_version+1,updated_at=now(),state_changed_at=case when profile_state not in('suspended','archived') and (profile_state='active') is distinct from complete then now() else state_changed_at end
 where organization_id=oid;
end $$;
create function private.org_require_keys(data jsonb,allowed text[]) returns void language plpgsql security invoker set search_path='' as $$
begin if data is null or jsonb_typeof(data)<>'object' or octet_length(data::text)>131072 or exists(select 1 from jsonb_object_keys(data) k where not(k=any(allowed))) then
 raise exception 'Invalid organization fields' using errcode='22023'; end if; end $$;
create function private.org_lock(oid uuid,expected bigint,edit boolean default true) returns void language plpgsql security invoker set search_path='' as $$
declare uid uuid:=private.org_actor(); actual bigint; begin
 select row_version into actual from private.organization_controls where organization_id=oid for update;
 if actual is null or private.org_owner(oid) is distinct from uid then raise exception 'Forbidden' using errcode='42501'; end if;
 if expected is null or actual<>expected then raise exception 'Stale organization revision' using errcode='40001'; end if;
 if edit and not private.org_can_edit(oid) then raise exception 'Organization is read only' using errcode='42501'; end if;
end $$;
create function private.org_audit(oid uuid,event text,context jsonb default '{}') returns void language plpgsql security invoker set search_path='' as $$
begin
 perform private.org_require_keys(context,array['rowVersion','decision','kind','revision','fields','status']);
 insert into private.organization_audit_events(organization_id,actor,event_code,details) values(oid,private.org_actor(),event,context);
end $$;
create function private.org_slug(oid uuid,brand text) returns void language plpgsql security invoker set search_path='' as $$
declare base text; candidate text; n integer:=0; old text; begin
 base:=trim(both '-' from regexp_replace(lower(translate(normalize(coalesce(brand,''),NFC),'ąčęėįšųūžĄČĘĖĮŠŲŪŽ','aceeisuuzaceeisuuz')),'[^a-z0-9]+','-','g'));
 base:=left(base,60);base:=rtrim(base,'-');
 if base='' then base:='organizacija-'||left(replace(oid::text,'-',''),12); end if;
 select slug into old from public.organization_slug_registry where organization_id=oid and is_current;
 if old=base then return; end if;
 loop
 candidate:=case when n=0 then base else base||'-'||left(replace(oid::text,'-',''),12)||case when n=1 then '' else '-'||n::text end end;
 if exists(select 1 from public.organization_slug_registry where slug=candidate and organization_id=oid and is_current) then return; end if;
 begin
 insert into public.organization_slug_registry(slug,organization_id,is_current) values(candidate,oid,false);
 exit;
 exception when unique_violation then n:=n+1;if n>20 then raise; end if;
 end;
 end loop;
 update public.organization_slug_registry set is_current=false,replaced_at=now() where organization_id=oid and is_current;
 update public.organization_slug_registry set is_current=true where slug=candidate;
end $$;
create function private.org_public_dto(oid uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_strip_nulls(jsonb_build_object('id',o.id,'name',o.name,'primaryType',o.organization_type_code,'typeOther',o.organization_type_other,
 'slug',(select slug from public.organization_slug_registry where organization_id=oid and is_current),
 'cities',(select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('name',city_name,'municipalityCode',municipality_code)) order by sort_order,id) from public.organization_locations where organization_id=oid),
 'description',nullif(o.description,''),'website',o.website,'publicPhone',o.public_phone,'publicEmail',o.public_email,
 'facebookUrl',o.facebook_url,'instagramUrl',o.instagram_url,'linkedinUrl',o.linkedin_url,'employeeSize',o.employee_size_code,'streetAddress',o.street_address,
 'typeBlock',(select jsonb_agg(jsonb_build_object('group',g.group_code,'options',coalesce((select jsonb_agg(s.option_code order by s.option_code) from public.organization_attribute_selections s where s.organization_id=oid and s.type_revision=c.type_revision and s.type_code=o.organization_type_code and s.group_code=g.group_code),'[]'),
 'custom',coalesce((select jsonb_agg(v.value_text order by v.sort_order,v.id) from public.organization_attribute_text_values v where v.organization_id=oid and v.type_revision=c.type_revision and v.type_code=o.organization_type_code and v.group_code=g.group_code),'[]')) order by g.sort_order)
 from public.organization_attribute_groups g where g.type_code=o.organization_type_code and (exists(select 1 from public.organization_attribute_selections s where s.organization_id=oid and s.type_revision=c.type_revision and s.type_code=g.type_code and s.group_code=g.group_code) or exists(select 1 from public.organization_attribute_text_values v where v.organization_id=oid and v.type_revision=c.type_revision and v.type_code=g.type_code and v.group_code=g.group_code))),
 'benefits',(select jsonb_agg(b.label_lt order by b.sort_order) from public.organization_benefits v join public.organization_benefit_options b on b.code=v.benefit_code where v.organization_id=oid),
 'customBenefits',(select jsonb_agg(label order by sort_order,id) from public.organization_custom_benefits where organization_id=oid),
 'media',(select jsonb_object_agg(kind,jsonb_build_object('version',version,'src','/api/organizacijos/'||oid::text||'/media/'||kind||'?v='||version::text)) from private.organization_media_current where organization_id=oid)))
 from public.organizations o join private.organization_controls c on c.organization_id=o.id where o.id=oid
$$;
create function private.org_context(oid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.org_actor(); c private.organization_controls; r private.organization_representative_details; ident boolean; rep boolean; status text; begin
 if private.org_owner(oid) is distinct from uid and not private.is_admin() then raise exception 'Forbidden' using errcode='42501';end if;
 select * into c from private.organization_controls where organization_id=oid;
 select * into r from private.organization_representative_details where organization_id=oid and ownership_revision=c.ownership_revision;
 ident:=private.org_approved(oid,'identity');rep:=private.org_approved(oid,'representation');
 status:=case when ident and rep then 'verified' when exists(select 1 from private.organization_verification_cases where id in(c.identity_case_id,c.representation_case_id) and private.organization_verification_cases.status='needs_info') then 'needs_info'
 when exists(select 1 from private.organization_verification_cases where id in(c.identity_case_id,c.representation_case_id) and private.organization_verification_cases.status='pending') then 'pending' else 'unverified' end;
 return jsonb_build_object('organization',private.org_public_dto(oid),'rowVersion',c.row_version,'typeRevision',c.type_revision,
 'legalRevision',c.legal_revision,'ownershipRevision',c.ownership_revision,'profileState',c.profile_state,'completeness',private.org_completeness(oid),
 'legal',(select jsonb_build_object('legalName',legal_name,'legalForm',legal_form_code,'legalCode',legal_code) from private.organization_legal_details where organization_id=oid),
 'representative',jsonb_build_object('firstName',r.first_name,'lastName',r.last_name,'capacity',r.capacity,'privatePhone',r.private_phone,'revision',r.representative_revision),
 'capabilities',jsonb_build_object('canReadPrivate',true,'canEditProfile',private.org_can_edit(oid),'canManageMedia',private.org_can_edit(oid),
 'canSubmitVerification',private.org_owner(oid)=uid and c.profile_state not in('suspended','archived'),
 'canRequestTransfer',private.org_owner(oid)=uid and rep and c.profile_state not in('suspended','archived'),
 'canArchive',private.org_owner(oid)=uid and rep and c.profile_state not in('suspended','archived')),
 'verification',jsonb_build_object('state',status,'identityApproved',ident,'representationApproved',rep));
end $$;

create function private.org_text(data jsonb,key text) returns text language plpgsql immutable security invoker set search_path='' as $$
begin
 if data ? key and jsonb_typeof(data->key) not in('string','null') then raise exception 'Invalid text field' using errcode='22023';end if;
 return nullif(btrim(data->>key,E' \t\n\r'),'');
end $$;
create function private.org_mutate(action text,oid uuid,expected bigint,data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.org_actor(); c private.organization_controls; item jsonb; grp public.organization_attribute_groups;
 value text; oldtype text; newtype text; rev bigint; event text; obj uuid; begin
 if action='create' then
  perform private.org_require_keys(data,array[]::text[]);
  perform 1 from public.profiles where id=uid for update;
  if not exists(select 1 from public.employer_profiles where user_id=uid) then raise exception 'Employer profile required' using errcode='42501';end if;
  select organization_id into obj from public.organization_memberships where user_id=uid and revoked_at is null limit 1;
  if obj is not null then return private.org_context(obj);end if;
  insert into public.organizations default values returning id into obj;
  insert into private.organization_controls(organization_id) values(obj);
  insert into private.organization_legal_details(organization_id) values(obj);
  insert into private.organization_representative_details(organization_id,user_id,ownership_revision) values(obj,uid,1);
  insert into public.organization_memberships(user_id,organization_id) values(uid,obj);
  perform private.org_slug(obj,null);perform private.org_audit(obj,'created');return private.org_context(obj);
 end if;
 perform private.org_lock(oid,expected,action<>'representative');
 select * into c from private.organization_controls where organization_id=oid;
 if action='public' then
  perform private.org_require_keys(data,array['name','organization_type_code','organization_type_other','description','website','facebook_url','instagram_url','linkedin_url','public_phone','public_email','employee_size_code','street_address']);
  select organization_type_code into oldtype from public.organizations where id=oid;
  newtype:=case when data?'organization_type_code' then private.org_text(data,'organization_type_code') else oldtype end;
  if newtype is not null and not exists(select 1 from public.organization_types where code=newtype and is_active) then raise exception 'Invalid type' using errcode='22023';end if;
  update public.organizations set
   name=case when data?'name' then private.org_text(data,'name') else name end,
   organization_type_code=newtype,
   organization_type_other=case when data?'organization_type_other' then private.org_text(data,'organization_type_other') else organization_type_other end,
   description=case when data?'description' then private.org_text(data,'description') else description end,
   website=case when data?'website' then private.org_text(data,'website') else website end,
   facebook_url=case when data?'facebook_url' then private.org_text(data,'facebook_url') else facebook_url end,
   instagram_url=case when data?'instagram_url' then private.org_text(data,'instagram_url') else instagram_url end,
   linkedin_url=case when data?'linkedin_url' then private.org_text(data,'linkedin_url') else linkedin_url end,
   public_phone=case when data?'public_phone' then private.org_text(data,'public_phone') else public_phone end,
   public_email=case when data?'public_email' then private.org_text(data,'public_email') else public_email end,
   employee_size_code=case when data?'employee_size_code' then private.org_text(data,'employee_size_code') else employee_size_code end,
   street_address=case when data?'street_address' then private.org_text(data,'street_address') else street_address end where id=oid;
  if newtype is distinct from oldtype then update private.organization_controls set type_revision=type_revision+1 where organization_id=oid;end if;
  if data?'name' then perform private.org_slug(oid,(select name from public.organizations where id=oid));end if;
  event:='public_saved';
 elsif action='locations' then
  perform private.org_require_keys(data,array['cities']);
  if jsonb_typeof(data->'cities') is distinct from 'array' then raise exception 'Cities array required' using errcode='22023';end if;
  delete from public.organization_locations where organization_id=oid;
  rev:=0;
  for item in select * from jsonb_array_elements(data->'cities') loop
   perform private.org_require_keys(item,array['city_name','municipality_code']);
   value:=private.org_text(item,'municipality_code');
   if value is not null and not exists(select 1 from public.locations where code=value and kind='municipality' and is_active) then raise exception 'Invalid municipality' using errcode='22023';end if;
   insert into public.organization_locations(organization_id,city_name,city_key,municipality_code,sort_order)
   values(oid,private.org_text(item,'city_name'),private.org_normalize(private.org_text(item,'city_name')),value,rev);
   rev:=rev+1;
  end loop;
  event:='locations_saved';
 elsif action='legal' then
  perform private.org_require_keys(data,array['legal_name','legal_form_code','legal_code']);
  if exists(select 1 from private.organization_verification_cases where organization_id=oid and scope='identity' and status='approved') then raise exception 'Verified legal identity requires a change request' using errcode='42501';end if;
  update private.organization_legal_details set
   legal_name=case when data?'legal_name' then private.org_text(data,'legal_name') else legal_name end,
   legal_form_code=case when data?'legal_form_code' then private.org_text(data,'legal_form_code') else legal_form_code end,
   legal_code=case when data?'legal_code' then private.org_text(data,'legal_code') else legal_code end,updated_at=now() where organization_id=oid;
  update private.organization_controls set legal_revision=legal_revision+1,identity_case_id=null,representation_case_id=null where organization_id=oid;
  event:='legal_saved';
 elsif action='representative' then
  perform private.org_require_keys(data,array['first_name','last_name','capacity','private_phone']);
  if c.profile_state in('suspended','archived') then raise exception 'Read only organization' using errcode='42501';end if;
  if data ?| array['first_name','last_name','capacity'] then
   update private.organization_representative_details set representative_revision=representative_revision+1 where organization_id=oid and ownership_revision=c.ownership_revision;
   update private.organization_controls set representation_case_id=null where organization_id=oid;
  end if;
  update private.organization_representative_details set
   first_name=case when data?'first_name' then private.org_text(data,'first_name') else first_name end,
   last_name=case when data?'last_name' then private.org_text(data,'last_name') else last_name end,
   capacity=case when data?'capacity' then private.org_text(data,'capacity') else capacity end,
   private_phone=case when data?'private_phone' then private.org_text(data,'private_phone') else private_phone end,updated_at=now()
  where organization_id=oid and ownership_revision=c.ownership_revision and user_id=uid;
  event:='representative_saved';
 elsif action='type' then
  perform private.org_require_keys(data,array['type_revision','groups']);
  if jsonb_typeof(data->'type_revision') is distinct from 'number' or (data->>'type_revision')::bigint<>c.type_revision then raise exception 'Stale type revision' using errcode='40001';end if;
  if jsonb_typeof(data->'groups') is distinct from 'array' then raise exception 'Groups array required' using errcode='22023';end if;
  select organization_type_code into newtype from public.organizations where id=oid;
  for item in select * from jsonb_array_elements(data->'groups') loop
   perform private.org_require_keys(item,array['group_code','options','custom']);
   select * into grp from public.organization_attribute_groups where type_code=newtype and group_code=private.org_text(item,'group_code') and is_active;
   if not found then raise exception 'Invalid current type group' using errcode='22023';end if;
   if jsonb_typeof(item->'options') is distinct from 'array' or jsonb_typeof(item->'custom') is distinct from 'array' then raise exception 'Group arrays required' using errcode='22023';end if;
   if grp.value_kind='text' and jsonb_array_length(item->'options')>0 then raise exception 'Text-only group' using errcode='22023';end if;
   if grp.value_kind='choice' and not grp.allow_other and jsonb_array_length(item->'custom')>0 then raise exception 'Custom values not allowed' using errcode='22023';end if;
   if grp.value_kind='choice' and jsonb_array_length(item->'custom')>0 and not(item->'options' @> '["other"]'::jsonb) then raise exception 'Other marker required' using errcode='22023';end if;
   delete from public.organization_attribute_selections where organization_id=oid and type_revision=c.type_revision and type_code=newtype and group_code=grp.group_code;
   delete from public.organization_attribute_text_values where organization_id=oid and type_revision=c.type_revision and type_code=newtype and group_code=grp.group_code;
   for value in select v#>>'{}' from jsonb_array_elements(item->'options') v where jsonb_typeof(v)='string' loop
    if not exists(select 1 from public.organization_attribute_options where type_code=newtype and group_code=grp.group_code and option_code=value and is_active) then raise exception 'Invalid option' using errcode='22023';end if;
    insert into public.organization_attribute_selections values(oid,c.type_revision,newtype,grp.group_code,value);
   end loop;
   if exists(select 1 from jsonb_array_elements(item->'options') v where jsonb_typeof(v)<>'string') or exists(select 1 from jsonb_array_elements(item->'custom') v where jsonb_typeof(v)<>'string') then raise exception 'Text array required' using errcode='22023';end if;
   for value in select nullif(btrim(v#>>'{}',E' \t\n\r'),'') from jsonb_array_elements(item->'custom') v loop
    if value is not null then insert into public.organization_attribute_text_values(organization_id,type_revision,type_code,group_code,value_text) values(oid,c.type_revision,newtype,grp.group_code,value);end if;
   end loop;
  end loop;
  event:='type_saved';
 elsif action='benefits' then
  perform private.org_require_keys(data,array['standard','custom']);
  if jsonb_typeof(data->'standard') is distinct from 'array' or jsonb_typeof(data->'custom') is distinct from 'array' or jsonb_array_length(data->'custom')>10 then raise exception 'Invalid benefits' using errcode='22023';end if;
  if exists(select 1 from jsonb_array_elements((data->'standard')||(data->'custom')) v where jsonb_typeof(v)<>'string') then raise exception 'Text array required' using errcode='22023';end if;
  delete from public.organization_benefits where organization_id=oid;
  delete from public.organization_custom_benefits where organization_id=oid;
  for value in select v#>>'{}' from jsonb_array_elements(data->'standard') v loop
   if not exists(select 1 from public.organization_benefit_options where code=value and is_active) then raise exception 'Invalid benefit' using errcode='22023';end if;
   insert into public.organization_benefits values(oid,value);
  end loop;
  for value in select btrim(v#>>'{}',E' \t\n\r') from jsonb_array_elements(data->'custom') v loop
   insert into public.organization_custom_benefits(organization_id,label) values(oid,value);
  end loop;
  event:='benefits_saved';
 else raise exception 'Invalid operation' using errcode='22023';end if;
 perform private.org_recalculate(oid);perform private.org_audit(oid,event);
 return private.org_context(oid);
end $$;

create function private.org_verification(action text,oid uuid,expected bigint,data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.org_actor(); c private.organization_controls; v private.organization_verification_cases;
 req private.organization_legal_change_requests; r private.organization_representative_details; scopeval text; cid uuid; decision text; begin
 if action in('resolve','legal_resolve','state') then
  if not private.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
  select * into c from private.organization_controls where organization_id=oid for update;
  if c.row_version is null or expected is null or c.row_version<>expected then raise exception 'Stale organization' using errcode='40001';end if;
 else perform private.org_lock(oid,expected,false);select * into c from private.organization_controls where organization_id=oid;end if;
 select * into r from private.organization_representative_details where organization_id=oid and ownership_revision=c.ownership_revision;
 if action='request' then
  perform private.org_require_keys(data,array['scope','method','reference']);
  if c.profile_state in('suspended','archived') then raise exception 'Read only' using errcode='42501';end if;
  scopeval:=private.org_text(data,'scope');
  if scopeval is null or scopeval not in('identity','representation') then raise exception 'Invalid scope' using errcode='22023';end if;
  if private.org_text(data,'method') is null or private.org_text(data,'reference') is null then raise exception 'Verification method/reference required' using errcode='22023';end if;
  update private.organization_verification_cases set status='cancelled',resolved_at=now() where organization_id=oid and scope=scopeval and status='pending';
  insert into private.organization_verification_cases(organization_id,scope,subject_user_id,requester,legal_revision,ownership_revision,representative_revision,method)
  values(oid,scopeval,case when scopeval='representation' then uid end,uid,c.legal_revision,
  case when scopeval='representation' then c.ownership_revision end,case when scopeval='representation' then r.representative_revision end,private.org_text(data,'method')) returning id into cid;
  insert into private.organization_verification_evidence(case_id,method,source_kind,reference,recorded_by)
  values(cid,private.org_text(data,'method'),'submitted_reference',private.org_text(data,'reference'),uid);
  update private.organization_controls set identity_case_id=case when scopeval='identity' then cid else identity_case_id end,
   representation_case_id=case when scopeval='representation' then cid else representation_case_id end where organization_id=oid;
  perform private.org_audit(oid,'verification_requested');
 elsif action='resolve' then
  perform private.org_require_keys(data,array['case_id','decision','method','reference','reason']);
  select * into v from private.organization_verification_cases where id=(data->>'case_id')::uuid and organization_id=oid for update;
  decision:=private.org_text(data,'decision');
  if v.id is null or v.status not in('pending','needs_info') or decision is null or decision not in('approved','needs_info','cancelled') then raise exception 'Invalid review' using errcode='22023';end if;
  if v.requester=uid or v.subject_user_id=uid or private.org_owner(oid)=uid then raise exception 'Independent administrator required' using errcode='42501';end if;
  if v.legal_revision<>c.legal_revision or (v.scope='representation' and(v.subject_user_id is distinct from private.org_owner(oid) or v.ownership_revision<>c.ownership_revision or v.representative_revision<>r.representative_revision)) then raise exception 'Stale verification revision' using errcode='40001';end if;
  if decision='approved' then
   if private.org_text(data,'method') is null or private.org_text(data,'reference') is null then raise exception 'Independent reviewed evidence required' using errcode='22023';end if;
   insert into private.organization_verification_evidence(case_id,method,source_kind,reference,recorded_by)
   values(v.id,private.org_text(data,'method'),'independently_obtained',private.org_text(data,'reference'),uid);
  end if;
  update private.organization_verification_cases set status=decision,method=coalesce(private.org_text(data,'method'),method),reviewer=uid,resolved_at=now(),reason=private.org_text(data,'reason') where id=v.id;
  perform private.org_audit(oid,'verification_resolved',jsonb_build_object('decision',decision));
 elsif action='legal_request' then
  perform private.org_require_keys(data,array['legal_name','legal_form_code','legal_code']);
  if not private.org_can_edit(oid) then raise exception 'Read only organization' using errcode='42501';end if;
  if private.org_text(data,'legal_name') is null or not exists(select 1 from public.organization_legal_forms f where f.code=private.org_text(data,'legal_form_code') and f.is_active and(not f.requires_organization_code or private.org_text(data,'legal_code') is not null)) then raise exception 'Incomplete legal identity' using errcode='22023';end if;
  insert into private.organization_legal_change_requests(organization_id,requester,expected_legal_revision,expected_ownership_revision,proposed_legal_name,proposed_legal_form_code,proposed_legal_code)
  values(oid,uid,c.legal_revision,c.ownership_revision,private.org_text(data,'legal_name'),private.org_text(data,'legal_form_code'),private.org_text(data,'legal_code'));
  perform private.org_audit(oid,'legal_change_requested');
 elsif action='legal_resolve' then
  perform private.org_require_keys(data,array['request_id','decision','reason']);
  select * into req from private.organization_legal_change_requests where id=(data->>'request_id')::uuid and organization_id=oid for update;
  decision:=private.org_text(data,'decision');
  if req.id is null or req.status not in('pending','needs_info') or decision is null or decision not in('approved','rejected','needs_info','cancelled') then raise exception 'Invalid legal review' using errcode='22023';end if;
  if req.requester=uid or private.org_owner(oid)=uid then raise exception 'Independent administrator required' using errcode='42501';end if;
  if req.expected_legal_revision<>c.legal_revision or req.expected_ownership_revision<>c.ownership_revision then raise exception 'Stale legal request' using errcode='40001';end if;
  if decision='approved' then
   update private.organization_legal_details set legal_name=req.proposed_legal_name,legal_form_code=req.proposed_legal_form_code,legal_code=req.proposed_legal_code,updated_at=now() where organization_id=oid;
   update private.organization_controls set legal_revision=legal_revision+1,identity_case_id=null,representation_case_id=null where organization_id=oid;
  end if;
  update private.organization_legal_change_requests set status=decision,reviewer=uid,resolved_at=now(),reason=private.org_text(data,'reason') where id=req.id;
  perform private.org_audit(oid,'legal_change_resolved',jsonb_build_object('decision',decision));
 elsif action='state' then
  perform private.org_require_keys(data,array['state','reason']);
  decision:=private.org_text(data,'state');
  if decision is null or decision not in('suspended','archived','resume') or private.org_text(data,'reason') is null then raise exception 'State/reason required' using errcode='22023';end if;
  update private.organization_controls set profile_state=case when decision='resume' then 'draft' else decision end,
   suspended_at=case when decision='suspended' then now() end,archived_at=case when decision='archived' then now() end,state_reason=private.org_text(data,'reason') where organization_id=oid;
  perform private.org_audit(oid,'profile_state',jsonb_build_object('status',decision));
 else raise exception 'Invalid operation' using errcode='22023';end if;
 perform private.org_recalculate(oid);return private.org_context(oid);
end $$;

create function private.org_transfer(action text,oid uuid,expected bigint,data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.org_actor(); t private.organization_ownership_transfers; c private.organization_controls; target uuid; fromid uuid; rid uuid; begin
 if action in('request','admin_request') then
  perform private.org_require_keys(data,case when action='admin_request' then array['target_email','method','reference','reason'] else array['target_email'] end);
  if action='admin_request' and (not private.is_admin() or private.org_text(data,'method') is null or private.org_text(data,'reference') is null or private.org_text(data,'reason') is null) then raise exception 'Independent admin evidence required' using errcode='42501';end if;
  target:=private.stage5_confirmed_transfer_target(oid,private.org_text(data,'target_email'));
  fromid:=private.org_owner(oid);
 else
  perform private.org_require_keys(data,case when action='accept' then array['transfer_id','first_name','last_name','capacity','private_phone'] else array['transfer_id'] end);
  select * into t from private.organization_ownership_transfers where id=(data->>'transfer_id')::uuid and organization_id=oid;
  target:=t.to_user_id;fromid:=t.from_user_id;
 end if;
 -- Fixed lock order shared by create/accept: user IDs, organization, transfer.
 perform 1 from public.profiles where id in(target,fromid) order by id for update;
 select * into c from private.organization_controls where organization_id=oid for update;
 if c.row_version is null or expected is null or c.row_version<>expected then raise exception 'Stale organization' using errcode='40001';end if;
 if action in('request','admin_request') then
  if action='admin_request' then
   if fromid=uid then raise exception 'Independent administrator required' using errcode='42501';end if;
   insert into private.organization_verification_cases(organization_id,scope,subject_user_id,reviewer,legal_revision,ownership_revision,representative_revision,method,status,resolved_at,reason)
    select oid,'representation',fromid,uid,c.legal_revision,c.ownership_revision,r.representative_revision,private.org_text(data,'method'),'approved',now(),private.org_text(data,'reason')
    from private.organization_representative_details r where r.organization_id=oid and r.ownership_revision=c.ownership_revision returning id into rid;
   insert into private.organization_verification_evidence(case_id,method,source_kind,reference,recorded_by) values(rid,private.org_text(data,'method'),'independently_obtained',private.org_text(data,'reference'),uid);
   update private.organization_controls set representation_case_id=rid where organization_id=oid;
  end if;
  if (action='request' and (fromid is distinct from uid or not private.org_approved(oid,'representation'))) or c.profile_state in('suspended','archived') then
   raise exception 'Verified owner required' using errcode='42501';end if;
  if target is null or target=uid then raise exception 'Unavailable transfer target' using errcode='22023';end if;
  if exists(select 1 from public.organization_memberships where user_id=target and revoked_at is null) then raise exception 'Target already owns an organization' using errcode='23505';end if;
  update private.organization_ownership_transfers set status='expired',resolved_at=now() where organization_id=oid and status='pending' and expires_at<=now();
  insert into private.organization_ownership_transfers(organization_id,from_user_id,to_user_id,expected_ownership_revision,expected_legal_revision)
  values(oid,fromid,target,c.ownership_revision,c.legal_revision) returning id into rid;
  perform private.org_audit(oid,'transfer_requested',jsonb_build_object('decision',case when action='admin_request' then 'admin_verified_fallback' else 'owner_request' end));perform private.org_recalculate(oid);
  return jsonb_build_object('transferId',rid,'rowVersion',(select row_version from private.organization_controls where organization_id=oid));
 end if;
 select * into t from private.organization_ownership_transfers where id=t.id for update;
 if t.id is null or t.status<>'pending' or (uid is distinct from t.from_user_id and uid is distinct from t.to_user_id) then raise exception 'Forbidden transfer' using errcode='42501';end if;
 if t.expires_at<=now() then
  update private.organization_ownership_transfers set status='expired',resolved_at=now() where id=t.id;
  perform private.org_recalculate(oid);return jsonb_build_object('status','expired');
 end if;
 if t.expected_ownership_revision<>c.ownership_revision or t.expected_legal_revision<>c.legal_revision or t.from_user_id is distinct from private.org_owner(oid) then raise exception 'Stale transfer' using errcode='40001';end if;
 if action='accept' then
  if uid is distinct from t.to_user_id or c.profile_state in('suspended','archived') then raise exception 'Forbidden acceptance' using errcode='42501';end if;
  if exists(select 1 from public.organization_memberships where user_id=uid and revoked_at is null) then raise exception 'Target already owns an organization' using errcode='23505';end if;
  update public.organization_memberships set revoked_at=now() where organization_id=oid and revoked_at is null;
  insert into public.organization_memberships(user_id,organization_id) values(uid,oid) on conflict(user_id,organization_id) do update set revoked_at=null;
  insert into public.employer_profiles(user_id) values(uid) on conflict(user_id) do nothing;
  update private.organization_controls set ownership_revision=ownership_revision+1,representation_case_id=null where organization_id=oid;
  insert into private.organization_representative_details(organization_id,user_id,ownership_revision,first_name,last_name,capacity,private_phone)
  values(oid,uid,c.ownership_revision+1,private.org_text(data,'first_name'),private.org_text(data,'last_name'),private.org_text(data,'capacity'),private.org_text(data,'private_phone'));
 elsif action='cancel' then
  if uid is distinct from t.from_user_id then raise exception 'Forbidden cancellation' using errcode='42501';end if;
 elsif action='decline' then
  if uid is distinct from t.to_user_id then raise exception 'Forbidden decline' using errcode='42501';end if;
 else raise exception 'Invalid transfer action' using errcode='22023';end if;
 update private.organization_ownership_transfers set status=case action when 'accept' then 'accepted' when 'cancel' then 'cancelled' else 'declined' end,resolved_at=now() where id=t.id;
 perform private.org_audit(oid,'transfer_resolved',jsonb_build_object('decision',action));perform private.org_recalculate(oid);
 if action='accept' or uid=t.from_user_id then return private.org_context(oid);end if;
 return jsonb_build_object('status','declined');
end $$;
create function private.org_pending_transfers() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.org_actor();begin
 return coalesce((select jsonb_agg(jsonb_build_object('transferId',t.id,'organizationId',t.organization_id,'name',o.name,
 'rowVersion',c.row_version,'expiresAt',t.expires_at,'direction',case when t.to_user_id=uid then 'incoming' else 'outgoing' end))
 from private.organization_ownership_transfers t join public.organizations o on o.id=t.organization_id join private.organization_controls c on c.organization_id=o.id
 where t.status='pending' and t.expires_at>now() and uid in(t.from_user_id,t.to_user_id)),'[]');
end $$;
create function private.org_archive(oid uuid,expected bigint) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.org_lock(oid,expected);
 if not private.org_approved(oid,'representation') then raise exception 'Verified representation required' using errcode='42501';end if;
 update private.organization_controls set profile_state='archived',archived_at=now() where organization_id=oid;
 perform private.org_audit(oid,'profile_state',jsonb_build_object('status','archived'));perform private.org_recalculate(oid);return private.org_context(oid);end $$;

create function private.org_media_read(oid uuid,media_kind text,requested_version uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare m private.organization_media_current; begin
 if media_kind is null or media_kind not in('logo','cover') then raise exception 'Invalid media kind' using errcode='22023';end if;
 if not private.org_readable(oid) then return null;end if;
 select * into m from private.organization_media_current where organization_id=oid and kind=media_kind and (requested_version is null or version=requested_version);
 if m.version is null then return null;end if;
 return jsonb_build_object('path',m.object_path,'version',m.version,'sha256',m.sha256,'size',m.size_bytes);
end $$;
create table private.organization_media_uploads(
 version uuid primary key,organization_id uuid not null references public.organizations(id) on delete restrict,kind text not null check(kind in('logo','cover')),
 prepared_by uuid not null references public.profiles(id),expected_row_version bigint not null,used boolean not null default false,
 created_at timestamptz not null default now());
create function private.org_media(action text,oid uuid,expected bigint,data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c private.organization_controls; kindval text; ver uuid; previous text; pathval text; begin
 perform private.org_lock(oid,expected);
 kindval:=private.org_text(data,'kind');
 if kindval is null or kindval not in('logo','cover') then raise exception 'Invalid media kind' using errcode='22023';end if;
 select object_path into previous from private.organization_media_current where organization_id=oid and kind=kindval;
 if action='prepare' then
  perform private.org_require_keys(data,array['kind']);ver:=gen_random_uuid();
  insert into private.organization_media_uploads(version,organization_id,kind,prepared_by,expected_row_version) values(ver,oid,kindval,private.org_actor(),expected);
  return jsonb_build_object('kind',kindval,'version',ver,'path',oid::text||'/'||kindval||'/'||ver::text||'.webp','rowVersion',expected);
 elsif action='commit' then
  perform private.org_require_keys(data,array['kind','version','sha256','size_bytes','width','height']);
  ver:=(data->>'version')::uuid;pathval:=oid::text||'/'||kindval||'/'||ver::text||'.webp';
  if not exists(select 1 from private.organization_media_uploads where version=ver and organization_id=oid and kind=kindval and prepared_by=private.org_actor()
   and expected_row_version=expected and not used and created_at>now()-interval '15 minutes') then raise exception 'Invalid media preparation' using errcode='22023';end if;
  update private.organization_media_uploads set used=true where version=ver;
  -- Only the server-only Storage helper can put bytes at this immutable key.
  if not exists(select 1 from storage.objects where bucket_id='organization-profile-media' and name=pathval
   and (metadata->>'size')::bigint=(data->>'size_bytes')::bigint and metadata->>'mimetype'='image/webp') then raise exception 'Uploaded media missing or invalid' using errcode='22023';end if;
  if exists(select 1 from private.organization_media_current where object_path=pathval) then raise exception 'New immutable version required' using errcode='22023';end if;
  insert into private.organization_media_current(organization_id,kind,object_path,version,sha256,size_bytes,width,height)
  values(oid,kindval,pathval,ver,data->>'sha256',(data->>'size_bytes')::bigint,(data->>'width')::int,(data->>'height')::int)
  on conflict(organization_id,kind) do update set object_path=excluded.object_path,version=excluded.version,sha256=excluded.sha256,size_bytes=excluded.size_bytes,width=excluded.width,height=excluded.height,updated_at=now();
  perform private.org_audit(oid,'media_'||kindval||'_replaced');
 elsif action='remove' then
  perform private.org_require_keys(data,array['kind']);
  delete from private.organization_media_current where organization_id=oid and kind=kindval;
  perform private.org_audit(oid,'media_'||kindval||'_removed');
 else raise exception 'Invalid media operation' using errcode='22023';end if;
 perform private.org_recalculate(oid);
 return jsonb_build_object('context',private.org_context(oid),'previousPath',previous,'version',ver);
end $$;
create function private.org_storage_read(object_name text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.organization_media_current m where m.object_path=object_name and private.org_readable(m.organization_id))
$$;
create function private.org_invariants() returns trigger language plpgsql security definer set search_path='' as $$
declare oid uuid; c private.organization_controls; v private.organization_verification_cases; r private.organization_representative_details; required boolean; begin
 if tg_table_name='organizations' then oid:=coalesce(new.id,old.id);
 else oid:=coalesce(new.organization_id,old.organization_id);end if;
 if not exists(select 1 from public.organizations where id=oid) then return null;end if;
 if (select count(*) from public.organization_memberships where organization_id=oid and revoked_at is null)<>1 then raise exception 'Exactly one active owner required' using errcode='23514';end if;
 select * into c from private.organization_controls where organization_id=oid;
 if c.organization_id is null then raise exception 'Organization controls required' using errcode='23514';end if;
 if (select count(*) from public.organization_custom_benefits where organization_id=oid)>10 then raise exception 'At most 10 custom benefits' using errcode='23514';end if;
 select * into r from private.organization_representative_details where organization_id=oid and ownership_revision=c.ownership_revision;
 if r.user_id is distinct from private.org_owner(oid) then raise exception 'Current representative must match owner' using errcode='23514';end if;
 required:=coalesce((private.org_completeness(oid)->>'requiredComplete')::boolean,false);
 if c.profile_state not in('suspended','archived') and(c.profile_state='active') is distinct from required then raise exception 'Profile state out of sync' using errcode='23514';end if;
 for v in select * from private.organization_verification_cases where id in(c.identity_case_id,c.representation_case_id) loop
  if v.organization_id<>oid or v.legal_revision<>c.legal_revision or(v.id=c.identity_case_id and v.scope<>'identity') or
   (v.id=c.representation_case_id and(v.scope<>'representation' or v.subject_user_id is distinct from r.user_id or v.ownership_revision<>c.ownership_revision or v.representative_revision<>r.representative_revision)) then
   raise exception 'Invalid verification pointer' using errcode='23514';
  end if;
  if v.status='approved' and not exists(select 1 from private.organization_verification_evidence where case_id=v.id and source_kind='independently_obtained') then raise exception 'Approved case needs independent evidence' using errcode='23514';end if;
 end loop;
 return null;
end $$;
create function private.org_preserve_approved() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then new.subject_user_snapshot:=new.subject_user_id;new.requester_snapshot:=new.requester;new.reviewer_snapshot:=new.reviewer;return new;end if;
 if old.status='approved' then
  -- FK SET NULL on a deleted, non-owning account is not a new review. Preserve
  -- original actor IDs separately; all approved facts/provenance stay immutable.
  if tg_op='DELETE' then raise exception 'Approved verification history is immutable' using errcode='42501';end if;
  if (to_jsonb(new)-array['subject_user_id','requester','reviewer']) is distinct from (to_jsonb(old)-array['subject_user_id','requester','reviewer']) or
   (new.subject_user_id is distinct from old.subject_user_id and (new.subject_user_id is not null or exists(select 1 from public.profiles where id=old.subject_user_id))) or
   (new.requester is distinct from old.requester and (new.requester is not null or exists(select 1 from public.profiles where id=old.requester))) or
   (new.reviewer is distinct from old.reviewer and (new.reviewer is not null or exists(select 1 from public.profiles where id=old.reviewer))) then
   raise exception 'Approved verification history is immutable' using errcode='42501';
  end if;
 else new.subject_user_snapshot:=coalesce(old.subject_user_snapshot,new.subject_user_id);new.requester_snapshot:=coalesce(old.requester_snapshot,new.requester);new.reviewer_snapshot:=coalesce(old.reviewer_snapshot,new.reviewer);
 end if;return new;
end $$;
create trigger org_approved_history before insert or update or delete on private.organization_verification_cases for each row execute function private.org_preserve_approved();
create function private.org_account_delete() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.organization_memberships where user_id=old.id and revoked_at is null) then raise exception 'Transfer ownership before deleting account' using errcode='23514';end if;
 update private.organization_ownership_transfers set status='cancelled',resolved_at=now() where status='pending' and old.id in(from_user_id,to_user_id);
 update private.organization_verification_cases set status='cancelled',resolved_at=now() where scope='representation' and status='pending' and subject_user_id=old.id;
 return old;
end $$;
-- Auth account deletion cascades through the existing public.profiles FK.
-- Guard the product row before its dependent FK actions, without modifying Auth.
create trigger organization_account_delete_guard before delete on public.profiles for each row execute function private.org_account_delete();
create function private.org_public(oid uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select private.org_public_dto(oid) where exists(select 1 from private.organization_controls where organization_id=oid and profile_state='active')
$$;
create function private.org_resolve_slug(requested_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('status',case when s.is_current then 200 else 308 end,'slug',cur.slug,'profile',private.org_public_dto(s.organization_id))
 from public.organization_slug_registry s join public.organization_slug_registry cur on cur.organization_id=s.organization_id and cur.is_current
 join private.organization_controls c on c.organization_id=s.organization_id where s.slug=requested_slug and c.profile_state='active'
$$;create function public.create_org_draft() returns jsonb language sql security invoker set search_path='' as $$ select private.org_mutate('create',null,null,'{}') $$;
create function public.patch_org_public(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_mutate('public',organization_id,expected_row_version,payload) $$;
create function public.save_org_locations(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_mutate('locations',organization_id,expected_row_version,payload) $$;
create function public.save_org_legal_draft(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_mutate('legal',organization_id,expected_row_version,payload) $$;
create function public.save_own_representative_details(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_mutate('representative',organization_id,expected_row_version,payload) $$;
create function public.save_org_type_block(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_mutate('type',organization_id,expected_row_version,payload) $$;
create function public.save_org_benefits(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_mutate('benefits',organization_id,expected_row_version,payload) $$;
create function public.own_org_context(organization_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.org_context(organization_id) $$;
create function public.organization_capabilities(organization_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.org_context(organization_id)->'capabilities' $$;
create function public.org_completeness(organization_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.org_context(organization_id)->'completeness' $$;
create function public.org_required_state(organization_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select jsonb_build_object('profileState',private.org_context(organization_id)->'profileState','requiredComplete',private.org_context(organization_id)->'completeness'->'requiredComplete') $$;
create function public.list_my_pending_transfers() returns jsonb language sql security invoker set search_path='' as $$ select private.org_pending_transfers() $$;
create function public.archive_org(organization_id uuid,expected_row_version bigint) returns jsonb language sql security invoker set search_path='' as $$ select private.org_archive(organization_id,expected_row_version) $$;
create function public.request_employer_verification(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_verification('request',organization_id,expected_row_version,payload) $$;
create function public.request_representation_verification(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_verification('request',organization_id,expected_row_version,payload||jsonb_build_object('scope','representation')) $$;
create function public.admin_resolve_case(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_verification('resolve',organization_id,expected_row_version,payload) $$;
create function public.request_org_legal_change(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_verification('legal_request',organization_id,expected_row_version,payload) $$;
create function public.admin_resolve_legal_change(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_verification('legal_resolve',organization_id,expected_row_version,payload) $$;
create function public.admin_organization_state(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_verification('state',organization_id,expected_row_version,payload) $$;
create function public.request_org_transfer(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_transfer('request',organization_id,expected_row_version,payload) $$;
create function public.accept_org_transfer(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_transfer('accept',organization_id,expected_row_version,payload) $$;
create function public.cancel_org_transfer(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_transfer('cancel',organization_id,expected_row_version,payload) $$;
create function public.decline_org_transfer(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_transfer('decline',organization_id,expected_row_version,payload) $$;
create function public.prepare_org_media(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_media('prepare',organization_id,expected_row_version,payload) $$;
create function public.commit_org_media(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_media('commit',organization_id,expected_row_version,payload) $$;
create function public.remove_org_media(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$ select private.org_media('remove',organization_id,expected_row_version,payload) $$;
create function public.read_org_media(organization_id uuid,kind text,version uuid default null) returns jsonb language sql security invoker set search_path='' begin atomic select private.org_media_read(organization_id,kind,version); end;
create function public.get_public_organization(organization_id uuid) returns jsonb language sql security invoker set search_path='' begin atomic select private.org_public(organization_id); end;
create function public.resolve_org_slug(slug text) returns jsonb language sql security invoker set search_path='' begin atomic select private.org_resolve_slug(slug); end;

-- Reviewer-only backend preparation; no Stage7 UI, public badge or admin promotion.
create function private.org_review_context(oid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform private.org_actor();
 if not private.is_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 return jsonb_build_object('context',private.org_context(oid),
 'cases',(select jsonb_agg(to_jsonb(v) order by v.submitted_at,v.id) from private.organization_verification_cases v where v.organization_id=oid),
 'evidence',(select jsonb_agg(to_jsonb(e) order by e.recorded_at,e.id) from private.organization_verification_evidence e join private.organization_verification_cases v on v.id=e.case_id where v.organization_id=oid),
 'legalChangeRequests',(select jsonb_agg(to_jsonb(r) order by r.created_at,r.id) from private.organization_legal_change_requests r where r.organization_id=oid),
 'representativeHistory',(select jsonb_agg(to_jsonb(r) order by r.ownership_revision) from private.organization_representative_details r where r.organization_id=oid));
end $$;
create function public.admin_org_review_context(organization_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.org_review_context(organization_id)$$;
create function public.admin_request_org_transfer(organization_id uuid,expected_row_version bigint,payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.org_transfer('admin_request',organization_id,expected_row_version,payload)$$;

-- Catalog tables remain read-only, with explicit grants independent of Supabase defaults.
do $$ declare t text; begin
 foreach t in array array['organization_legal_forms','organization_employee_size_ranges','organization_benefit_options','organization_attribute_groups','organization_attribute_options'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select on public.%I to anon,authenticated,vetkarjera_organization_writer,vetkarjera_organization_reader',t);
  execute format('create policy catalog_read on public.%I for select to anon,authenticated,vetkarjera_organization_writer,vetkarjera_organization_reader using(true)',t);
 end loop;
end $$;
 grant select on public.organization_types,public.locations to vetkarjera_organization_writer,vetkarjera_organization_reader;
create policy org_catalog_read on public.organization_types for select to vetkarjera_organization_writer,vetkarjera_organization_reader using(true);
create policy org_catalog_read on public.locations for select to vetkarjera_organization_writer,vetkarjera_organization_reader using(true);
grant update(id) on public.profiles to vetkarjera_organization_writer;
create policy org_profile_lock on public.profiles for update to vetkarjera_organization_writer using(true) with check(true);
grant insert on public.employer_profiles to vetkarjera_organization_writer;
create policy org_shell_bootstrap on public.employer_profiles for insert to vetkarjera_organization_writer with check(user_id=(select private.org_actor()));

drop policy organizations_read_member_or_admin on public.organizations;
drop policy organizations_require_active_session on public.organizations;
create policy organizations_public_own on public.organizations for select to anon,authenticated using(private.org_readable(id));
revoke all on public.organizations,public.organization_memberships from public,anon,authenticated;
grant select on public.organizations to anon,authenticated;
grant select on public.organization_memberships to authenticated;
-- Keep existing Stage4 membership RLS; add only the narrow internal org roles.
do $$ declare rec record;t text; begin
 for rec in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relkind='r' and n.nspname in('public','private') and(c.relname like 'organization_%' or c.relname='organizations')
 and c.relname not in('organization_types','organization_legal_forms','organization_employee_size_ranges','organization_benefit_options','organization_attribute_groups','organization_attribute_options') loop
  execute format('alter table %I.%I enable row level security',rec.nspname,rec.relname);
  if rec.relname not in('organizations','organization_memberships') then execute format('revoke all on %I.%I from public,anon,authenticated',rec.nspname,rec.relname);end if;
  execute format('grant select,insert,update,delete on %I.%I to vetkarjera_organization_writer',rec.nspname,rec.relname);
  execute format('grant select on %I.%I to vetkarjera_organization_reader',rec.nspname,rec.relname);
  execute format('create policy org_writer on %I.%I for all to vetkarjera_organization_writer using(true) with check(true)',rec.nspname,rec.relname);
  execute format('create policy org_reader on %I.%I for select to vetkarjera_organization_reader using(true)',rec.nspname,rec.relname);
  if rec.nspname='public' and rec.relname not in('organizations','organization_memberships') then
   execute format('grant select on public.%I to anon,authenticated',rec.relname);
   if rec.relname in('organization_attribute_selections','organization_attribute_text_values') then
    execute format('create policy public_current_read on public.%I for select to anon,authenticated using(private.org_current_answer(organization_id,type_code,type_revision))',rec.relname);
   else execute format('create policy public_own_read on public.%I for select to anon,authenticated using(private.org_readable(organization_id))',rec.relname);end if;
  end if;
 end loop;
 -- Deferred final-state checks apply to both RPC writes and trusted maintenance.
 foreach t in array array['organizations','organization_memberships','organization_locations','organization_custom_benefits'] loop
  execute format('create constraint trigger org_final_invariants after insert or update or delete on public.%I deferrable initially deferred for each row execute function private.org_invariants()',t);
 end loop;
 foreach t in array array['organization_controls','organization_legal_details','organization_representative_details','organization_verification_cases','organization_media_current'] loop
  execute format('create constraint trigger org_final_invariants after insert or update or delete on private.%I deferrable initially deferred for each row execute function private.org_invariants()',t);
 end loop;
end $$;

-- Lookup view contains public columns only; API roles still run through row RLS.
create view public.organization_public_profiles with(security_invoker=true) as
 select o.id,o.name,o.organization_type_code,o.organization_type_other,o.description,o.website,o.facebook_url,o.instagram_url,o.linkedin_url,
 o.public_phone,o.public_email,o.employee_size_code,o.street_address,s.slug
 from public.organizations o join public.organization_slug_registry s on s.organization_id=o.id and s.is_current;
revoke all on public.organization_public_profiles from public,anon,authenticated;
grant select on public.organization_public_profiles to anon,authenticated;

-- Private bucket. No SDK mutation capability for API clients, even if another
-- permissive Storage policy exists. Version/current-key read follows org state.
-- CEO-approved Stage5 compatibility amendment: keep the authenticated Stage4
-- predicate unchanged; deny anon specialist reads without calling its helper.
alter policy specialist_photo_read_guard on storage.objects to authenticated;
create policy specialist_photo_anon_read_guard on storage.objects
 as restrictive for select to anon using(bucket_id<>'specialist-profile-photos');
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('organization-profile-media','organization-profile-media',false,614400,array['image/webp']);
grant usage on schema storage to vetkarjera_organization_writer;
grant select on storage.objects to vetkarjera_organization_writer;
create policy org_storage_metadata on storage.objects for select to vetkarjera_organization_writer using(bucket_id='organization-profile-media');
create policy organization_media_read on storage.objects for select to anon,authenticated
 using(bucket_id='organization-profile-media' and private.org_storage_read(name));
create policy organization_media_read_guard on storage.objects as restrictive for select to anon,authenticated
 using(bucket_id<>'organization-profile-media' or private.org_storage_read(name));
create policy organization_media_insert_guard on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'organization-profile-media');
create policy organization_media_update_guard on storage.objects as restrictive for update to anon,authenticated
 using(bucket_id<>'organization-profile-media') with check(bucket_id<>'organization-profile-media');
create policy organization_media_delete_guard on storage.objects as restrictive for delete to anon,authenticated using(bucket_id<>'organization-profile-media');

-- Index every new FK to avoid scan amplification during deletion/review.
do $$ declare r record;cols text; begin
 for r in select c.oid,c.conrelid::regclass tbl,c.conname,c.conkey
 from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace
 where c.contype='f' and n.nspname in('public','private') and(t.relname like 'organization_%' or t.relname='organizations')
 and not exists(select 1 from pg_index i where i.indrelid=c.conrelid and i.indisvalid and i.indpred is null and(i.indkey::smallint[])[0:cardinality(c.conkey)-1] @> c.conkey) loop
  select string_agg(quote_ident(attname),',' order by k.ord) into cols from unnest(r.conkey) with ordinality k(num,ord)
  join pg_attribute a on a.attrelid=r.tbl and a.attnum=k.num;
  execute format('create index %I on %s(%s)',left(r.conname,49)||'_stage5_idx',r.tbl,cols);
 end loop;
end $$;

-- Revoke function defaults before granting only the entrypoints and bool policy
-- helpers needed by API callers. No private raw table or role membership exposed.
do $$ declare p record;role_name text; begin
 for p in select oid::regprocedure signature,proname from pg_proc where pronamespace='private'::regnamespace and proname like 'org_%' loop
  role_name:=case when p.proname in('org_context','org_readable','org_current_answer','org_pending_transfers','org_media_read','org_storage_read','org_public','org_resolve_slug','org_review_context')
   then 'vetkarjera_organization_reader' else 'vetkarjera_organization_writer' end;
  execute format('alter function %s owner to %I',p.signature,role_name);
  execute format('revoke all on function %s from public,anon,authenticated',p.signature);
  execute format('grant execute on function %s to vetkarjera_organization_writer,vetkarjera_organization_reader',p.signature);
 end loop;
end $$;
revoke all on function public.create_org_draft() from public,anon,authenticated;
grant execute on function public.create_org_draft() to authenticated;
revoke all on function public.patch_org_public(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.patch_org_public(uuid,bigint,jsonb) to authenticated;
revoke all on function public.save_org_locations(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.save_org_locations(uuid,bigint,jsonb) to authenticated;
revoke all on function public.save_org_legal_draft(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.save_org_legal_draft(uuid,bigint,jsonb) to authenticated;
revoke all on function public.save_own_representative_details(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.save_own_representative_details(uuid,bigint,jsonb) to authenticated;
revoke all on function public.save_org_type_block(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.save_org_type_block(uuid,bigint,jsonb) to authenticated;
revoke all on function public.save_org_benefits(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.save_org_benefits(uuid,bigint,jsonb) to authenticated;
revoke all on function public.own_org_context(uuid) from public,anon,authenticated;
grant execute on function public.own_org_context(uuid) to authenticated;
revoke all on function public.organization_capabilities(uuid) from public,anon,authenticated;
grant execute on function public.organization_capabilities(uuid) to authenticated;
revoke all on function public.org_completeness(uuid) from public,anon,authenticated;
grant execute on function public.org_completeness(uuid) to authenticated;
revoke all on function public.org_required_state(uuid) from public,anon,authenticated;
grant execute on function public.org_required_state(uuid) to authenticated;
revoke all on function public.list_my_pending_transfers() from public,anon,authenticated;
grant execute on function public.list_my_pending_transfers() to authenticated;
revoke all on function public.archive_org(uuid,bigint) from public,anon,authenticated;
grant execute on function public.archive_org(uuid,bigint) to authenticated;
revoke all on function public.request_employer_verification(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.request_employer_verification(uuid,bigint,jsonb) to authenticated;
revoke all on function public.request_representation_verification(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.request_representation_verification(uuid,bigint,jsonb) to authenticated;
revoke all on function public.admin_resolve_case(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.admin_resolve_case(uuid,bigint,jsonb) to authenticated;
revoke all on function public.request_org_legal_change(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.request_org_legal_change(uuid,bigint,jsonb) to authenticated;
revoke all on function public.admin_resolve_legal_change(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.admin_resolve_legal_change(uuid,bigint,jsonb) to authenticated;
revoke all on function public.admin_organization_state(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.admin_organization_state(uuid,bigint,jsonb) to authenticated;
revoke all on function public.request_org_transfer(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.request_org_transfer(uuid,bigint,jsonb) to authenticated;
revoke all on function public.accept_org_transfer(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.accept_org_transfer(uuid,bigint,jsonb) to authenticated;
revoke all on function public.cancel_org_transfer(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.cancel_org_transfer(uuid,bigint,jsonb) to authenticated;
revoke all on function public.decline_org_transfer(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.decline_org_transfer(uuid,bigint,jsonb) to authenticated;
revoke all on function public.prepare_org_media(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.prepare_org_media(uuid,bigint,jsonb) to authenticated;
revoke all on function public.commit_org_media(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.commit_org_media(uuid,bigint,jsonb) to authenticated;
revoke all on function public.remove_org_media(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.remove_org_media(uuid,bigint,jsonb) to authenticated;
revoke all on function public.read_org_media(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.read_org_media(uuid,text,uuid) to anon,authenticated;
revoke all on function public.get_public_organization(uuid) from public,anon,authenticated;
grant execute on function public.get_public_organization(uuid) to anon,authenticated;
revoke all on function public.resolve_org_slug(text) from public,anon,authenticated;
grant execute on function public.resolve_org_slug(text) to anon,authenticated;
grant execute on function private.org_mutate(text,uuid,bigint,jsonb) to authenticated;
grant execute on function private.org_context(uuid) to authenticated;
grant execute on function private.org_pending_transfers() to authenticated;
grant execute on function private.org_verification(text,uuid,bigint,jsonb) to authenticated;
grant execute on function private.org_transfer(text,uuid,bigint,jsonb) to authenticated;
grant execute on function private.org_archive(uuid,bigint) to authenticated;
grant execute on function private.org_media(text,uuid,bigint,jsonb) to authenticated;
grant execute on function private.org_readable(uuid) to anon,authenticated;
grant execute on function private.org_current_answer(uuid,text,bigint) to anon,authenticated;
grant execute on function private.org_storage_read(text) to anon,authenticated;
grant execute on function private.org_public(uuid) to anon,authenticated;
grant execute on function private.org_resolve_slug(text) to anon,authenticated;
grant execute on function private.org_media_read(uuid,text,uuid) to anon,authenticated;
revoke create on schema private from vetkarjera_organization_writer,vetkarjera_organization_reader;
revoke all on function public.admin_org_review_context(uuid),public.admin_request_org_transfer(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.admin_org_review_context(uuid),public.admin_request_org_transfer(uuid,bigint,jsonb),private.org_review_context(uuid) to authenticated;
grant vetkarjera_organization_writer,vetkarjera_organization_reader to postgres with inherit false,set false;
notify pgrst,'reload schema';
commit;
