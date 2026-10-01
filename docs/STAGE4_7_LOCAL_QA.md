# Stage 4.7 — vietinių pataisų ir QA ataskaita

Data: 2026-10-01. Bazė: `c618299b4e700cb03416337d28744802e3b2a66d`.
Vietinė šaka: `codex/stage4-7-manual-qa`.

## Apimtis ir sprendimas

`STAGE 4.7 FIXES BLOCKED` — tik 20 kalendorinių dienų pasirinkimas reikalauja atskiro backend katalogo papildymo leidimo. Likusios patvirtintos pataisos įgyvendintos lokaliai.

Nepradėtas Stage 5, Jobs / Applications ar newsletter darbas. Nepakeisti bendri svetainės dizaino elementai, paketai, DB schema, RPC, RLS, grants, Storage policies, auth/session architektūra ar kompetencijų matricos. Ankstesnis frontend-stage4-5 repo ir atidaryto projekto vartotojo failai nepakeisti.

## Patvirtintų punktų būsena

| Punktas | Rezultatas / įgyvendinimas |
| --- | --- |
| Nuotraukos REMOVE | Pataisytas SDK klaidos atpažinimas ir DELETE atsakymas. Įkelti / perkrauti / pašalinti / perkrauti / įkelti pakartotinai patikrinta realiu vietiniu HTTP ir Storage. |
| Profesija peržiūroje | „Profesija: …“. Tik trūkstamos profesijos žodis „Nepasirinkta“ turi klaidos akcentą. Pasirinkta profesija neutrali. |
| Desktop navigacija | Visos trys dalys matomos ir peržiūroje, ir redaguojant; aktyvus žingsnis pažymėtas. |
| Header „Profilis“ | `/profilis` Link onNavigate atkuria peržiūrą iš STEP1/2/3; išsaugoti įprasti nuorodos ir naujo skirtuko veiksmai bei neišsaugotų pakeitimų dialogas. |
| STEP1 el. paštas | Tikras serverio autentifikuotos paskyros el. paštas tarp pavardės ir profesijos. readOnly, neutralus pilkas fonas, nesiunčiamas profilio RPC. |
| 20 dienų pradžia | BLOCKED. Kataloge tokios reikšmės nėra. Jokio frontend alias ar naujos reikšmės nepridėta. |
| Darbo modelis | Nebėra STEP2 ir peržiūroje; step2Draft/PATCH jo nesiunčia. Vietiniu testu patvirtinta, kad ankstesnis `hybrid` lieka DB. |
| Darbo grafikas | Nebėra STEP2 ir peržiūroje; nesiunčiamos schedules. Ankstesnė `regular` reikšmė lieka DB. Darbas savaitgaliais, naktimis ir budėjimai išlieka. |
| Licencija | „Licencijos verifikacija“, abu patvirtinti paaiškinimai, subtilus informacinis paviršius, ryškesnis pateikimas. Missing/pending/verified/rejected patikrinta; missing nėra raudona. |
| Readiness CTA | Visada rodoma total <100. Trūkstami privalomi laukai ir užbaigti žingsniai gaunami iš serverio; 76,25 % su likusiomis kompetencijomis atveria STEP3. 100 % CTA nėra. |
| „Redaguoti“ | Neutralūs antriniai mygtukai, bent 44 px aukščio. |
| Sėkmingas išsaugojimas | STEP1/2/3 sėkmės žinutė ir po 1800 ms peržiūra. Formos užrakinimas neleidžia dubliuoti išsaugojimo. Laikmatis išvalomas keičiant žingsnį / išmontuojant. |
| Klaidos / retry | Tinklo ir RPC klaidos palieka įvestį bei retry, negrąžina į peržiūrą. Sėkmingas įrašymas su nepavykusiu perskaitymu nekartojamas; retry perskaito ir išsaugo vėliau įvestus pakeitimus. |
| Mobile / responsive | Patikrinti 1440, 768, 390 px. Nėra horizontal overflow; mobile nėra desktop sidebar, lieka STEP selector ir 44 px formos valdikliai. |

## Nuotraukos klaidos priežastis

DELETE anksčiau po sėkmingo pašalinimo vėl kvietė `readPhoto`. Esamas atpažinimas tikrino skaitinį `statusCode` arba neegzistuojantį `error.error` lauką. Įdiegto Storage SDK tikra naujo formato 404 klaida turi `status: 404`, `statusCode: 'NoSuchKey'`, `code: 'NoSuchKey'`. Senoji sąlyga grąžino false, todėl trūkstamas objektas tapo 503 klaida, nors pats pašalinimas jau buvo sėkmingas. Ta pati problema paveikė vėlesnį GET po perkrovimo.

`scripts/test-photo-errors.cjs` atkuria šį neatitikimą per tikrą įdiegtą SDK su sintetine HTTP 404 transporto replika, ne ranka sukurta Error klase. Patikrintas naujas ir legacy formatas; 403/400/503 nelaikomi dingusia nuotrauka. Produkcijos privatūs žurnalai / naudotojų duomenys šiame etape nebuvo skaitomi: diagnozė pagrįsta konkrečiu kodo defektu, įdiegtu SDK ir vietine reprodukcija.

DELETE dabar grąžina patvirtintą no-photo metadata tik po sėkmingo esamo `removePhoto`. Nereikalingas skaitymas negali paversti pašalinimo klaida ar grąžinti pasenusių baitų. Papildomai kliento pradinis GET nebegali perrašyti naujesnio upload/delete rezultato. Autorizacija, session recheck, Origin/CSRF, owner path ir privataus bucket politika nepakeisti.

SDK formato dokumentacija: [Supabase Storage klaidų kodai](https://supabase.com/docs/guides/storage/debugging/error-codes). Taip pat patikrintas oficialus changelog; paketų versijos nekeistos.

## 20 dienų punktas — konkretus reikalingas backend sprendimas

Tikro izoliuoto PostgreSQL `public.start_options` SELECT, dabartinė migracija ir `lib/profiles/catalogs.json` patvirtino šias aktyvias reikšmes: immediately, two_weeks, one_month, two_three_months, specific_date. Visos paliktos.

Reikia atskirai autorizuoti katalogo duomenų migraciją: naujas unikalus `public.start_options.code`, tikslus label „Po įspėjimo termino (20 kalendorinių dienų)“, sort_order ir is_active. Reikia suderinti versionuotą katalogo JSON bei katalogo testus. Dabartinis start_option_code yra tekstinis FK, RPC tikrina aktyvų katalogą, todėl pagal esamą kodą enum, RPC, RLS ar grants pakeitimų nereikia. Naujas kodas nesugalvotas ir migracija nesukurta / nevykdyta.

CEO CONSULT klausimas: ar autorizuoti būtent šią katalogo duomenų migraciją ir patvirtinti jos kodą? Tik po šio leidimo galima užbaigti likusį punktą. Push/deploy vis tiek reikalingas atskiras leidimas.

## Testavimo aplinka ir rezultatai

Tik izoliuotas, su hosted projektu nesusietas `vetkarjera-stage4-3-isolated` Supabase PostgreSQL 17 / Auth / PostgREST / Storage. Tik sintetinės example.test paskyros, jokio tikro Gmail ar produkcinių paskyrų / licencijų naudojimo. Vietinis Next optimizuotas build, localhost:4345. HTTPS loopback proxy išlaiko esamus HTTPS ir Origin guard, ne jų išjungimą.

- `npm run lint`: PASS, be lint klaidų ar įspėjimų. Next praneša apie paties next lint komandos deprecation; migracija į kitą lint komandą už scope.
- `npm run typecheck`: PASS.
- `npm run build`: PASS, Next 15.5.24, visi esami route'ai sukompiliuoti.
- `npm test`: PASS — 35 Auth, 33 profile action/session/registration, 166 PostgreSQL/PGlite, 280 alignment/PGlite assertions; 39 lentelių / 11 RPC tipų patikra; 7 DB saugumo audito taisyklės.
- `node scripts/test-photo-errors.cjs`: PASS, 17 SDK/DELETE assertions.
- `node scripts/test-profile-view.cjs`: PASS, 49 projection/PATCH/readiness assertions.
- `node scripts/test-alignment-local.cjs clean`: PASS, 379 realūs vietiniai Auth/RPC/RLS/Storage assertions. Jokių naujų migracijų.
- `node scripts/audit-profile-ui.cjs`: PASS, 68 source / galutinio build kliento failų assertions, 51 kliento asset, tikras vietinis privileged key kliento bundle nerastas.
- `node scripts/test-profile-ui.cjs`: galutinis optimizuoto build testas PASS, 192 realūs naršyklės / HTTP / RPC / Storage assertions. Pradinis dev testas taip pat PASS, 186 assertions. Galutinis testas papildomai tikrina mobile header iš visų trijų žingsnių, klaidos nepersijungimą po 2,2 s ir abi saugaus sesijos atšaukimo atsako formas.

Išsaugoti UI screenshot'ai ir neslaptas profile-ui.json yra ignoruojamame `.staging-results` kataloge. Sertifikatai, privatūs raktai, sesijų failai ir produkciniai duomenys į Git ar galutinį artefaktų katalogą nekopijuojami.

Atšaukus sesiją, nekeičiama esama middleware apsauga: optimizuotas Next gali peradresuoti į prisijungimą dar prieš save paspaudimo pabaigą; dev gali grąžinti formos klaidą. Regresijos testas tikrina abiem atvejais, kad įrašymo nėra, ir prisijungimą nauja sesija. Tai nėra auth/session kodo pakeitimas.

## Pakeisti failai

- app/api/profilis/nuotrauka/route.ts
- app/profilis/page.tsx
- app/profilis/profilis.css
- components/Navigation.tsx
- components/ProfileFields.tsx
- components/ProfileOwnerAssets.tsx
- components/ProfileProfessional.tsx
- components/SpecialistProfile.tsx
- lib/profiles/photo.ts
- lib/profiles/view-model.ts
- scripts/test-profile-ui.cjs
- scripts/test-profile-view.cjs
- scripts/test-photo-errors.cjs (naujas)
- docs/STAGE4_7_LOCAL_QA.md (naujas)

## Publikavimas ir kitas žingsnis

Pataisos išsaugomos tik vietiniu commit šakoje `codex/stage4-7-manual-qa`. Commit identifikatorius pateikiamas galutiniame pranešime ir gaunamas iš šios šakos Git HEAD.

Kitas žingsnis: CEO CONSULT sprendimas dėl vieno katalogo įrašo / migracijos; tada likusio punkto QA ir tik gavus atskirą leidimą main push bei production deploy.

Production unchanged.
No production migration executed.
No main push.
No production deploy.
Stage 5 NOT started.

READY TO COPY TO CEO CONSULT
