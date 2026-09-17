# VetKarjera Stage 4.3 backend peržiūra

> 2026-09-17: šis ankstesnės peržiūros dokumentas paliktas istorijai. Staging QA užbaigtas; aktualus verdictas ir migracijų pataisos pateikti [STAGE4_3_STAGING_REPORT.md](STAGE4_3_STAGING_REPORT.md). Production vykdymas vis dar neautorizuotas.


Atnaujinta: 2026-09-16. Bazė: `eb2d12baf72ba3a986782eb6d44725da63433ce2`.

**Verdict: STAGE 4.3 BACKEND BLOCKED.**

Pagrindinė realizacija ir žemiau aprašyti izoliuoti testai paruošti. Pilno etapo parengties production migracijai netvirtinu: visi trys CEO nurodyti product-contract blockeriai ištaisyti, tačiau dar neatlikta pilno Supabase PostgreSQL 17 staging integracija su GoTrue, PostgREST ir tikromis lygiagrečiomis DB jungtimis. Production DB nemigruota. Į main nepushinta ir production nedeployinta.

## 1 Kas implementuota

- Nepriklausomi specialist ir employer profiliai prie to paties Auth UUID.
- DB nustatomas account capability kontraktas ir atskira patikima admin lentelė.
- Atkuriama istorinių migracijų grandinė; Stage 4.3 expand / backfill migracija vienoje transakcijoje.
- Griežtas V2 registracijos serverio kontraktas; senas Stage 3 veiksmas paliktas suderinamumui.
- STEP 1 redagavimo / antro profilio sukūrimo, education, licencijos, STEP 2 ir STEP 3 išsaugojimo RPC bei serverio veiksmai.
- Pilnumo skaičiavimas DB pusėje, RLS, grants, sintetinės fixtures ir deterministiniai testai.

Header, stiliai, formų dizainas ir navigacija nekeisti. Vienintelis esamo puslapio pakeitimas – `/profilis` paskyros tipų tekstas gaunamas iš capability požymių, todėl gali teisingai parodyti abu profilius. Naujos registracijos formos laukai šiame backend darbe neįjungti.

## 2 Lentelės ir laukai

| Sritis | Struktūra |
| --- | --- |
| Account | `profiles.updated_at`; `profiles.role` lieka read-only legacy. `private.account_admins(user_id, granted_at, source)` |
| Specialist STEP 1 | `first_name`, `last_name`, `professional_role_code`, `specialty_free_text` |
| Specialist STEP 2 | `home_location_code`, `home_country`, `home_city`, `experience_band_code`, `about_me`, `job_search_status_code`, `mobility_code`, `start_option_code`, `start_date`, `work_model_code`, trys nullable availability boolean laukai, `profile_visibility` |
| Employer STEP 1 | `organization_name_input`, `organization_type_code`, `organization_type_other`; legacy `organization_id` tampa nullable |
| Narystė | `organization_memberships(user_id, organization_id, created_at, revoked_at)`; jobs FK perkeltas į narystę |
| Išsilavinimas | `specialist_education`, PK `(user_id, professional_role_code)`: institucijos kodas / pavadinimas, šalis, programa / kvalifikacija, baigimo metai, kursas / studijų metai |
| Pasirinkimai | `specialist_animal_groups`, `specialist_activity_areas`, `specialist_work_locations`, `specialist_workloads`, `specialist_schedules`, `specialist_interests` |
| Kalbos | `specialist_languages`: kalbos kodas, žodyno lygis, privalomas pavadinimas pasirinkus Kita |
| Kompetencijos | `specialist_competencies`, `specialist_custom_competencies`, `specialist_autonomy`, `specialist_development_areas`, `specialist_custom_development` |
| Licencija | `private.specialist_licenses`: numeris, statusas, revision, reviewed_revision, reviewer / laikas; `private.license_reviews` – tikrinimo auditas be numerio dubliavimo |

Žodynai: `professional_roles`, `organization_types`, `experience_bands`, `animal_groups`, `activity_areas`, `professional_interests`, `professional_role_interests`, `job_search_statuses`, `workloads`, `schedules`, `mobility_options`, `start_options`, `work_models`, `languages`, `language_levels`, `visibility_options`, `locations`, `competencies`, `autonomy_options`, `development_areas`.

Gauta 39 public lentelių, įskaitant 5 ankstesnes; private dalyje pridėtos 3 lentelės. `account_consents`, atlygio lūkesčių, kandidatavimo, organizacijų kvietimų, kontaktų dalijimosi ar kitų etapų lentelių nėra.

## 3 Migracijų failai

1. `supabase/migrations/20260905075153_stage2_backend_foundation.sql` – tiksli repo istorinio `supabase/sql/stage2_backend_foundation.sql` kopija clean install grandinei. Production ši versija jau pritaikyta; jos antrą kartą vykdyti negalima.
2. `supabase/migrations/20260915162557_stage4_3_profiles.sql` – nauja Stage 4.3 migracija. Failą inicijavo Supabase CLI `migration new`.
3. `supabase/migrations/20260915210103_stage4_3_product_contract_fixes.sql` – atskira patvirtintų STEP 3 žodynų, STEP 2 privalomumo ir completeness korekcijų migracija.
4. Stage 3 failas `20260908142249_stage3_auth_accounts.sql` nekeistas.

## 4 Šešių legacy paskyrų perkėlimas

Testuotos 3 specialist ir 3 employer paskyros, papildomai admin, dual-profile ir nepatvirtinta paskyra. UUID, email, sintetinių credentials reikšmės bei sesijos prieš / po migracijos sutapo. Trūkstamos profilių eilutės sukuriamos pagal saugotą legacy rolę, esamos neperrašomos. Pakartotas backfill nekuria dublių.

Specialisto vardas / pavardė perkeliami tik jei tinkami ir tik kaip jo deklaruoti duomenys. Nežinoma profesija lieka NULL. Darbdaviui neišgalvojama organizacija ar narystė. Admin migruojamas tik iš saugotų DB teisių. Senos consent registracijos metaduomenys nekeičiami ir nepaverčiami nauju teisiniu auditu.

Registracijos cutover metu trumpas `auth.users` užraktas neleidžia senam in-flight trigeriui po backfill palikti paskyros be pradinio profilio. Užraktui taikoma 5 s laukimo riba; tiksli trukmė ir teisės dar tikrintinos pilname staging.

## 5 Account capabilities

`account_capabilities()` grąžina `{ id, hasSpecialistProfile, hasEmployerProfile, isAdmin }`. Požymiai skaičiuojami iš DB eilučių. Serverio session helperis tikrina patvirtintą Auth naudotoją, RPC aktyvią sesiją ir sutampantį UUID; email pridedamas iš Auth atsakymo.

Vartotojo metaduomenys, legacy `role`, `role=both`, roles masyvai ar klientui leidžiamas admin laukas naujų teisių nesuteikia. Legacy role perrašymas į admin po migracijos testuose admin teisės nesuteikė.

## 6 Second profile creation

`create_second_profile(kind, payload)` naudoja aktyvios sesijos `auth.uid()`, vienos paskyros transakcinį užraktą ir PK. Abu kūrimo eiliškumai patikrinti. Pakartotinis kūrimas jau esančio profilio neperrašo. Auth paskyra, organizacija ir narystė nekuriamos.

Tikros dviejų atskirų Postgres jungčių konkurencijos šiame PGlite variklyje nepatvirtinu; ji įtraukta į staging planą.

## 7 Professional role

Šešios pateiktos profesijos saugomos reference lentelėje. Kita profesija reikalauja `specialty_free_text`. Profesiją keičiant išlieka senas education, kompetencijų, interesų ir licencijos kontekstas; capability nesikeičia. Ankstesnės kitos specialybės tekstas neišmetamas vien perjungus profesiją.

## 8 Education

Vienas įrašas vienai profesijai. Veterinarui ir studentui palaikomas LSMU / Kita modelis, LSMU programa kanonizuojama į `veterinary_medicine`, studento LSMU kursas 1–6. Kitai institucijai tikrinami profesijai reikalingi duomenys. Vaistininkui išsilavinimas būtinas; asistentui, komercijos specialistui ir kitai specialybei optional. Profesijos pakeitimas neperkelia seno įrašo į naują kontekstą.

## 9 STEP 2 preferences

Gyvenamoji vieta atskirta nuo norimų darbo vietų. Paruošta 60 Lietuvos savivaldybių iš LSA sąrašo, Užsienis ir Visa Lietuva. Kodai yra lokalūs programos kodai, ne oficialūs registro ID. Užsieniui reikia šalies ir miesto; Visa Lietuva negali būti gyvenamoji vieta. [LSA šaltinis](https://www.lsa.lt/nariai-savivaldybes/), tikrinta 2026-09-15.

Gyvūnų grupės ir veiklos sritys privalomos (bent po vieną validų pasirinkimą), kaip ir darbo krūvis / vietos bei kalbos; grafikas, mobilumas, work model optional. Savaitgaliai, naktys ir budėjimai išlaiko NULL / true / false. Konkrečiai starto datai būtinas date. Aprašymas iki 500 simbolių, be minimumo. `save_specialist_step2` išsaugo pilną STEP 2 duomenų rinkinį vienoje transakcijoje; optional praleisti pasirinkimai išvalomi. Klaidingas pasirinkimas atšaukia ir child lentelių pakeitimus.

## 10 STEP 3 competencies

Įkelta 119 tik užduotyje pateiktų kompetencijų penkioms konkrečioms profesijoms. Veterinarui neįtraukti drausti slaugos / injekcijų blokai. Studentas turi atskirą skalę; kitoms profesijoms – standartinę. NULL lygis reiškia Nenurodyta ir įrašas nekuriamas.

Kitai specialybei galima iki 5 vardinių kompetencijų, su standartine skale. Yra modelis savarankiškumo ir tobulėjimo sričių pasirinkimams. Veterinaro savarankiškumas, veterinaro ir studento tobulėjimo sritys įkeltos pagal pateiktus sąrašus. Pagal CEO patvirtinimą pridėtos 4 asistento ir 4 kitos specialybės savarankiškumo reikšmės bei 8 asistento, 9 vaistininko ir 11 komercijos specialisto tobulėjimo sričių. Studentui, vaistininkui ir komercijos specialistui autonomy nėra. Veterinaro pasirinkimai ir studento tobulėjimo sritys nepasikeitė; tai tikrina regresijos testas. Kitos specialybės tobulėjimo sritys lieka laisvas tekstas.

## 11 License privacy

MVP licencija skirta tik veterinarui. Public specialist lentelėje nėra nei numerio, nei statuso. Savininkui ir aktyviam trusted admin leidžiamas siauras RPC skaitymas. Svetimos licencijos numeris / pending / rejected nepasiekiami darbdaviui net turint employer profilį.

Pakeistas numeris atominiu veiksmu padidina revision ir nustato pending; identiškas numeris patvirtinimo nenaikina. Admin tikrina konkrečią revision; sena atmetama. Net admin negali pats patvirtinti savo licencijos. Auditui numeris nedubliuojamas.

## 12 Visibility

Default `application_only`. `actively_looking` viešumo nekeičia. Net `registered_employers` šiame etape neatveria svetimo CV: Stage 9 prieigos projekcija dar neįgyvendinta, todėl visiems svetimiems CV galioja default deny. Contact / email sharing ir verified badge projekcija darbdaviams neįjungta.

## 13 Completeness

Vienas DB helperis: STEP 1 užbaigimas +20, visi required STEP 2 laukai +50, dabartinės profesijos užpildyta competency dalis iki +30. Optional STEP 2 laukai neblokuoja 70 %. Patikrintas 70 % profilis be optional laukų ir 100 % su visomis applicable kompetencijomis. Seni kitos profesijos įrašai procento nedidina.

STEP 1 / STEP 2 procentai skiriami už užbaigtą žingsnį. Patvirtinta kitos specialybės taisyklė: 1 kompetencija +10 %, 2 +20 %, 3–5 +30 %. Leidžiami iki 5 įrašų; 4 ir 5 procento nedidina. STEP 2 negauna 50 %, jei trūksta gyvūnų grupės arba veiklos srities, įskaitant anksčiau išsaugotas nepilnas eilutes. Interesai neprivalomi. Pilnumas nenaudojamas prisijungimo ar kitų teisių suteikimui.

## 14 RLS ir grants

- Visoms public ir private lentelėms įjungtas RLS. Account / CV skaitymas – savininkui arba aktyviam admin; jokios employer paieškos svetimuose CV.
- Public RPC yra SECURITY INVOKER. Rašymo logika – neeksponuojamoje private schemoje, su atskira NOLOGIN / be BYPASSRLS role `vetkarjera_profile_writer` ir ribotomis lentelių teisėmis.
- Writer neturi Auth users skaitymo, admin teisių skyrimo ar membership rašymo. `authenticated` nėra writer rolės narys.
- Kiekvienai rašymo operacijai būtina aktyvi patvirtinta sesija. USING / WITH CHECK ir serverio lauko allowlist saugo savininką bei stulpelius.
- Licencijos tikrinimo laukai nepriimami bendrame profilio payload. Visų funkcijų search_path aiškus; PUBLIC / anon EXECUTE pašalintas.
- Reference / junction FK ir PK saugo kodus, profesijos kontekstą bei dublius. Trūkstami FK indeksai pašalinti per lokalų auditą.

## 15 Automated QA

| Patikra | Rezultatas |
| --- | --- |
| Clean isolated migracijų grandinė | PASS |
| Stage 3 legacy ir papildomos fixtures | PASS |
| DB / RLS / privileges / profiles / education / license / preferences / completeness | 166 assertions PASS |
| Nauji serverio veiksmai, session kontraktas, V2 signup transporto mock | 25 assertions PASS |
| Ankstesni deterministiniai Auth testai | 35 tests PASS |
| Database types regeneracija ir sutapimas | PASS, 39 public lentelės / 11 RPC |
| RLS, funkcijų grants / search_path, privačių laukų izoliacija, FK indeksai | 7 lokalios audit kategorijos PASS |
| Git diff whitespace patikra | PASS |
| Pilnas GoTrue / PostgREST staging ir tikrų DB jungčių concurrency | NEATLIKTA |

PGlite vykdo tikrą PostgreSQL 18.3 variklį, tačiau testinė Auth schema turi tik programai reikalingus stulpelius / JWT helperius. Šie rezultatai nėra realaus Supabase HTTP / SMTP ar production QA teiginys.

## 16 Lint TypeScript build

Lint PASS, TypeScript PASS, `npm run build` PASS su Next.js 15.5.24. Build naudojo sintetinę public Supabase konfigūraciją ir nesijungė prie production DB.

Pirmą build bandymą blokavo aplinkos tinklo teisės atsisiunčiant jau naudojamus Google Fonts. Leidus atsisiųsti šriftus build praėjo; šriftai ir dizainas nekeisti. Seno Auth testo fixture buvo atnaujinta vienos rolės lauką pakeitus capabilities. `next lint` deprecation ir webpack cache našumo pranešimai nėra lint / build klaidos.

## 17 Security ir Supabase advisor

Lokalus SQL auditas praėjo 7 kategorijas. Tai repo skriptas, ne oficialaus hosted Supabase advisor PASS. Oficialus Supabase CLI security/performance advisor naujai staging schemai ir tikro PostgREST embedding / filter / count bandymai dar reikalingi staging.

Realūs SMTP / Resend / Supabase secrets šiame darbe nebuvo naudojami, neskaitomi ir neįrašyti į Git. `.env` nekurtas. Service-role raktas nenaudotas. Naujuose app veiksmuose nėra privataus payload ar provider klaidų logginimo. Kliento statiniuose build failuose nerasti testiniai licencijų numeriai, testinis slaptažodis, private writer ar `license_number` tekstas.

## 18 Commit

Peržiūros commit hash pateikiamas perdavimo pranešime ir Git istorijoje. Darbo šaka: `codex/stage4-3-backend`. Ataskaita įtraukiama į tą patį peržiūros commit.

## 19 Push ir production

Į `main` nepushinta. Į GitHub ši peržiūros šaka nepushinta. Production Supabase DB nemigruota, Vercel production nedeployinta. Tai leidžia išvengti naujo session RPC naudojančio kodo diegimo anksčiau už atskirai patvirtintą DB migraciją.

## 20 Production migration plan

Pilna seka, patikros ir grįžimo taisyklės: [STAGE4_3_PRODUCTION_MIGRATION_PLAN.md](STAGE4_3_PRODUCTION_MIGRATION_PLAN.md). Žingsniai paruošti peržiūrai, neįvykdyti production.

## 21 Kas liko prieš production

1. Visi trys product-contract blockeriai ištaisyti ir patikrinti lokaliai. Papildomo pasirinkimų ar completeness taisyklės patvirtinimo nereikia.
2. Pilna Supabase staging aplinka dar nepaleista. Konkretus variantas: vietinis Podman Desktop / WSL2 + Supabase CLI, PostgreSQL 17, GoTrue, PostgREST ir Mailpit. Paruoštas `supabase/config.toml`; tai konfigūracijos, ne veikiančios aplinkos įrodymas. Žr. [staging planą](STAGE4_3_STAGING_SETUP_PLAN.md).
3. Įdiegus ir patikrinus konteinerių aplinką atlikti visą plane aprašytą API, realių DB jungčių concurrency, clean install / upgrade ir oficialių advisors matricą. PGlite 18.3 šios patikros nepakeičia.
4. Peržiūrėti migracijos teises, trukmę, atsarginę kopiją ir DB → backend → vėlesnės frontend integracijos seką.
5. Gauti atskirą production migracijos patvirtinimą. Po deploy – Pauliaus manual QA ir suplanuotas CEO checkpoint.

Joks Stage 5, 6, 8 ar 9 produktinis flow nepradėtas. Ši ataskaita neuždaro etapo ir neduoda leidimo production migracijai.
