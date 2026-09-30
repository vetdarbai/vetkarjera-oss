# VetKarjera — Stage 4 backend alignment for Stage 4.5

> Historical planning snapshot. CEO subsequently approved G1 variant 2 and G2 owner + trusted-admin only, with no generic draft-row redesign. The current implementation and QA verdict is in STAGE4_BACKEND_ALIGNMENT_RESULT.md; the BLOCKED status below describes the earlier decision gate, not the current implementation.

Data: 2026-09-30. CEO CONSULT peržiūrai. Tik planas, įgyvendinimas nepradėtas.

**STAGE 4 BACKEND ALIGNMENT BLOCKED**

Planas parengtas. Prieš įgyvendinimą būtinas readiness kraštinio atvejo sprendimas ir photo prieigos ribos patvirtinimas. STOP pagal pateiktos užduoties 5 ir 11 punktus: nekurti produkto taisyklių, nekeisti completeness ar visibility savo nuožiūra.

## 1. Patikrintas pagrindas / root cause

Repo: D:\VetKarjera-Staging\workspace\backend. Peržiūrėtas commit: 95ea4fbf5d36fbd3241785218a466e2b64a28a26.

Production struktūros read-only patikra: **2026-09-30 05:41:56.591382 UTC**, ref pirezwaggwlfhwmdzisu, PostgreSQL 17.6. Asmens duomenys ir secretai šiam planui neskaityti.

Keturi history įrašai:
- 20260905075153_stage2_backend_foundation
- 20260908142249_stage3_auth_accounts
- 20260915162557_stage4_3_profiles
- 20260915210103_stage4_3_product_contract_fixes

Production nėra Storage bucketų, specialist photo/avatar stulpelių. Specialist RLS leidžia owner/trusted-admin skaitymą su aktyvia sesija; registered_employers pasirinkimas pats svetimo profilio neatveria. Perskaitytas „Codex Developer“ Stage 4.5 STOP ir Stage 4.5 specifikacija. Kitų pokalbių darbas nekeistas, žinutės nesiųstos.

| Neatitikimas | Faktinė priežastis |
| --- | --- |
| Partial draft | private.save_specialist_step1 reikalauja pilnų pagrindinių duomenų; STEP2 reikalauja required laukų, education ir gydytojo license |
| Dalinis PATCH | STEP2 neperduotus laukus paverčia NULL, rinkinius trina/perrašo; STEP1 coalesce neleidžia aiškiai išvalyti Other teksto |
| DB constraints | specialist_other_text, specialist_home, specialist_start, education_shape, kalbos lygio NOT NULL ir Other kalbos CHECK blokuoja incomplete draft |
| Photo | Nėra Storage ir upload/replace/remove backend |
| License | Numerio buvimas tikrinamas save metu, nors turi lemti required readiness |
| Missing-fields | Completeness response pateikia skaičius, ne konkrečius required trūkumus |

private.require_keys tikrina allowlist, tipus ir dydį — nereikalauja visų raktų. Šios apsaugos nešalinti. License verification status jau dabar procento nekeičia.

## 2. G1 — readiness kraštinis atvejis (STOP)

Dabartinė formulė sudeda nepriklausomus blokus: STEP1 = 0/20, STEP2 = 0/50, STEP3 = 0–30.

Pavyzdys po partial-draft pataisos: 100 % profilyje išvaloma pavardė, profesija paliekama. Draft SAVE PASS, bet total = 0 + 50 + 30 = **80 %**, nors required STEP1 nebaigtas. Tai kodo loginė pasekmė, ne konkretaus production vartotojo rezultatas.

CEO turi nuspręsti:
1. Palikti nepriklausomą sumą, bet readiness papildomai reikalauti pilnų STEP1/2. Tada 80 % gali būti not-ready — išimtis pateiktai 70–99 % taisyklei.
2. Palikti „total >=70 reiškia ready“, bet STEP2 50 % įskaityti tik užbaigus STEP1. Svoriai lieka 20/50/30, pasikeičia jų įskaitymo priklausomybė.

Rekomenduoju reikalauti pilnų required STEP1/2 pasirengimui, tačiau nė vieno realizavimo varianto savavališkai netvirtinu. Drausti required lauko clear vien dėl readiness nebūtų tinkamas draft sprendimas.

## 3. G2 — photo matomumo riba (STOP)

Stage4.5 aprašo owner visibility UI, production RLS tebėra owner/trusted-admin. Applications pagrindo application_only gavėjui nėra.

Siūloma riba: photo owner valdymas, esamo trusted-admin skaitymo išlaikymas, foreign employer ir anon deny. Visos trys visibility reikšmės lieka; vien label nesukuria naujos CV/photo prieigos.

CEO turi patvirtinti, kad tai atitinka Stage4 scope. Jei foreign employer photo turi matyti jau dabar, reikia pateikti jau patvirtintą profilio/gavėjo authorization taisyklę. Jos neišgalvosime ir nepradėsime Applications.

## 4. Partial draft / RPC planas

PATCH: nepateiktas raktas nekeičia; aiškus NULL išvalo leistiną nullable scalar; tuščias tekstas normalizuojamas į NULL ten, kur leidžiama; nepateiktas masyvas nekeičia rinkinio, [] išvalo.

Required nebuvimas leidžiamas; invalid tipas, catalog code, svetimas ID, ilgis ar data vis tiek atmetami. profile_visibility palieka NOT NULL, application_only default ir tris esamas reikšmes.

Validuoti efektyvią būseną po PATCH. Bendrus STEP2 laukus leisti saugoti neužbaigus STEP1. Profesijos istorijos netrinti. DB save transakcinis; profilio užraktas serializuoja susijusias mutacijas. Kito lauko PATCH negali prarasti nepateiktų duomenų; tam pačiam pateiktam laukui lieka paskutinis sėkmingas atnaujinimas.

| RPC / contract | Pakeitimas |
| --- | --- |
| private.save_specialist_step1(jsonb) | Partial PATCH ir clear; atskirti nuo strict registration |
| private.save_specialist_step2(jsonb) | Required/education/license absence neblokuoja; keisti tik pateiktus laukus/rinkinius |
| private.save_education(jsonb) | Partial PATCH pagal profesijos kontekstą |
| Naujas private.profile_required_state() | Vienas serverio required/missing-state šaltinis, owner scope |
| private.profile_completeness() | Bendras helperis; G1 tik po sprendimo; STEP3 matrica ta pati |
| public.profile_completeness() | Invoker wrapper, additive JSON |
| public.save_specialist_step1/2, public.save_education | Palikti argumentus ir void, nelaužyti priklausomybių keičiant return type |
| app/profilis/actions.ts | Po save grąžinti perskaitytą readiness ir saugias klaidas |
| lib/profiles/contracts.ts | Atskiri strict registration / draft tipai ir missing-state |

Strict V2 signup ir employer kontraktų neatlaisvinti. create_second_profile kviečia STEP1, todėl jo strict kūrimo validaciją išsaugoti atskirai. provision_auth_profile ir registrationProfile neturi netyčia pasikeisti.

Jei save įvyko, bet completeness perskaityti nepavyko, atskirti šią būseną nuo nepavykusio save; neperrašyti UI klaidingais skaičiais. Retry idempotentinis, įvestis išlieka. Private tables klientui neatveriamos.

## 5. DB schema pakeitimai

- specialist_other_text/home/start pilnumo sąlygas perkelti į required-state, palikti pateiktų reikšmių validaciją. Nationwide netampa gyvenamąja vieta.
- education_shape pilnumo reikalavimą atlaisvinti draft; išlaikyti tekstų ilgius, metų/kurso intervalus, FK ir profesijos kontekstą.
- specialist_languages.proficiency_code leisti NULL draft; Other pavadinimo nebuvimą vertinti completeness. Pateiktos kalbos/lygio reikšmės privalo būti validžios.
- Jei UI leidžia pradėti kalbos eilutę nuo lygio ar education fragmentą be profesijos, esamas sudėtinis PK nepakanka. Siūlomas stabilus draft row ID, nullable klasifikavimo raktas, atskiras UNIQUE user/role ar user/language porai. Fragmentą išsaugoti, bet neįskaityti readiness. Pririšimas prie profesijos eksplicitus, istorija netrinama. Galutinį payload/schema kontraktą pateikti SQL review; netyliai neprarasti „bet kokios kombinacijos“. Bendros draft platformos nekurti.
- Photo deterministic path modeliui papildomo photo_url/photo_path DB stulpelio nereikia: vienas Storage objektas yra egzistavimo šaltinis.
- License schema/revision auditas, ownership ir writer saugumo modelis išlieka.

## 6. Completeness / license / missing-fields

Additive JSON: esami step1/step2/step3/total ir competency counts + step1Complete, step2Complete, missingRequired (field code, step, reason), readyToApply, readinessState, contractVersion. Readiness priklausomybė laukia G1.

Required-state apima vardą, pavardę, profesiją, Other pavadinimą; vietą/sąlyginius laukus; patirtį; paieškos statusą; pradžios pasirinkimą/datą; matomumą; gyvūnų grupes; veiklos sritis; darbo vietas; krūvį; pilną kalbų informaciją; profesijai required education; gydytojui license presence. Sutapatinti su patvirtintomis role-dependent taisyklėmis, ne mockupo tekstu.

Atlaisvinus constraints vien exists(education) ar exists(languages) nebepakanka. Incomplete eilutė nėra pilnas required blokas. UI tik išverčia field kodus, required logikos nedubliuoja.

License:
- Numerio nėra: draft PASS, required gydytojo STEP2 nebaigtas.
- Numeris pateiktas: required laukas užpildytas; pending/verified/rejected taškų nekeičia.
- save_license atskiras: tas pats numeris revision nekeičia; pakeistas numeris taiko esamą pending/revision reset.
- Klientas negali nustatyti verification status; numeris tik owner/trusted admin per read_license, ne bendrame response/loguose/photo metadata.
- Delete/clear licencijai automatiškai neįvedamas: patvirtintas UI save/edit. Jei reikės clear, atskirai patvirtinti revision/audito semantiką.
- Photo ir optional autonomy/development neutralūs completeness; Other 10/20/30, senos profesijos duomenys taškų nesuteikia.

## 7. Minimalus photo storage modelis

Private bucket specialist-profile-photos, vienas objektas <auth-user-uuid>/profile.webp. Jokio vartotojo filename/path/bucket parametro, originalų, gallery, cover ar employer logo.

app/api/profilis/nuotrauka/route.ts: GET metadata, PUT upload/replace, DELETE remove. Atskiras autorizuotas vaizdo GET. UID iš aktyvios patikrintos sesijos; specialist existence patikrinti user kontekste, svetimas UID nepriimamas.

Response: hasPhoto, reference (serverio path arba NULL), version (Storage atnaujinimo identifikatorius), imageUrl (app route). Replace/remove būsena iš operacijos rezultato ir perskaitytos faktinės būsenos. Media metadata subsystem nereikia.

Techniniai limitai peržiūrai: JPEG/PNG/WebP iki 3 MiB, 16 MP; rezultatas WebP iki 512 px ilgosios kraštinės ir 250 KiB. Tikras decode, orientacijos tvarkymas, metadata pašalinimas ir re-encode; SVG/animacija deny. Codec versiją prisegti įgyvendinant.

Originalas tik ribotoje request atmintyje, ne disk/bucket/logs/tracing. Vien client resize ar MIME header nėra garantija. Supabase serving transformacija nėra reikalavimo „originalo nesaugoti“ sprendimas.

Storage API upsert į tą patį path, idempotentinis remove. Vienas loginis objektas, jokių DB+Storage transakcijos pažadų. Timeout/concurrency atveju perskaityti faktinę būseną ir nerodyti klaidingo SAVED. Storage triktį skirti nuo 404.

Vaizdo endpoint tikrina authorization, Cache-Control private,no-store. Jokio public bucket ar ilgalaikio signed URL, išlaikančio ankstesnę prieigą po visibility pokyčio.

## 8. Photo RLS/security

- Anon read/upload/delete deny. Authenticated tiesioginis upload/update/delete ir signed-upload kūrimas deny: neapeinamas serverio re-encode.
- Owner read: tikslus bucket/path, specialist existence, aktyvi sesija. Admin tik trusted modeliu, ne user_metadata.
- Server-only Storage mutacijų modulis tikrina owner/session, generuoja path. Siūlomas server secret/service-role klientas leidžia neįjungti tiesioginio user upload. Šiame darbe secretas nekuriamas, neskaitomas ir neprijungiamas; teisių riba turi būti peržiūrėta tvirtinant planą.
- Service-role apeina RLS: mutacijų ownership remiasi serverio validacija, todėl būtini IDOR/bypass testai. Šis klientas nenaudojamas profile RPC ar license.
- Secret tik server, jokio NEXT_PUBLIC/Git/client import; jokių direct DB credentials foto route.
- Foreign employer/public priklauso nuo G2. Patikrinti permissive policies OR sąveiką.
- Failų operacijos per Storage API, ne storage.objects SQL. Photo nekeičia completeness.

## 9. Migracijų planas

1. G1/G2 sprendimai ir techninio server-only modelio review; tada leidimas lokaliam įgyvendinimui codex/ šakoje.
2. Nauja stage4_draft_readiness_alignment migracija: constraints, PATCH/helperiai/additive JSON.
3. Nauja stage4_specialist_photo_access migracija: Storage policies/helperiai. Bucket/limitai per idempotentinį Storage API setup.
4. Timestamp vardai sugeneruojami Supabase CLI vėliau. Ankstesni keturi SQL neperrašomi.
5. Realus local PG17/Auth/PostgREST/Storage clean ir Stage4.3 upgrade QA. PGlite nėra Storage įrodymas.
6. CEO review konkrečiam commit, grants/schema diff, payload/response, testams ir recovery.
7. Production tik atskirai leidus, po aktualaus backup/fresh gate/hash/history/version patikros.
8. Backend deploy/main push tik atskirai leidus ir DB/Storage PASS. Stage4.5 perduoti kontraktą; UI čia nekeisti.

## 10. Rollback/recovery poveikis

Ankstesnis app build galėtų veikti su additive schema, bet nepalaikytų naujų draft. Priėmus partial duomenis negalima aklai grąžinti senų CHECK/NOT NULL: nauji teisėti įrašai neatitiks. Incidento metu stabdyti paveiktus writes, išsaugoti duomenis, teikti reviewinamą forward fix/recovery. Neautomatiškai trinti draft.

pg_dump nesaugo Storage baitų. Iki aktyvavimo bucket tuščias; po upload DB metadata nepakanka foto atkūrimui. Reikalingas vienkartinės DB+photo kopijos/restore sekos ir praradimo ribos dokumentavimas. Ankstesnis RECOVERY TEST PASS nėra naujų foto recovery įrodymas. Nuolatinės backup infrastruktūros nekurti. Foto endpoint išjungti galima paliekant uždarą bucket ir duomenis.

## 11. QA/test plan

Šiandien — kodo ir struktūros analizė. Naujo įgyvendinimo testai nepaleisti, PASS neteikiamas.

| Sritis | Privalomi scenarijai |
| --- | --- |
| STEP1 | Tik vardas, be pavardės/profesijos, Other be teksto; save/reload/clear; PATCH nepraranda kitų laukų |
| STEP2 | Kiekvienas laukas atskirai, tušti rinkiniai, common fields be STEP1, abroad be miesto, specific_date be datos |
| Education/kalbos | Partial profesijų blokai, kalba be lygio, Other be teksto, clear; incomplete existence neduoda 50 |
| Validacija | Unknown keys/catalog, foreign ID, tipai/datos/ilgiai, FK/UNIQUE, transakcinis rollback |
| Concurrency | Dvi DB jungtys, PATCH nepraradimas, profession/education/license race, lock timeout |
| Completeness | 0/20/70/100; visi missing; G1 atvejis; Other10/20/30; optional neutralumas |
| License | Missing draft PASS/readiness FAIL, visi statusai vienodi procentui, revision/reset, owner/admin/foreign |
| Photo | Upload/replace/remove/reload; vienas path; originalo nėra; EXIF/dydžiai/decode ribos; 404 vs klaida |
| Photo security | Anon/direct/foreign/rename/copy/list/signed-upload bypass; MIME spoof/SVG/animacija; revoked/expired session |
| Photo race | Du replace, replace/remove, timeout po write; perskaityta būsena, jokių originalų/orphan/klaidingo SAVED |
| Regresija | Strict V2/legacy signup, second profiles, capabilities, writer atributai ir API be writer narystės |
| Migracijos | Clean/upgrade, ID/data/history/grants, cutover/lock, rollback ribos, security/performance advisors |
| App | lint/typecheck/build, Auth/profile testai, DB auditas, types; secrets/private payload ne bundle/loguose |

Po atskirai autorizuoto deploy manual production QA atlieka Paulius. Etapas uždaromas tik techninis PASS + manual QA + nėra blockerių. Lokalių pataisų QA pagal poveikį.

## 12. Tikslūs planuojami failai

Repo root: D:\VetKarjera-Staging\workspace\backend.

Keisti:
- lib/profiles/contracts.ts
- app/profilis/actions.ts
- types/database.ts (generuotas)
- scripts/test-profile-actions.cjs
- scripts/test-profiles-db.cjs
- scripts/test-staging.cjs
- scripts/audit-profile-db.cjs
- scripts/profile-test-db.cjs (Storage/app bootstrap ir Stage3 filtras, dabar atpažįstantis tik stage4_3)
- scripts/generate-profile-types.cjs tik jei reikia naujo bootstrap
- package.json / package-lock.json (prisegtas image codec/test komandos, be framework upgrade)
- supabase/config.toml tik būtiniems local Storage parametrams

Nauji:
- supabase/migrations/<CLI timestamp>_stage4_draft_readiness_alignment.sql
- supabase/migrations/<CLI timestamp>_stage4_specialist_photo_access.sql
- app/api/profilis/nuotrauka/route.ts
- app/api/profilis/nuotrauka/vaizdas/route.ts
- lib/profiles/photo.ts (server-only)
- lib/supabase/storage-admin.ts (izoliuotas server-only klientas)
- scripts/setup-specialist-photo-storage.cjs (explicit target, jokio default production)
- scripts/test-profile-photo.cjs
- docs/STAGE4_BACKEND_ALIGNMENT_RESULT.md
- docs/STAGE4_BACKEND_ALIGNMENT_RECOVERY.md

Tikslus fragmentų/helperių diff pateikiamas SQL review. Šie implementacijos failai dabar nekurti ir nekeisti. Esami keturi migrations, UI/header, competencies, Jobs/Applications neliečiami.

## 13. Complexity / security risks / impact

Įvertinimas po sprendimų: **3–5 darbo dienos** — draft/readiness/schema 1–2; photo/security 1–1,5; integracinis QA/recovery 1–1,5. Neįskaičiuotas CEO/Pauliaus QA laukimas. Tai vertinimas, ne vykdymo leidimas.

Rizikos: PATCH praradimas, likęs exists-based completeness, signup susilpninimas, G1 prieštaravimas, foreign photo atvėrimas, privileged Storage klientas, concurrency/cache, DB-only backup prielaida.

Nereikia bendros media sistemos, queue, naujo serverio ar mokamo projekto. Jei runtime/Storage limitai nepakanka, STOP prieš scope/kainą/infrastruktūrą.

## 14. Šaltiniai

- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) — policies, upsert ir service-key bypass.
- [Private/public buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) — private read kontrolė.
- [Storage schema](https://supabase.com/docs/guides/storage/schema/design) — API failų operacijos, metadata nėra baitai.
- [Image transformations](https://supabase.com/docs/guides/storage/serving/image-transformations) — serving transformacija nepakeičia preprocessing.
- [Supabase changelog](https://supabase.com/changelog) — peržiūrėtas HTML puslapis; markdown indeksas neatsivėrė. Platformos upgrade nevykdomas; versijas tikrinti prieš vykdymą.

## READY TO COPY TO CEO CONSULT

**STAGE 4 BACKEND ALIGNMENT BLOCKED**

- Blockers confirmed: partial STEP1/2 ribojamas RPC/constraints, photo nėra, license number blokuoja draft. Verification status jau nekeičia procento.
- RPC: PATCH STEP1/2/education, vienas required-state helperis, additive JSON, strict signup išlaikomas.
- DB: pilnumo constraints atskirti nuo validžios draft įvesties; incomplete education/languages nesuteikia completeness; senos migracijos neperrašomos.
- Photo: private bucket, vienas deterministic WebP path, server decode/resize/compress be originalų, photo DB stulpelio nereikia.
- RLS/security: direct upload deny, owner patikros serveryje, server-only privileged Storage klientas reviewinamas; foreign employer/public deny pagal esamą prieigą, kol G2 patvirtintas.
- License: missing number leidžia save, neužbaigia gydytojo STEP2; private numeris, statusai neutralūs procentui, revision/review išlieka.
- Draft: omitted nekeičia, NULL clear leistinam scalar, [] clear rinkiniui; invalid value klaida.
- Readiness blocker: 0 STEP1 + 50 STEP2 + 30 STEP3 =80 su required STEP1 trūkumu. Reikalingas CEO sprendimas; formulė nekeista.
- Missing-fields: backend field/reason kodai, UI tik labels.
- Migration: dvi naujos migracijos + Storage API setup; local clean/upgrade QA; CEO review; atskiri production leidimai.
- QA: partial/clear/reload, conditional required, license, real Storage/bypass/race, Auth/capabilities, migrations/data/advisors, lint/typecheck/build. Implementacijos testai dar nevykdyti.
- Risks: readiness prieštaravimas, incomplete įskaitymas, PATCH praradimas, Storage privilegijos, DB backup be photo baitų.
- Estimated impact: 3–5 darbo dienos po sprendimų; frontend/Stage5 nepradėti.
- Exact next step: CEO išsprendžia G1 ir patvirtina G2 owner/trusted-admin scope arba pateikia patvirtintą foreign-viewer taisyklę; tada autorizuoja lokalų įgyvendinimą. Production migration/main push/deploy reikės atskirų leidimų.

Production unchanged.
No migration executed.
No deploy executed.
Stage 5 NOT started.
