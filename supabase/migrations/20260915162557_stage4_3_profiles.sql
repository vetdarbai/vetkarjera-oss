begin;
set local lock_timeout = '5s';
-- Finish in-flight signups before backfill/trigger replacement; no old trigger can
-- resume after the cutover and leave a new account without its profile shell.
lock table auth.users in share row exclusive mode;
-- Locked Stage 4.3 catalogs. Codes are stable; never delete referenced choices.
create table public.professional_roles (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.professional_roles(code,label_lt,sort_order) values ('veterinarian','Veterinarijos gydytojas',1),
('veterinary_student','Veterinarijos studentas',2),
('veterinary_assistant','Veterinarijos felčeris / gydytojo asistentas',3),
('veterinary_pharmacy','Veterinarijos vaistininkas / farmacininkas',4),
('animal_health_commerce','Veterinarijos / gyvūnų sveikatos komercijos specialistas',5),
('other_veterinary_specialty','Kita veterinarijos / gyvūnų sveikatos specialybė',6);
create table public.organization_types (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.organization_types(code,label_lt,sort_order) values ('veterinary_clinic','Veterinarijos klinika / gydykla / ligoninė',1),
('veterinary_retail_pharmacy','Veterinarijos vaistinė / veterinarinė mažmena',2),
('veterinary_wholesale_distributor','Veterinarijos didmena / distributorius',3),
('animal_health_pharma_products','Gyvūnų sveikatos / farmacijos / veterinarinių produktų įmonė',4),
('farm_livestock_poultry','Ūkis / gyvulininkystės / paukštininkystės įmonė',5),
('laboratory_diagnostics','Laboratorija / diagnostika',6),
('university_research_education','Universitetas / mokymo ar mokslo įstaiga',7),
('public_institution','Valstybinė / viešoji institucija',8),
('shelter_ngo','Gyvūnų prieglauda / NVO',9),
('other','Kita',10);
create table public.experience_bands (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.experience_bands(code,label_lt,sort_order) values ('no_experience','Neturiu profesinės patirties',1),
('under_1_year','Iki 1 metų',2),
('1_2_years','1–2 metai',3),
('3_5_years','3–5 metai',4),
('6_10_years','6–10 metų',5),
('10_plus_years','10+ metų',6);
create table public.animal_groups (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.animal_groups(code,label_lt,sort_order) values ('small_animals','Smulkieji gyvūnai',1),
('cattle','Galvijai',2),
('pigs','Kiaulės',3),
('poultry','Paukščiai',4),
('horses','Arkliai',5),
('exotic','Egzotiniai gyvūnai',6),
('other_farm','Kiti ūkiniai gyvūnai',7);
create table public.activity_areas (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.activity_areas(code,label_lt,sort_order) values ('clinical','Klinikinė praktika',1),
('farm','Ūkinių gyvūnų medicina',2),
('public_veterinary','Valstybinė veterinarija / kontrolė',3),
('laboratory','Laboratorija / diagnostika',4),
('pharmacy','Veterinarinė farmacija',5),
('commerce','Gyvūnų sveikatos / produktų komercija',6),
('science','Mokslas / akademinė veikla',7),
('other','Kita',8);
create table public.professional_interests (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.professional_interests(code,label_lt,sort_order) values ('general','Bendroji praktika',1),
('internal','Vidaus ligos',2),
('dermatology','Dermatologija',3),
('surgery','Chirurgija',4),
('orthopedics','Ortopedija',5),
('neurology','Neurologija',6),
('dentistry','Odontologija',7),
('anesthesia','Anesteziologija',8),
('emergency','Skubi pagalba / intensyvi terapija',9),
('reproduction','Reprodukcija',10),
('exotic','Egzotinių gyvūnų medicina',11);
create table public.job_search_statuses (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.job_search_statuses(code,label_lt,sort_order) values ('actively_looking','Aktyviai ieškau darbo',1),
('open_to_offers','Atviras pasiūlymams',2),
('not_looking','Šiuo metu darbo neieškau',3);
create table public.workloads (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.workloads(code,label_lt,sort_order) values ('full_time','Pilnas etatas',1),
('part_time','Dalinis etatas',2),
('flexible','Lankstus darbo krūvis',3);
create table public.schedules (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.schedules(code,label_lt,sort_order) values ('regular','Įprastas darbo laikas',1),
('shifts','Pamaininis darbas',2),
('flexible','Lankstus grafikas',3);
create table public.mobility_options (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.mobility_options(code,label_lt,sort_order) values ('selected_locations','Dirbu tik pasirinktose vietovėse',1),
('commute','Galiu reguliariai važinėti į kitą miestą / regioną',2),
('relocate','Esu pasirengęs persikelti',3),
('nationwide','Darbas visoje Lietuvoje tinka',4);
create table public.start_options (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.start_options(code,label_lt,sort_order) values ('immediately','Iš karto',1),
('two_weeks','Per 2 savaites',2),
('one_month','Per 1 mėnesį',3),
('two_three_months','Per 2–3 mėnesius',4),
('specific_date','Konkreti data / vėliau',5);
create table public.work_models (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.work_models(code,label_lt,sort_order) values ('on_site','Darbo vietoje',1),
('hybrid','Hibridinis',2),
('remote','Nuotolinis',3);
create table public.languages (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.languages(code,label_lt,sort_order) values ('lt','Lietuvių',1),
('en','Anglų',2),
('ru','Rusų',3),
('pl','Lenkų',4),
('lv','Latvių',5),
('et','Estų',6),
('de','Vokiečių',7),
('other','Kita',8);
create table public.language_levels (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.language_levels(code,label_lt,sort_order) values ('basic','Pagrindai',1),
('intermediate','Vidutinis',2),
('good','Geras',3),
('very_good','Labai geras',4),
('native','Gimtoji',5);
create table public.visibility_options (code text primary key, label_lt text not null, sort_order smallint not null, is_active boolean not null default true);
insert into public.visibility_options(code,label_lt,sort_order) values ('registered_employers','Matomas registruotiems darbdaviams',1),
('application_only','Matomas tik kai kandidatuoju',2),
('hidden','Paslėptas',3);
create table public.competencies (professional_role_code text references public.professional_roles(code), code text, label_lt text not null, category text not null, sort_order smallint not null, is_active boolean not null default true, primary key(professional_role_code,code));
insert into public.competencies(professional_role_code,code,label_lt,category,sort_order) values ('veterinarian','veterinarian_01','IV kateterio įvedimas','procedures',1),
('veterinarian','veterinarian_02','Žaizdų sutvarkymas ir siuvimas','procedures',2),
('veterinarian','veterinarian_03','Kraujo tyrimų interpretacija','lab_diagnostics',3),
('veterinarian','veterinarian_04','Šlapimo tyrimų vertinimas','lab_diagnostics',4),
('veterinarian','veterinarian_05','Hormoninių tyrimų interpretacija','lab_diagnostics',5),
('veterinarian','veterinarian_06','Citologinių mėginių vertinimas','lab_diagnostics',6),
('veterinarian','veterinarian_07','Rentgenografija / rentgenogramų vertinimas','lab_diagnostics',7),
('veterinarian','veterinarian_08','Ultragarsinis tyrimas','lab_diagnostics',8),
('veterinarian','veterinarian_09','Kompiuterinė tomografija (KT)','lab_diagnostics',9),
('veterinarian','veterinarian_10','Magnetinis rezonansas (MRT)','lab_diagnostics',10),
('veterinarian','veterinarian_11','Anestezijos valdymas ir monitoringas','anesthesia_surgery',11),
('veterinarian','veterinarian_12','Minkštųjų audinių chirurgija','anesthesia_surgery',12),
('veterinarian','veterinarian_13','Ortopedinė chirurgija / procedūros','anesthesia_surgery',13),
('veterinarian','veterinarian_14','Bendroji praktika','clinical_areas',14),
('veterinarian','veterinarian_15','Vidaus ligos','clinical_areas',15),
('veterinarian','veterinarian_16','Dermatologija','clinical_areas',16),
('veterinarian','veterinarian_17','Chirurgija','clinical_areas',17),
('veterinarian','veterinarian_18','Ortopedija','clinical_areas',18),
('veterinarian','veterinarian_19','Neurologija','clinical_areas',19),
('veterinarian','veterinarian_20','Odontologija','clinical_areas',20),
('veterinarian','veterinarian_21','Anesteziologija','clinical_areas',21),
('veterinarian','veterinarian_22','Skubi pagalba / intensyvi terapija','clinical_areas',22),
('veterinarian','veterinarian_23','Reprodukcija','clinical_areas',23),
('veterinarian','veterinarian_24','Egzotinių gyvūnų medicina','clinical_areas',24),
('veterinary_assistant','veterinary_assistant_01','Paciento paruošimas konsultacijai / procedūrai','patient_care',25),
('veterinary_assistant','veterinary_assistant_02','Stacionaro pacientų priežiūra','patient_care',26),
('veterinary_assistant','veterinary_assistant_03','Pooperacinė priežiūra','patient_care',27),
('veterinary_assistant','veterinary_assistant_04','Paciento būklės stebėjimas ir pokyčių atpažinimas','patient_care',28),
('veterinary_assistant','veterinary_assistant_05','Gyvybinių rodiklių matavimas','patient_care',29),
('veterinary_assistant','veterinary_assistant_06','Injekcijų atlikimas','procedures',30),
('veterinary_assistant','veterinary_assistant_07','IV kateterio įvedimas','procedures',31),
('veterinary_assistant','veterinary_assistant_08','Kraujo paėmimas','procedures',32),
('veterinary_assistant','veterinary_assistant_09','Mėginių paėmimas laboratoriniams tyrimams','procedures',33),
('veterinary_assistant','veterinary_assistant_10','Žaizdų priežiūra ir tvarsčių keitimas','procedures',34),
('veterinary_assistant','veterinary_assistant_11','Paciento fiksavimas procedūroms','procedures',35),
('veterinary_assistant','veterinary_assistant_12','Paciento paruošimas anestezijai','anesthesia_operating_room',36),
('veterinary_assistant','veterinary_assistant_13','Anestezijos monitoringo atlikimas prižiūrint gydytojui','anesthesia_operating_room',37),
('veterinary_assistant','veterinary_assistant_14','Paciento priežiūra pabudimo metu','anesthesia_operating_room',38),
('veterinary_assistant','veterinary_assistant_15','Operacinės ir instrumentų paruošimas','anesthesia_operating_room',39),
('veterinary_assistant','veterinary_assistant_16','Instrumentų sterilizacija','anesthesia_operating_room',40),
('veterinary_assistant','veterinary_assistant_17','Asistavimas operacijos metu','anesthesia_operating_room',41),
('veterinary_assistant','veterinary_assistant_18','Pagalba atliekant rentgenografiją','diagnostic_support',42),
('veterinary_assistant','veterinary_assistant_19','Pagalba atliekant ultragarsinį tyrimą','diagnostic_support',43),
('veterinary_assistant','veterinary_assistant_20','Laboratorinės įrangos / analizatorių naudojimas','diagnostic_support',44),
('veterinary_assistant','veterinary_assistant_21','Medicininės dokumentacijos pildymas','clinic_operations',45),
('veterinary_assistant','veterinary_assistant_22','Vaistų ir priemonių paruošimas pagal gydytojo nurodymą','clinic_operations',46),
('veterinary_assistant','veterinary_assistant_23','Klientų konsultavimas dėl gydytojo paskirto gydymo / priežiūros','clinic_operations',47),
('veterinary_assistant','veterinary_assistant_24','Registratūros / klientų aptarnavimo darbai','clinic_operations',48),
('veterinary_student','veterinary_student_01','Paciento fiksavimas ir paruošimas apžiūrai','basic_clinical',49),
('veterinary_student','veterinary_student_02','Anamnezės surinkimas prižiūrint gydytojui','basic_clinical',50),
('veterinary_student','veterinary_student_03','Klinikinės apžiūros atlikimas prižiūrint gydytojui','basic_clinical',51),
('veterinary_student','veterinary_student_04','Gyvybinių rodiklių vertinimas','basic_clinical',52),
('veterinary_student','veterinary_student_05','Injekcijų atlikimas','procedures',53),
('veterinary_student','veterinary_student_06','IV kateterio įvedimas','procedures',54),
('veterinary_student','veterinary_student_07','Kraujo paėmimas','procedures',55),
('veterinary_student','veterinary_student_08','Mėginių paėmimas laboratoriniams tyrimams','procedures',56),
('veterinary_student','veterinary_student_09','Žaizdų priežiūra / tvarsčių keitimas','procedures',57),
('veterinary_student','veterinary_student_10','Kraujo tyrimų bazinis vertinimas','diagnostics',58),
('veterinary_student','veterinary_student_11','Šlapimo tyrimų bazinis vertinimas','diagnostics',59),
('veterinary_student','veterinary_student_12','Pagalba atliekant rentgenografiją','diagnostics',60),
('veterinary_student','veterinary_student_13','Pagalba atliekant ultragarsinį tyrimą','diagnostics',61),
('veterinary_student','veterinary_student_14','Citologinių mėginių paruošimas / bazinis vertinimas','diagnostics',62),
('veterinary_student','veterinary_student_15','Paciento paruošimas anestezijai','anesthesia_surgery',63),
('veterinary_student','veterinary_student_16','Anestezijos monitoringo pagrindai','anesthesia_surgery',64),
('veterinary_student','veterinary_student_17','Asistavimas operacijos metu','anesthesia_surgery',65),
('veterinary_student','veterinary_student_18','Operacinės ir instrumentų paruošimas','anesthesia_surgery',66),
('veterinary_student','veterinary_student_19','Stacionaro pacientų priežiūra','patient_care',67),
('veterinary_student','veterinary_student_20','Pooperacinė priežiūra','patient_care',68),
('veterinary_student','veterinary_student_21','Paciento būklės pokyčių atpažinimas','patient_care',69),
('veterinary_student','veterinary_student_22','Medicininės dokumentacijos pildymas prižiūrint gydytojui','communication_documentation',70),
('veterinary_student','veterinary_student_23','Bendravimas su gyvūno savininku klinikinėje aplinkoje','communication_documentation',71),
('veterinary_pharmacy','veterinary_pharmacy_01','Veterinarinių vaistų grupių ir jų paskirties išmanymas','veterinary_medicines',72),
('veterinary_pharmacy','veterinary_pharmacy_02','Veterinarinių vaistų išdavimas pagal nustatytą tvarką','veterinary_medicines',73),
('veterinary_pharmacy','veterinary_pharmacy_03','Receptų / paskyrimų supratimas ir vykdymas','veterinary_medicines',74),
('veterinary_pharmacy','veterinary_pharmacy_04','Vaistų dozių ir vartojimo instrukcijų supratimas','veterinary_medicines',75),
('veterinary_pharmacy','veterinary_pharmacy_05','Kontraindikacijų, atsargumo priemonių ir galimų nepageidaujamų reakcijų supratimas','veterinary_medicines',76),
('veterinary_pharmacy','veterinary_pharmacy_06','Gyvūno savininko konsultavimas dėl veterinarinių preparatų naudojimo','customer_consulting',77),
('veterinary_pharmacy','veterinary_pharmacy_07','Antiparazitinių preparatų konsultacija pagal indikacijas','customer_consulting',78),
('veterinary_pharmacy','veterinary_pharmacy_08','Odos / ausų priežiūros produktų konsultacija','customer_consulting',79),
('veterinary_pharmacy','veterinary_pharmacy_09','Papildų / gyvūnų sveikatos produktų konsultacija','customer_consulting',80),
('veterinary_pharmacy','veterinary_pharmacy_10','Atpažinimas, kada klientą būtina nukreipti pas veterinarijos gydytoją','customer_consulting',81),
('veterinary_pharmacy','veterinary_pharmacy_11','Veterinarinių vaistų saugojimo reikalavimų laikymasis','pharmacy_operations',82),
('veterinary_pharmacy','veterinary_pharmacy_12','Temperatūros / šaldymo grandinės kontrolė','pharmacy_operations',83),
('veterinary_pharmacy','veterinary_pharmacy_13','Galiojimo terminų kontrolė','pharmacy_operations',84),
('veterinary_pharmacy','veterinary_pharmacy_14','Atsargų ir užsakymų valdymas','pharmacy_operations',85),
('veterinary_pharmacy','veterinary_pharmacy_15','Prekių priėmimas ir apskaita','pharmacy_operations',86),
('veterinary_pharmacy','veterinary_pharmacy_16','Privalomos veterinarinių vaistų dokumentacijos tvarkymas','documentation_safety',87),
('veterinary_pharmacy','veterinary_pharmacy_17','Receptinių preparatų apskaitos procesai','documentation_safety',88),
('veterinary_pharmacy','veterinary_pharmacy_18','Nepageidaujamų reakcijų / farmakologinio budrumo informacijos atpažinimas ir perdavimas','documentation_safety',89),
('veterinary_pharmacy','veterinary_pharmacy_19','Klientų aptarnavimas','commercial',90),
('veterinary_pharmacy','veterinary_pharmacy_20','Produktų pristatymas ir rekomendavimas pagal kliento poreikį','commercial',91),
('veterinary_pharmacy','veterinary_pharmacy_21','Darbas su vaistinės asortimentu','commercial',92),
('animal_health_commerce','animal_health_commerce_01','B2B pardavimai','sales_clients',93),
('animal_health_commerce','animal_health_commerce_02','Aktyvi naujų klientų paieška','sales_clients',94),
('animal_health_commerce','animal_health_commerce_03','Esamų klientų portfelio valdymas','sales_clients',95),
('animal_health_commerce','animal_health_commerce_04','Kliento poreikių išgryninimas','sales_clients',96),
('animal_health_commerce','animal_health_commerce_05','Komercinių pasiūlymų rengimas','sales_clients',97),
('animal_health_commerce','animal_health_commerce_06','Derybų vedimas','sales_clients',98),
('animal_health_commerce','animal_health_commerce_07','Pardavimo uždarymas','sales_clients',99),
('animal_health_commerce','animal_health_commerce_08','Darbas su veterinarijos klinikomis','market_clients',100),
('animal_health_commerce','animal_health_commerce_09','Darbas su veterinarijos vaistinėmis','market_clients',101),
('animal_health_commerce','animal_health_commerce_10','Darbas su ūkiais / gyvulininkystės įmonėmis','market_clients',102),
('animal_health_commerce','animal_health_commerce_11','Darbas su distributoriais / didmena','market_clients',103),
('animal_health_commerce','animal_health_commerce_12','Veterinarinių vaistų / gyvūnų sveikatos produktų pristatymas','product_technical',104),
('animal_health_commerce','animal_health_commerce_13','Produkto indikacijų ir pagrindinių savybių paaiškinimas','product_technical',105),
('animal_health_commerce','animal_health_commerce_14','Konkurentų produktų ir rinkos išmanymas','product_technical',106),
('animal_health_commerce','animal_health_commerce_15','Mokslinės / techninės informacijos pristatymas klientui','product_technical',107),
('animal_health_commerce','animal_health_commerce_16','Produktų prezentacijų vedimas','presentations_training',108),
('animal_health_commerce','animal_health_commerce_17','Klientų mokymų vedimas','presentations_training',109),
('animal_health_commerce','animal_health_commerce_18','Seminarų / renginių vedimas','presentations_training',110),
('animal_health_commerce','animal_health_commerce_19','Viešas kalbėjimas','presentations_training',111),
('animal_health_commerce','animal_health_commerce_20','Key Account Management','account_management',112),
('animal_health_commerce','animal_health_commerce_21','Santykių su sprendimų priėmėjais kūrimas','account_management',113),
('animal_health_commerce','animal_health_commerce_22','Kliento potencialo ir pardavimo galimybių vertinimas','account_management',114),
('animal_health_commerce','animal_health_commerce_23','Pardavimo plano / teritorijos planavimas','account_management',115),
('animal_health_commerce','animal_health_commerce_24','Savarankiškas vizitų planavimas','work_organization',116),
('animal_health_commerce','animal_health_commerce_25','CRM / klientų duomenų valdymas','work_organization',117),
('animal_health_commerce','animal_health_commerce_26','Darbas pagal pardavimo tikslus / KPI','work_organization',118),
('animal_health_commerce','animal_health_commerce_27','Reguliarus keliavimas darbo tikslais','work_organization',119);
create table public.professional_role_interests (professional_role_code text references public.professional_roles(code), interest_code text references public.professional_interests(code), primary key(professional_role_code,interest_code));
insert into public.professional_role_interests select 'veterinarian',code from public.professional_interests;
-- Preserve account IDs and the old role only for the transition.
alter table public.profiles add column updated_at timestamptz not null default now();
create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create table private.account_admins (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 granted_at timestamptz not null default now(), source text not null
);
alter table private.account_admins enable row level security;
revoke all on private.account_admins from public,anon,authenticated;
insert into private.account_admins(user_id,source) select id,'legacy_trusted_role' from public.profiles where role='admin';
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select private.has_active_session() and exists(select 1 from private.account_admins where user_id=auth.uid());
$$;

create table public.locations (
 code text primary key, label_lt text not null, kind text not null check(kind in ('municipality','city','abroad','nationwide')),
 is_active boolean not null default true
);
-- The Lithuanian municipality seed is recorded separately below with its source.
insert into public.locations values ('abroad','Užsienis','abroad',true),('nationwide','Visa Lietuva','nationwide',true);

alter table public.specialist_profiles
 add column first_name text check(first_name is null or length(btrim(first_name)) between 1 and 100),
 add column last_name text check(last_name is null or length(btrim(last_name)) between 1 and 100),
 add column professional_role_code text references public.professional_roles(code),
 add column specialty_free_text text check(specialty_free_text is null or length(btrim(specialty_free_text)) between 1 and 200),
 add column home_location_code text references public.locations(code),
 add column home_country text check(home_country is null or length(btrim(home_country)) between 1 and 100),
 add column home_city text check(home_city is null or length(btrim(home_city)) between 1 and 100),
 add column experience_band_code text references public.experience_bands(code),
 add column about_me text check(length(about_me)<=500),
 add column job_search_status_code text references public.job_search_statuses(code),
 add column mobility_code text references public.mobility_options(code),
 add column start_option_code text references public.start_options(code),
 add column start_date date,
 add column work_model_code text references public.work_models(code),
 add column can_work_weekends boolean,
 add column can_work_nights boolean,
 add column can_be_on_call boolean,
 add column profile_visibility text not null default 'application_only' references public.visibility_options(code),
 add constraint specialist_other_text check(professional_role_code is distinct from 'other_veterinary_specialty' or specialty_free_text is not null),
 add constraint specialist_home check(home_location_code is distinct from 'nationwide' and (home_location_code is distinct from 'abroad' or (home_country is not null and home_city is not null))),
 add constraint specialist_start check((start_option_code='specific_date' and start_date is not null) or (start_option_code is distinct from 'specific_date' and start_date is null));

alter table public.employer_profiles alter column organization_id drop not null;
alter table public.employer_profiles
 add column organization_name_input text check(organization_name_input is null or length(btrim(organization_name_input)) between 1 and 200),
 add column organization_type_code text references public.organization_types(code),
 add column organization_type_other text check(organization_type_other is null or length(btrim(organization_type_other)) between 1 and 200),
 add constraint employer_other_text check(organization_type_code is distinct from 'other' or organization_type_other is not null);

create table public.organization_memberships (
 user_id uuid references public.employer_profiles(user_id) on delete cascade,
 organization_id uuid references public.organizations(id) on delete restrict,
 created_at timestamptz not null default now(), revoked_at timestamptz,
 primary key(user_id,organization_id)
);
insert into public.organization_memberships(user_id,organization_id,created_at)
 select user_id,organization_id,created_at from public.employer_profiles where organization_id is not null;
alter table public.jobs drop constraint jobs_created_by_organization_id_fkey;
alter table public.jobs add constraint jobs_membership_fkey foreign key(created_by,organization_id)
 references public.organization_memberships(user_id,organization_id) on delete restrict;
create index organization_memberships_organization_idx on public.organization_memberships(organization_id,user_id);
drop policy organizations_read_member_or_admin on public.organizations;
drop policy jobs_read_member_or_admin on public.jobs;
create policy organizations_read_member_or_admin on public.organizations for select to authenticated using (
 (select private.is_admin()) or id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and revoked_at is null));
create policy jobs_read_member_or_admin on public.jobs for select to authenticated using (
 (select private.is_admin()) or organization_id in (select organization_id from public.organization_memberships where user_id=(select auth.uid()) and revoked_at is null));

create table public.specialist_education (
 user_id uuid references public.specialist_profiles(user_id) on delete cascade,
 professional_role_code text references public.professional_roles(code),
 institution_code text check(institution_code in ('lsmu','other')),
 institution_name text check(institution_name is null or length(btrim(institution_name)) between 1 and 200),
 country text check(country is null or length(btrim(country)) between 1 and 100),
 program_or_qualification text check(program_or_qualification is null or length(btrim(program_or_qualification)) between 1 and 200),
 graduation_year smallint check(graduation_year between 1900 and 2200),
 current_course smallint check(current_course between 1 and 6),
 current_course_or_study_year text check(current_course_or_study_year is null or length(btrim(current_course_or_study_year)) between 1 and 100),
 updated_at timestamptz not null default now(),
 primary key(user_id,professional_role_code),
 constraint education_shape check (
  case when professional_role_code in ('veterinarian','veterinary_student') then
    institution_code is not null and (
     (institution_code='lsmu' and program_or_qualification='veterinary_medicine' and (professional_role_code<>'veterinary_student' or current_course is not null)) or
     (institution_code='other' and institution_name is not null and country is not null and program_or_qualification is not null and (professional_role_code<>'veterinary_student' or current_course_or_study_year is not null))
    )
  else institution_code is null and institution_name is not null and program_or_qualification is not null end
 is true)
);
create table public.specialist_interests (
 user_id uuid references public.specialist_profiles(user_id) on delete cascade,
 professional_role_code text not null, interest_code text not null,
 primary key(user_id,professional_role_code,interest_code),
 foreign key(professional_role_code,interest_code) references public.professional_role_interests(professional_role_code,interest_code)
);
create table public.specialist_languages (
 user_id uuid references public.specialist_profiles(user_id) on delete cascade,
 language_code text references public.languages(code),
 proficiency_code text not null references public.language_levels(code),
 language_name text check(language_name is null or length(btrim(language_name)) between 1 and 100),
 primary key(user_id,language_code), check(language_code<>'other' or language_name is not null)
);
create table public.specialist_competencies (
 user_id uuid references public.specialist_profiles(user_id) on delete cascade,
 professional_role_code text not null, competency_code text not null, level text not null,
 primary key(user_id,professional_role_code,competency_code),
 foreign key(professional_role_code,competency_code) references public.competencies(professional_role_code,code),
 check(case when professional_role_code='veterinary_student' then level in ('theory_only','with_assistance','supervised_confident') else level in ('with_assistance','independent','can_teach') end)
);
create table public.specialist_custom_competencies (
 user_id uuid references public.specialist_profiles(user_id) on delete cascade,
 professional_role_code text not null default 'other_veterinary_specialty' references public.professional_roles(code) check(professional_role_code='other_veterinary_specialty'),
 slot smallint check(slot between 1 and 5),
 name text not null check(length(btrim(name)) between 1 and 200),
 level text not null check(level in ('with_assistance','independent','can_teach')),
 primary key(user_id,slot), unique(user_id,name)
);
create table public.development_areas (
 professional_role_code text references public.professional_roles(code), code text, label_lt text not null,
 is_active boolean not null default true, primary key(professional_role_code,code)
);
insert into public.development_areas select 'veterinarian',code,label_lt,true from public.professional_interests;
insert into public.development_areas values ('veterinarian','other','Kita',true);
create table public.autonomy_options (
 professional_role_code text references public.professional_roles(code), code text, label_lt text not null,
 is_active boolean not null default true, primary key(professional_role_code,code)
);
insert into public.autonomy_options values
 ('veterinarian','frequent_help','Reikalinga dažna kolegos pagalba',true),
 ('veterinarian','usual_independent','Daugumą įprastų atvejų valdau savarankiškai',true),
 ('veterinarian','complex_independent','Savarankiškai valdau ir sudėtingesnius atvejus',true),
 ('veterinarian','mentor','Galiu konsultuoti / mokyti kolegas',true);
create table public.specialist_autonomy (
 user_id uuid references public.specialist_profiles(user_id) on delete cascade,
 professional_role_code text, autonomy_code text not null, primary key(user_id,professional_role_code),
 foreign key(professional_role_code,autonomy_code) references public.autonomy_options(professional_role_code,code)
);
create table public.specialist_development_areas (
 user_id uuid references public.specialist_profiles(user_id) on delete cascade,
 professional_role_code text, area_code text, primary key(user_id,professional_role_code,area_code),
 foreign key(professional_role_code,area_code) references public.development_areas(professional_role_code,code)
);
create table public.specialist_custom_development (
 user_id uuid references public.specialist_profiles(user_id) on delete cascade,
 professional_role_code text not null default 'other_veterinary_specialty' references public.professional_roles(code) check(professional_role_code='other_veterinary_specialty'),
 name text check(length(btrim(name)) between 1 and 200), primary key(user_id,name)
);

create table private.specialist_licenses (
 user_id uuid references public.specialist_profiles(user_id) on delete cascade,
 professional_role_code text not null default 'veterinarian' references public.professional_roles(code) check(professional_role_code='veterinarian'),
 license_number text not null check(length(btrim(license_number)) between 1 and 200),
 verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected')),
 revision integer not null default 1 check(revision>0), reviewed_revision integer,
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
 updated_at timestamptz not null default now(), primary key(user_id,professional_role_code),
 check((verification_status='pending' and reviewed_revision is null and reviewed_by is null and reviewed_at is null) or
 (verification_status in ('verified','rejected') and reviewed_revision=revision and reviewed_by is not null and reviewed_by<>user_id and reviewed_at is not null))
);
create table private.license_reviews (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.specialist_profiles(user_id) on delete cascade,
 revision integer not null, decision text not null check(decision in ('verified','rejected')),
 reviewed_by uuid not null references public.profiles(id), reviewed_at timestamptz not null default now()
);
create index license_reviews_user_idx on private.license_reviews(user_id);
create index license_reviews_reviewer_idx on private.license_reviews(reviewed_by);
create index specialist_licenses_reviewer_idx on private.specialist_licenses(reviewed_by);

-- No names, profession, organization or new authorization is fabricated.
insert into public.specialist_profiles(user_id,first_name,last_name)
 select p.id,case when length(btrim(u.raw_user_meta_data->>'first_name')) between 1 and 100 then btrim(u.raw_user_meta_data->>'first_name') end,
 case when length(btrim(u.raw_user_meta_data->>'last_name')) between 1 and 100 then btrim(u.raw_user_meta_data->>'last_name') end
 from public.profiles p join auth.users u on p.id=u.id where p.role='specialist' on conflict(user_id) do nothing;
insert into public.employer_profiles(user_id) select id from public.profiles where role='employer' on conflict(user_id) do nothing;
comment on column public.profiles.role is 'Read-only legacy compatibility. Capabilities use actual profile rows and private.account_admins.';
comment on column public.employer_profiles.organization_id is 'Read-only legacy mirror; organization_memberships is authoritative after Stage 4.3.';

create table public.specialist_animal_groups(user_id uuid references public.specialist_profiles(user_id) on delete cascade,animal_group_code text references public.animal_groups(code),primary key(user_id,animal_group_code));
create index specialist_animal_groups_choice_idx on public.specialist_animal_groups(animal_group_code,user_id);
create table public.specialist_activity_areas(user_id uuid references public.specialist_profiles(user_id) on delete cascade,activity_area_code text references public.activity_areas(code),primary key(user_id,activity_area_code));
create index specialist_activity_areas_choice_idx on public.specialist_activity_areas(activity_area_code,user_id);
create table public.specialist_work_locations(user_id uuid references public.specialist_profiles(user_id) on delete cascade,location_code text references public.locations(code),primary key(user_id,location_code));
create index specialist_work_locations_choice_idx on public.specialist_work_locations(location_code,user_id);
create table public.specialist_workloads(user_id uuid references public.specialist_profiles(user_id) on delete cascade,workload_code text references public.workloads(code),primary key(user_id,workload_code));
create index specialist_workloads_choice_idx on public.specialist_workloads(workload_code,user_id);
create table public.specialist_schedules(user_id uuid references public.specialist_profiles(user_id) on delete cascade,schedule_code text references public.schedules(code),primary key(user_id,schedule_code));
create index specialist_schedules_choice_idx on public.specialist_schedules(schedule_code,user_id);
create role vetkarjera_profile_writer nologin noinherit; grant usage on schema public,private to vetkarjera_profile_writer; grant execute on function private.has_active_session(),private.is_admin() to vetkarjera_profile_writer;
-- Supabase's postgres migration role is not a superuser. Ownership transfer
-- requires SET membership and CREATE on the target schema (PostgreSQL 17).
-- These temporary migration privileges are removed before this transaction commits.
grant vetkarjera_profile_writer to current_user with set true;
grant vetkarjera_profile_writer to current_user with inherit true;
grant create on schema private to vetkarjera_profile_writer;
alter table public.professional_roles enable row level security; revoke all on public.professional_roles from public,anon,authenticated; grant select on public.professional_roles to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.professional_roles for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.organization_types enable row level security; revoke all on public.organization_types from public,anon,authenticated; grant select on public.organization_types to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.organization_types for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.experience_bands enable row level security; revoke all on public.experience_bands from public,anon,authenticated; grant select on public.experience_bands to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.experience_bands for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.animal_groups enable row level security; revoke all on public.animal_groups from public,anon,authenticated; grant select on public.animal_groups to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.animal_groups for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.activity_areas enable row level security; revoke all on public.activity_areas from public,anon,authenticated; grant select on public.activity_areas to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.activity_areas for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.professional_interests enable row level security; revoke all on public.professional_interests from public,anon,authenticated; grant select on public.professional_interests to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.professional_interests for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.job_search_statuses enable row level security; revoke all on public.job_search_statuses from public,anon,authenticated; grant select on public.job_search_statuses to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.job_search_statuses for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.workloads enable row level security; revoke all on public.workloads from public,anon,authenticated; grant select on public.workloads to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.workloads for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.schedules enable row level security; revoke all on public.schedules from public,anon,authenticated; grant select on public.schedules to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.schedules for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.mobility_options enable row level security; revoke all on public.mobility_options from public,anon,authenticated; grant select on public.mobility_options to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.mobility_options for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.start_options enable row level security; revoke all on public.start_options from public,anon,authenticated; grant select on public.start_options to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.start_options for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.work_models enable row level security; revoke all on public.work_models from public,anon,authenticated; grant select on public.work_models to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.work_models for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.languages enable row level security; revoke all on public.languages from public,anon,authenticated; grant select on public.languages to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.languages for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.language_levels enable row level security; revoke all on public.language_levels from public,anon,authenticated; grant select on public.language_levels to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.language_levels for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.visibility_options enable row level security; revoke all on public.visibility_options from public,anon,authenticated; grant select on public.visibility_options to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.visibility_options for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.locations enable row level security; revoke all on public.locations from public,anon,authenticated; grant select on public.locations to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.locations for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.competencies enable row level security; revoke all on public.competencies from public,anon,authenticated; grant select on public.competencies to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.competencies for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.professional_role_interests enable row level security; revoke all on public.professional_role_interests from public,anon,authenticated; grant select on public.professional_role_interests to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.professional_role_interests for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.development_areas enable row level security; revoke all on public.development_areas from public,anon,authenticated; grant select on public.development_areas to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.development_areas for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.autonomy_options enable row level security; revoke all on public.autonomy_options from public,anon,authenticated; grant select on public.autonomy_options to anon,authenticated,vetkarjera_profile_writer; create policy catalog_read on public.autonomy_options for select to anon,authenticated,vetkarjera_profile_writer using(true);
alter table public.specialist_profiles enable row level security; revoke all on public.specialist_profiles from public,anon,authenticated; grant select on public.specialist_profiles to authenticated; grant select,insert,update,delete on public.specialist_profiles to vetkarjera_profile_writer;
create policy writer_own on public.specialist_profiles for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_profiles as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
alter table public.employer_profiles enable row level security; revoke all on public.employer_profiles from public,anon,authenticated; grant select on public.employer_profiles to authenticated; grant select,insert,update,delete on public.employer_profiles to vetkarjera_profile_writer;
create policy writer_own on public.employer_profiles for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.employer_profiles as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
alter table public.specialist_education enable row level security; revoke all on public.specialist_education from public,anon,authenticated; grant select on public.specialist_education to authenticated; grant select,insert,update,delete on public.specialist_education to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_education for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_education for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_education as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
create index specialist_education_role_idx on public.specialist_education(professional_role_code,user_id);
alter table public.specialist_interests enable row level security; revoke all on public.specialist_interests from public,anon,authenticated; grant select on public.specialist_interests to authenticated; grant select,insert,update,delete on public.specialist_interests to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_interests for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_interests for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_interests as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
create index specialist_interests_role_idx on public.specialist_interests(professional_role_code,user_id);
alter table public.specialist_languages enable row level security; revoke all on public.specialist_languages from public,anon,authenticated; grant select on public.specialist_languages to authenticated; grant select,insert,update,delete on public.specialist_languages to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_languages for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_languages for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_languages as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
alter table public.specialist_competencies enable row level security; revoke all on public.specialist_competencies from public,anon,authenticated; grant select on public.specialist_competencies to authenticated; grant select,insert,update,delete on public.specialist_competencies to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_competencies for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_competencies for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_competencies as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
create index specialist_competencies_role_idx on public.specialist_competencies(professional_role_code,user_id);
alter table public.specialist_custom_competencies enable row level security; revoke all on public.specialist_custom_competencies from public,anon,authenticated; grant select on public.specialist_custom_competencies to authenticated; grant select,insert,update,delete on public.specialist_custom_competencies to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_custom_competencies for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_custom_competencies for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_custom_competencies as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
alter table public.specialist_autonomy enable row level security; revoke all on public.specialist_autonomy from public,anon,authenticated; grant select on public.specialist_autonomy to authenticated; grant select,insert,update,delete on public.specialist_autonomy to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_autonomy for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_autonomy for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_autonomy as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
create index specialist_autonomy_role_idx on public.specialist_autonomy(professional_role_code,user_id);
alter table public.specialist_development_areas enable row level security; revoke all on public.specialist_development_areas from public,anon,authenticated; grant select on public.specialist_development_areas to authenticated; grant select,insert,update,delete on public.specialist_development_areas to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_development_areas for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_development_areas for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_development_areas as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
create index specialist_development_areas_role_idx on public.specialist_development_areas(professional_role_code,user_id);
alter table public.specialist_custom_development enable row level security; revoke all on public.specialist_custom_development from public,anon,authenticated; grant select on public.specialist_custom_development to authenticated; grant select,insert,update,delete on public.specialist_custom_development to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_custom_development for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_custom_development for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_custom_development as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
alter table public.specialist_animal_groups enable row level security; revoke all on public.specialist_animal_groups from public,anon,authenticated; grant select on public.specialist_animal_groups to authenticated; grant select,insert,update,delete on public.specialist_animal_groups to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_animal_groups for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_animal_groups for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_animal_groups as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
alter table public.specialist_activity_areas enable row level security; revoke all on public.specialist_activity_areas from public,anon,authenticated; grant select on public.specialist_activity_areas to authenticated; grant select,insert,update,delete on public.specialist_activity_areas to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_activity_areas for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_activity_areas for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_activity_areas as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
alter table public.specialist_work_locations enable row level security; revoke all on public.specialist_work_locations from public,anon,authenticated; grant select on public.specialist_work_locations to authenticated; grant select,insert,update,delete on public.specialist_work_locations to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_work_locations for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_work_locations for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_work_locations as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
alter table public.specialist_workloads enable row level security; revoke all on public.specialist_workloads from public,anon,authenticated; grant select on public.specialist_workloads to authenticated; grant select,insert,update,delete on public.specialist_workloads to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_workloads for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_workloads for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_workloads as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
alter table public.specialist_schedules enable row level security; revoke all on public.specialist_schedules from public,anon,authenticated; grant select on public.specialist_schedules to authenticated; grant select,insert,update,delete on public.specialist_schedules to vetkarjera_profile_writer;
create policy owner_admin_read on public.specialist_schedules for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin()));
create policy writer_own on public.specialist_schedules for all to vetkarjera_profile_writer using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy active_session_v43 on public.specialist_schedules as restrictive for all to authenticated,vetkarjera_profile_writer using((select private.has_active_session())) with check((select private.has_active_session()));
grant select on public.profiles to vetkarjera_profile_writer; create policy writer_account_read on public.profiles for select to vetkarjera_profile_writer using(id=(select auth.uid()) and (select private.has_active_session()));
alter table public.organization_memberships enable row level security; revoke all on public.organization_memberships from public,anon,authenticated; grant select on public.organization_memberships to authenticated; create policy membership_read on public.organization_memberships for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin())); create policy membership_active on public.organization_memberships as restrictive for all to authenticated using((select private.has_active_session())) with check((select private.has_active_session()));
alter table private.specialist_licenses enable row level security; revoke all on private.specialist_licenses from public,anon,authenticated; grant select,insert on private.specialist_licenses to vetkarjera_profile_writer; create policy license_writer on private.specialist_licenses to vetkarjera_profile_writer using((user_id=(select auth.uid()) or (select private.is_admin())) and (select private.has_active_session())) with check((user_id=(select auth.uid()) or (select private.is_admin())) and (select private.has_active_session()));
alter table private.license_reviews enable row level security; revoke all on private.license_reviews from public,anon,authenticated; grant select,insert on private.license_reviews to vetkarjera_profile_writer; create policy license_writer on private.license_reviews to vetkarjera_profile_writer using((user_id=(select auth.uid()) or (select private.is_admin())) and (select private.has_active_session())) with check((user_id=(select auth.uid()) or (select private.is_admin())) and (select private.has_active_session()));
grant update on private.specialist_licenses to vetkarjera_profile_writer;
create function private.require_active() returns uuid language plpgsql security invoker set search_path='' as $$
declare uid uuid:=coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),
 nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid;
begin
 -- Same trusted PostgREST subject as auth.uid(). The existing privileged session
 -- checker proves that subject owns a live, confirmed Auth session. The writer
 -- itself needs no namespace access to Supabase's platform-owned auth schema.
 if uid is null or not private.has_active_session() then raise exception 'Active confirmed session required' using errcode='42501'; end if; return uid; end $$;
revoke all on function private.require_active() from public,anon; grant execute on function private.require_active() to authenticated,vetkarjera_profile_writer;
create function private.valid_text(value text, maximum integer) returns boolean language sql immutable set search_path='' as $$ select coalesce(length(btrim(value)) between 1 and maximum,false) $$;
revoke all on function private.valid_text(text,integer) from public,anon; grant execute on function private.valid_text(text,integer) to authenticated,vetkarjera_profile_writer;
create function private.require_keys(payload jsonb, allowed text[]) returns void language plpgsql set search_path='' as $$ begin
 if payload is null or jsonb_typeof(payload)<>'object' or octet_length(payload::text)>64000 or exists(select 1 from jsonb_object_keys(payload) k where not(k=any(allowed))) then raise exception 'Invalid payload fields' using errcode='22023'; end if;
 if exists(select 1 from jsonb_each(payload) e where
   case when e.key in ('animal_groups','activity_areas','work_locations','workloads','schedules','interests','languages','competencies','development_areas','custom_competencies','custom_development') then jsonb_typeof(e.value)<>'array'
   when e.key in ('can_work_weekends','can_work_nights','can_be_on_call') then jsonb_typeof(e.value) not in ('boolean','null')
   when e.key in ('graduation_year','current_course') then jsonb_typeof(e.value) not in ('number','null')
   else jsonb_typeof(e.value) not in ('string','null') end
 ) then raise exception 'Invalid field type' using errcode='22023'; end if;
end $$; revoke all on function private.require_keys(jsonb,text[]) from public,anon; grant execute on function private.require_keys(jsonb,text[]) to authenticated,vetkarjera_profile_writer;

create function private.save_specialist_step1(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_active(); profession text:=payload->>'professional_role_code'; begin
 perform private.require_keys(payload,array['first_name','last_name','professional_role_code','specialty_free_text']);
 if not private.valid_text(payload->>'first_name',100) or not private.valid_text(payload->>'last_name',100) or
 not exists(select 1 from public.professional_roles where code=profession and is_active) or
 (profession='other_veterinary_specialty' and not private.valid_text(payload->>'specialty_free_text',200)) then
 raise exception 'Invalid specialist registration fields' using errcode='22023'; end if;
 insert into public.specialist_profiles(user_id,first_name,last_name,professional_role_code,specialty_free_text)
 values(uid,btrim(payload->>'first_name'),btrim(payload->>'last_name'),profession,nullif(btrim(payload->>'specialty_free_text'),''))
 on conflict(user_id) do update set first_name=excluded.first_name,last_name=excluded.last_name,
 professional_role_code=excluded.professional_role_code,specialty_free_text=coalesce(excluded.specialty_free_text,public.specialist_profiles.specialty_free_text);
 -- Education, interests, competencies and licenses intentionally retain their role context.
end $$;
create function private.save_employer_step1(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_active(); kind text:=payload->>'organization_type_code'; begin
 perform private.require_keys(payload,array['organization_name_input','organization_type_code','organization_type_other']);
 if not private.valid_text(payload->>'organization_name_input',200) or not exists(select 1 from public.organization_types where code=kind and is_active) or
 (kind='other' and not private.valid_text(payload->>'organization_type_other',200)) then raise exception 'Invalid employer registration fields' using errcode='22023'; end if;
 insert into public.employer_profiles(user_id,organization_name_input,organization_type_code,organization_type_other)
 values(uid,btrim(payload->>'organization_name_input'),kind,nullif(btrim(payload->>'organization_type_other'),''))
 on conflict(user_id) do update set organization_name_input=excluded.organization_name_input,organization_type_code=excluded.organization_type_code,organization_type_other=excluded.organization_type_other;
 -- Never creates an organization, membership or another Auth account.
end $$;

create function private.save_education(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_active(); profession text; begin
 perform private.require_keys(payload,array['institution_code','institution_name','country','program_or_qualification','graduation_year','current_course','current_course_or_study_year']);
 select professional_role_code into profession from public.specialist_profiles where user_id=uid for update;
 if profession is null then raise exception 'Complete specialist STEP 1 first' using errcode='22023'; end if;
 insert into public.specialist_education(user_id,professional_role_code,institution_code,institution_name,country,program_or_qualification,graduation_year,current_course,current_course_or_study_year)
 values(uid,profession,payload->>'institution_code',nullif(btrim(payload->>'institution_name'),''),nullif(btrim(payload->>'country'),''),
 case when payload->>'institution_code'='lsmu' then 'veterinary_medicine' else nullif(btrim(payload->>'program_or_qualification'),'') end,
 (payload->>'graduation_year')::smallint,(payload->>'current_course')::smallint,nullif(btrim(payload->>'current_course_or_study_year'),''))
 on conflict(user_id,professional_role_code) do update set institution_code=excluded.institution_code,institution_name=excluded.institution_name,country=excluded.country,
 program_or_qualification=excluded.program_or_qualification,graduation_year=excluded.graduation_year,current_course=excluded.current_course,current_course_or_study_year=excluded.current_course_or_study_year,updated_at=now();
end $$;

create function private.save_license(number_input text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_active(); profession text; begin
 select professional_role_code into profession from public.specialist_profiles where user_id=uid for update;
 if profession is distinct from 'veterinarian' or not private.valid_text(number_input,200) then raise exception 'Invalid license input' using errcode='22023'; end if;
 insert into private.specialist_licenses(user_id,license_number) values(uid,btrim(number_input))
 on conflict(user_id,professional_role_code) do update set license_number=excluded.license_number,verification_status='pending',revision=private.specialist_licenses.revision+1,
 reviewed_revision=null,reviewed_by=null,reviewed_at=null,updated_at=now()
 where private.specialist_licenses.license_number is distinct from excluded.license_number;
end $$;
create function private.read_license(target_user_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.require_active(); result jsonb; begin
 if target_user_id is distinct from uid and not private.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 select jsonb_build_object('license_number',license_number,'verification_status',verification_status,'revision',revision,'reviewed_revision',reviewed_revision)
 into result from private.specialist_licenses where user_id=target_user_id;
 return result;
end $$;
create function private.review_license(target_user_id uuid,expected_revision integer,decision text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_active(); begin
 if not private.is_admin() or uid=target_user_id then raise exception 'Independent administrator required' using errcode='42501'; end if;
 if decision not in ('verified','rejected') or decision is null or expected_revision is null then raise exception 'Invalid review' using errcode='22023'; end if;
 update private.specialist_licenses set verification_status=decision,reviewed_revision=revision,reviewed_by=uid,reviewed_at=now(),updated_at=now()
 where user_id=target_user_id and revision=expected_revision;
 if not found then raise exception 'Stale license revision' using errcode='40001'; end if;
 insert into private.license_reviews(user_id,revision,decision,reviewed_by) values(target_user_id,expected_revision,decision,uid);
end $$;

-- Idempotent second-profile creation does not overwrite a profile if it already exists.
create function private.create_second_profile(kind text,payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_active(); begin
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if kind='specialist' then
  if not exists(select 1 from public.specialist_profiles where user_id=uid) then perform private.save_specialist_step1(payload); end if;
 elsif kind='employer' then
  if not exists(select 1 from public.employer_profiles where user_id=uid) then perform private.save_employer_step1(payload); end if;
 else raise exception 'Invalid profile kind' using errcode='22023'; end if;
end $$;

create function public.account_capabilities() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare uid uuid:=private.require_active(); begin
 if not exists(select 1 from public.profiles where id=uid) then return null; end if;
 return jsonb_build_object('id',uid,'hasSpecialistProfile',exists(select 1 from public.specialist_profiles where user_id=uid),
 'hasEmployerProfile',exists(select 1 from public.employer_profiles where user_id=uid),'isAdmin',private.is_admin());
end $$;

-- Trigger remains backward compatible with the existing registration form.
-- Version 2 is the strict new contract; unversioned Stage 3 clients create drafts.
-- Metadata is consumed only on INSERT as a non-privileged choice, never on UPDATE.
create or replace function private.provision_auth_profile() returns trigger language plpgsql security definer set search_path='' as $$
declare requested_role text:=new.raw_user_meta_data->>'account_role'; d jsonb:=new.raw_user_meta_data; begin
 if requested_role is null or requested_role not in ('specialist','employer') then raise exception 'Invalid registration role' using errcode='22023'; end if;
 if d ? 'profile_contract_version' and d->>'profile_contract_version'<>'2' then raise exception 'Invalid registration contract' using errcode='22023'; end if;
 if d->>'profile_contract_version'='2' then
  if requested_role='specialist' then
   if not private.valid_text(d->>'first_name',100) or not private.valid_text(d->>'last_name',100) or
   not exists(select 1 from public.professional_roles where code=d->>'professional_role_code' and is_active) or
   (d->>'professional_role_code'='other_veterinary_specialty' and not private.valid_text(d->>'specialty_free_text',200)) then raise exception 'Invalid specialist fields' using errcode='22023'; end if;
  else
   if not private.valid_text(d->>'organization_name_input',200) or not exists(select 1 from public.organization_types where code=d->>'organization_type_code' and is_active) or
   (d->>'organization_type_code'='other' and not private.valid_text(d->>'organization_type_other',200)) then raise exception 'Invalid employer fields' using errcode='22023'; end if;
  end if;
 end if;
 insert into public.profiles(id,role) values(new.id,requested_role::public.profile_role);
 if requested_role='specialist' then
  insert into public.specialist_profiles(user_id,first_name,last_name,professional_role_code,specialty_free_text) values(new.id,
  case when private.valid_text(d->>'first_name',100) then btrim(d->>'first_name') end,
  case when private.valid_text(d->>'last_name',100) then btrim(d->>'last_name') end,
  case when d->>'profile_contract_version'='2' then d->>'professional_role_code' end,
  case when d->>'profile_contract_version'='2' then nullif(btrim(d->>'specialty_free_text'),'') end);
 else
  insert into public.employer_profiles(user_id,organization_name_input,organization_type_code,organization_type_other) values(new.id,
  case when d->>'profile_contract_version'='2' then btrim(d->>'organization_name_input') end,
  case when d->>'profile_contract_version'='2' then d->>'organization_type_code' end,
  case when d->>'profile_contract_version'='2' then nullif(btrim(d->>'organization_type_other'),'') end);
 end if;
 return new;
end $$;

create function private.save_specialist_step2(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
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
delete from public.specialist_animal_groups where user_id=uid; for item in select value from jsonb_array_elements(coalesce(payload->'animal_groups','[]')) loop
 if jsonb_typeof(item)<>'string' or not exists(select 1 from public.animal_groups where code=item#>>'{}' and is_active) then raise exception 'Invalid selection' using errcode='22023'; end if; insert into public.specialist_animal_groups(user_id,animal_group_code) values(uid,item#>>'{}'); end loop;
if payload ? 'activity_areas' and jsonb_typeof(payload->'activity_areas')<>'array' then raise exception 'Expected selection array' using errcode='22023'; end if;
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
create function private.save_specialist_step3(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=private.require_active(); profession text; item jsonb; i integer:=0; begin
 perform private.require_keys(payload,array['competencies','autonomy_code','development_areas','custom_competencies','custom_development']);
 select professional_role_code into profession from public.specialist_profiles where user_id=uid for update;
 if profession is null then raise exception 'Complete STEP 1 first' using errcode='22023'; end if;
 delete from public.specialist_competencies where user_id=uid and professional_role_code=profession;
 for item in select value from jsonb_array_elements(coalesce(payload->'competencies','[]')) loop
  perform private.require_keys(item,array['competency_code','level']);
  if item->>'level' is not null then
   if not exists(select 1 from public.competencies where professional_role_code=profession and code=item->>'competency_code' and is_active) then raise exception 'Invalid competency' using errcode='22023'; end if;
   insert into public.specialist_competencies(user_id,professional_role_code,competency_code,level) values(uid,profession,item->>'competency_code',item->>'level');
  end if;
 end loop;
 delete from public.specialist_autonomy where user_id=uid and professional_role_code=profession;
 if payload->>'autonomy_code' is not null then insert into public.specialist_autonomy(user_id,professional_role_code,autonomy_code) values(uid,profession,payload->>'autonomy_code'); end if;
 delete from public.specialist_development_areas where user_id=uid and professional_role_code=profession;
 for item in select value from jsonb_array_elements(coalesce(payload->'development_areas','[]')) loop
 insert into public.specialist_development_areas(user_id,professional_role_code,area_code) values(uid,profession,item#>>'{}'); end loop;
 if profession='other_veterinary_specialty' then
  delete from public.specialist_custom_competencies where user_id=uid;
  for item in select value from jsonb_array_elements(coalesce(payload->'custom_competencies','[]')) loop
   perform private.require_keys(item,array['name','level']); i:=i+1;
   insert into public.specialist_custom_competencies(user_id,slot,name,level) values(uid,i,btrim(item->>'name'),item->>'level');
  end loop;
  delete from public.specialist_custom_development where user_id=uid;
  for item in select value from jsonb_array_elements(coalesce(payload->'custom_development','[]')) loop
   insert into public.specialist_custom_development(user_id,name) values(uid,btrim(item#>>'{}'));
  end loop;
 elsif coalesce(jsonb_array_length(payload->'custom_competencies'),0)>0 or coalesce(jsonb_array_length(payload->'custom_development'),0)>0 then
  raise exception 'Custom competencies only apply to other specialty' using errcode='22023';
 end if;
end $$;

create function private.profile_completeness() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=private.require_active(); p public.specialist_profiles; step1 boolean; step2 boolean; applicable integer; filled integer; step3 numeric; begin
 select * into p from public.specialist_profiles where user_id=uid;
 if not found then return jsonb_build_object('step1',0,'step2',0,'step3',0,'total',0); end if;
 step1:=private.valid_text(p.first_name,100) and private.valid_text(p.last_name,100) and p.professional_role_code is not null
  and (p.professional_role_code<>'other_veterinary_specialty' or private.valid_text(p.specialty_free_text,200));
 step2:= p.home_location_code is not null and p.experience_band_code is not null and p.job_search_status_code is not null
 and p.start_option_code is not null and p.profile_visibility is not null
 and exists(select 1 from public.specialist_work_locations where user_id=uid)
 and exists(select 1 from public.specialist_workloads where user_id=uid)
 and exists(select 1 from public.specialist_languages where user_id=uid)
 and (p.professional_role_code not in ('veterinarian','veterinary_student','veterinary_pharmacy') or exists(select 1 from public.specialist_education where user_id=uid and professional_role_code=p.professional_role_code))
 and (p.professional_role_code<>'veterinarian' or exists(select 1 from private.specialist_licenses where user_id=uid));
 if p.professional_role_code='other_veterinary_specialty' then
  applicable:=5; select count(*) into filled from public.specialist_custom_competencies where user_id=uid;
 else
  select count(*) into applicable from public.competencies where professional_role_code=p.professional_role_code and is_active;
  select count(*) into filled from public.specialist_competencies sc join public.competencies c on c.professional_role_code=sc.professional_role_code and c.code=sc.competency_code
   where sc.user_id=uid and sc.professional_role_code=p.professional_role_code and c.is_active;
 end if;
 step3:=case when applicable>0 then round(30.0*filled/applicable,2) else 0 end;
 return jsonb_build_object('step1',case when step1 then 20 else 0 end,'step2',case when step2 then 50 else 0 end,'step3',step3,
 'total',(case when step1 then 20 else 0 end)+(case when step2 then 50 else 0 end)+step3,'applicableCompetencies',applicable,'filledCompetencies',filled);
end $$;

alter function private.save_specialist_step1(jsonb) owner to vetkarjera_profile_writer; revoke all on function private.save_specialist_step1(jsonb) from public,anon; grant execute on function private.save_specialist_step1(jsonb) to authenticated;
create function public.save_specialist_step1(payload jsonb) returns void language sql security invoker set search_path='' as $$ select private.save_specialist_step1(payload) $$; revoke all on function public.save_specialist_step1(jsonb) from public,anon; grant execute on function public.save_specialist_step1(jsonb) to authenticated;
alter function private.save_employer_step1(jsonb) owner to vetkarjera_profile_writer; revoke all on function private.save_employer_step1(jsonb) from public,anon; grant execute on function private.save_employer_step1(jsonb) to authenticated;
create function public.save_employer_step1(payload jsonb) returns void language sql security invoker set search_path='' as $$ select private.save_employer_step1(payload) $$; revoke all on function public.save_employer_step1(jsonb) from public,anon; grant execute on function public.save_employer_step1(jsonb) to authenticated;
alter function private.save_education(jsonb) owner to vetkarjera_profile_writer; revoke all on function private.save_education(jsonb) from public,anon; grant execute on function private.save_education(jsonb) to authenticated;
create function public.save_education(payload jsonb) returns void language sql security invoker set search_path='' as $$ select private.save_education(payload) $$; revoke all on function public.save_education(jsonb) from public,anon; grant execute on function public.save_education(jsonb) to authenticated;
alter function private.save_license(text) owner to vetkarjera_profile_writer; revoke all on function private.save_license(text) from public,anon; grant execute on function private.save_license(text) to authenticated;
create function public.save_license(number_input text) returns void language sql security invoker set search_path='' as $$ select private.save_license(number_input) $$; revoke all on function public.save_license(text) from public,anon; grant execute on function public.save_license(text) to authenticated;
alter function private.read_license(uuid) owner to vetkarjera_profile_writer; revoke all on function private.read_license(uuid) from public,anon; grant execute on function private.read_license(uuid) to authenticated;
create function public.read_license(target_user_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.read_license(target_user_id) $$; revoke all on function public.read_license(uuid) from public,anon; grant execute on function public.read_license(uuid) to authenticated;
alter function private.review_license(uuid,integer,text) owner to vetkarjera_profile_writer; revoke all on function private.review_license(uuid,integer,text) from public,anon; grant execute on function private.review_license(uuid,integer,text) to authenticated;
create function public.review_license(target_user_id uuid,expected_revision integer,decision text) returns void language sql security invoker set search_path='' as $$ select private.review_license(target_user_id,expected_revision,decision) $$; revoke all on function public.review_license(uuid,integer,text) from public,anon; grant execute on function public.review_license(uuid,integer,text) to authenticated;
alter function private.create_second_profile(text,jsonb) owner to vetkarjera_profile_writer; revoke all on function private.create_second_profile(text,jsonb) from public,anon; grant execute on function private.create_second_profile(text,jsonb) to authenticated;
create function public.create_second_profile(kind text,payload jsonb) returns void language sql security invoker set search_path='' as $$ select private.create_second_profile(kind,payload) $$; revoke all on function public.create_second_profile(text,jsonb) from public,anon; grant execute on function public.create_second_profile(text,jsonb) to authenticated;
alter function private.save_specialist_step2(jsonb) owner to vetkarjera_profile_writer; revoke all on function private.save_specialist_step2(jsonb) from public,anon; grant execute on function private.save_specialist_step2(jsonb) to authenticated;
create function public.save_specialist_step2(payload jsonb) returns void language sql security invoker set search_path='' as $$ select private.save_specialist_step2(payload) $$; revoke all on function public.save_specialist_step2(jsonb) from public,anon; grant execute on function public.save_specialist_step2(jsonb) to authenticated;
alter function private.save_specialist_step3(jsonb) owner to vetkarjera_profile_writer; revoke all on function private.save_specialist_step3(jsonb) from public,anon; grant execute on function private.save_specialist_step3(jsonb) to authenticated;
create function public.save_specialist_step3(payload jsonb) returns void language sql security invoker set search_path='' as $$ select private.save_specialist_step3(payload) $$; revoke all on function public.save_specialist_step3(jsonb) from public,anon; grant execute on function public.save_specialist_step3(jsonb) to authenticated;
alter function private.profile_completeness() owner to vetkarjera_profile_writer; revoke all on function private.profile_completeness() from public,anon; grant execute on function private.profile_completeness() to authenticated;
create function public.profile_completeness() returns jsonb language sql security invoker set search_path='' as $$ select private.profile_completeness() $$; revoke all on function public.profile_completeness() from public,anon; grant execute on function public.profile_completeness() to authenticated;
revoke all on function public.account_capabilities() from public,anon; grant execute on function public.account_capabilities() to authenticated;


-- Source: Lietuvos savivaldybiu asociacija https://www.lsa.lt/nariai-savivaldybes/ accessed 2026-09-15. Local stable codes, not official registry IDs.
insert into public.locations(code,label_lt,kind) values
('lt_akmenes_r','Akmenės r. sav.','municipality'),
('lt_alytaus_m','Alytaus m. sav.','municipality'),
('lt_alytaus_r','Alytaus r. sav.','municipality'),
('lt_anyksciu_r','Anykščių r. sav.','municipality'),
('lt_birstono','Birštono sav.','municipality'),
('lt_birzu_r','Biržų r. sav.','municipality'),
('lt_druskininku','Druskininkų sav.','municipality'),
('lt_elektrenu','Elektrėnų sav.','municipality'),
('lt_ignalinos_r','Ignalinos r. sav.','municipality'),
('lt_jonavos_r','Jonavos r. sav.','municipality'),
('lt_joniskio_r','Joniškio r. sav.','municipality'),
('lt_jurbarko_r','Jurbarko r. sav.','municipality'),
('lt_kaisiadoriu_r','Kaišiadorių r. sav.','municipality'),
('lt_kalvarijos','Kalvarijos sav.','municipality'),
('lt_kauno_m','Kauno m. sav.','municipality'),
('lt_kauno_r','Kauno r. sav.','municipality'),
('lt_kazlu_rudos','Kazlų Rūdos sav.','municipality'),
('lt_kelmes_r','Kelmės r. sav.','municipality'),
('lt_kedainiu_r','Kėdainių r. sav.','municipality'),
('lt_klaipedos_m','Klaipėdos m. sav.','municipality'),
('lt_klaipedos_r','Klaipėdos r. sav.','municipality'),
('lt_kretingos_r','Kretingos r. sav.','municipality'),
('lt_kupiskio_r','Kupiškio r. sav.','municipality'),
('lt_lazdiju_r','Lazdijų r. sav.','municipality'),
('lt_marijampoles','Marijampolės sav.','municipality'),
('lt_mazeikiu_r','Mažeikių r. sav.','municipality'),
('lt_moletu_r','Molėtų r. sav.','municipality'),
('lt_neringos','Neringos sav.','municipality'),
('lt_pagegiu','Pagėgių sav.','municipality'),
('lt_pakruojo_r','Pakruojo r. sav.','municipality'),
('lt_palangos_m','Palangos m. sav.','municipality'),
('lt_panevezio_m','Panevėžio m. sav.','municipality'),
('lt_panevezio_r','Panevėžio r. sav.','municipality'),
('lt_pasvalio_r','Pasvalio r. sav.','municipality'),
('lt_plunges_r','Plungės r. sav.','municipality'),
('lt_prienu_r','Prienų r. sav.','municipality'),
('lt_radviliskio_r','Radviliškio r. sav.','municipality'),
('lt_raseiniu_r','Raseinių r. sav.','municipality'),
('lt_rietavo','Rietavo sav.','municipality'),
('lt_rokiskio_r','Rokiškio r. sav.','municipality'),
('lt_skuodo_r','Skuodo r. sav.','municipality'),
('lt_sakiu_r','Šakių r. sav.','municipality'),
('lt_salcininku_r','Šalčininkų r. sav.','municipality'),
('lt_siauliu_m','Šiaulių m. sav.','municipality'),
('lt_siauliu_r','Šiaulių r. sav.','municipality'),
('lt_silales_r','Šilalės r. sav.','municipality'),
('lt_silutes_r','Šilutės r. sav.','municipality'),
('lt_sirvintu_r','Širvintų r. sav.','municipality'),
('lt_svencioniu_r','Švenčionių r. sav.','municipality'),
('lt_taurages_r','Tauragės r. sav.','municipality'),
('lt_telsiu_r','Telšių r. sav.','municipality'),
('lt_traku_r','Trakų r. sav.','municipality'),
('lt_ukmerges_r','Ukmergės r. sav.','municipality'),
('lt_utenos_r','Utenos r. sav.','municipality'),
('lt_varenos_r','Varėnos r. sav.','municipality'),
('lt_vilkaviskio_r','Vilkaviškio r. sav.','municipality'),
('lt_vilniaus_m','Vilniaus m. sav.','municipality'),
('lt_vilniaus_r','Vilniaus r. sav.','municipality'),
('lt_visagino_m','Visagino m. sav.','municipality'),
('lt_zarasu_r','Zarasų r. sav.','municipality');
insert into public.development_areas(professional_role_code,code,label_lt) values ('veterinary_student','general','Bendroji praktika'),('veterinary_student','internal','Vidaus ligos'),('veterinary_student','surgery','Chirurgija'),('veterinary_student','anesthesia','Anestezija'),('veterinary_student','dentistry','Odontologija'),('veterinary_student','dermatology','Dermatologija'),('veterinary_student','imaging','Diagnostinis vaizdinimas'),('veterinary_student','emergency','Skubi pagalba'),('veterinary_student','orthopedics','Ortopedija'),('veterinary_student','neurology','Neurologija'),('veterinary_student','exotic','Egzotiniai gyvūnai'),('veterinary_student','farm','Ūkinių gyvūnų medicina'),('veterinary_student','other','Kita');

-- FK lookup indexes also support role/location filtering without duplicating CV data.
create index role_interests_interest_idx on public.professional_role_interests(interest_code);
create index specialist_profession_idx on public.specialist_profiles(professional_role_code);
create index specialist_home_idx on public.specialist_profiles(home_location_code);
create index specialist_experience_idx on public.specialist_profiles(experience_band_code);
create index specialist_search_status_idx on public.specialist_profiles(job_search_status_code);
create index specialist_mobility_idx on public.specialist_profiles(mobility_code);
create index specialist_start_idx on public.specialist_profiles(start_option_code);
create index specialist_work_model_idx on public.specialist_profiles(work_model_code);
create index specialist_visibility_idx on public.specialist_profiles(profile_visibility);
create index employer_type_idx on public.employer_profiles(organization_type_code);
create index specialist_language_idx on public.specialist_languages(language_code,user_id);
create index specialist_language_level_idx on public.specialist_languages(proficiency_code);
create index specialist_interest_pair_idx on public.specialist_interests(professional_role_code,interest_code,user_id);
create index specialist_competency_pair_idx on public.specialist_competencies(professional_role_code,competency_code,user_id);
create index specialist_custom_competency_role_idx on public.specialist_custom_competencies(professional_role_code);
create index specialist_autonomy_pair_idx on public.specialist_autonomy(professional_role_code,autonomy_code,user_id);
create index specialist_development_pair_idx on public.specialist_development_areas(professional_role_code,area_code,user_id);
create index specialist_custom_development_role_idx on public.specialist_custom_development(professional_role_code);
create index specialist_license_role_idx on private.specialist_licenses(professional_role_code);
revoke create on schema private from vetkarjera_profile_writer;
grant vetkarjera_profile_writer to current_user with inherit false;
grant vetkarjera_profile_writer to current_user with set false;
commit;
