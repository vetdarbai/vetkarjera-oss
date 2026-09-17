# VetKarjera Stage 4.3 — CEO blocker resolution

> 2026-09-17: šis ankstesnės peržiūros dokumentas paliktas istorijai. Staging QA užbaigtas; aktualus verdictas ir migracijų pataisos pateikti [STAGE4_3_STAGING_REPORT.md](STAGE4_3_STAGING_REPORT.md). Production vykdymas vis dar neautorizuotas.


2026-09-16. Ankstesnis review commit: `b3aed3b1f5c1b24dc2716bba6ab810fca1b233da`.

**Verdict: STAGE 4.3 BACKEND BLOCKED.** Visi trys product-contract blockeriai išspręsti. Liko pilnos izoliuotos Supabase PostgreSQL 17 aplinkos integracinis QA.

## 1. Konkretūs pakeitimai

- Pridėtos 4 asistento ir 4 kitos specialybės autonomy reikšmės pagal patvirtintus kodus ir tekstus. Studentui, vaistininkui ir komercijos specialistui autonomy nepridėta.
- Pridėtos visos 8 asistento, 9 vaistininko ir 11 komercijos specialisto development reikšmės. Veterinaro pasirinkimai ir studento development nepakeisti. Kita specialybė išlaiko custom development.
- Kitos specialybės 1 / 2 / 3–5 kompetencijos duoda +10 / +20 / +30 %. Iki 5 įrašų limitas išliko; daugiau nei 30 % nepridedama.
- STEP 2 save reikalauja bent vienos validžios animal_groups ir activity_areas reikšmės. TypeScript kontrakte abu masyvai privalomi. Completeness tikrina abi child lenteles; optional interests neblokuoja.
- Korekcijos atskiroje `20260915210103_stage4_3_product_contract_fixes.sql` migracijoje; ankstesni migration failai neperrašyti. Abi Stage 4.3 migracijos tikrinamos dėl transakcijos apvalkalo.
- Paruoštas vietinis `supabase/config.toml` be production kredencialų. Aplinka dar nepaleista.

## 2. Techninis QA

| Patikra | Rezultatas |
| --- | --- |
| DB / RLS / completeness / profesijos istorija / licencijos privacy ir revision / abu antro profilio kūrimo eiliškumai | 166 assertions PASS |
| Profile actions / session / V2 contract su mock transportu | 25 assertions PASS |
| Auth regression | 35 tests PASS |
| Clean migracijų grandinė ir Stage 3 upgrade izoliuotame PGlite | PASS |
| Types generation + check | PASS, 39 public lentelės ir 11 RPC; tipų schema nepasikeitė |
| Repo SQL security / performance auditas | 7 kategorijos PASS |
| Lint | PASS; `next lint` deprecation pranešimas nėra klaida |
| Typecheck | PASS |
| `npm run build`, Next.js 15.5.24 | PASS; 15 statinių puslapių generavimo užduočių baigtos |
| Vietinio config TOML sintaksė ir baziniai izoliavimo nustatymai | PASS; nėra stack startup patvirtinimas |
| Pilnas PostgreSQL 17 / GoTrue / PostgREST / realus API RLS / dviejų jungčių concurrency / oficialūs advisors | NEATLIKTA |

PGlite naudoja PostgreSQL 18.3 ir minimalias Auth SQL fixtures. Build atliktas su sintetinėmis public Supabase reikšmėmis. Tai nėra Supabase production ar pilno staging PASS. Nutrūkus ankstesnei build sesijai rezultatas nebuvo spėjamas — build pakartotas ir baigėsi exit 0.

## 3. Product-contract blockeriai

Visi užduoties 1–3 punktų neatitikimai išspręsti. Regresijos tikrina missing / empty masyvus, senus nepilnus profilius, minimalų validų STEP 2, 0–5 custom kompetencijas, 6 įrašų atmetimą, pasirinkimų išlaikymą keičiant profesiją ir nepakeistus veterinaro / studento žodynus.

## 4. Staging sprendimas

Rekomenduojama vietinė Podman Desktop / WSL2 + Supabase CLI aplinka, be mokamo cloud projekto. Reikia Pauliaus sprendimo dėl Windows konteinerių aplinkos paruošimo; gali reikėti administratoriaus teisių ir perkrovimo. [Pilnas setup planas ir testų matrica](STAGE4_3_STAGING_SETUP_PLAN.md).

## 5. Commit

Ši ataskaita įtraukiama į naują vietinį `codex/stage4-3-backend` commit. Tikslus jo hash pateikiamas CEO paketo `COMMIT.txt` ir perdavimo pranešime. Pakete yra visa dviejų commit patch seka nuo bazės `eb2d12baf72ba3a986782eb6d44725da63433ce2`.

## 6. Production migracijos planas

Atnaujintas [production migration planas](STAGE4_3_PRODUCTION_MIGRATION_PLAN.md): po pirminės Stage 4.3 migracijos būtina pritaikyti korekcijų migraciją, tada tikrinti invariantus ir tik po DB QA diegti backend. Dvi migracijos yra dvi atskiros transakcijos; antros klaida neatšaukia jau commitintos pirmos. Kol pilnas staging nepatikrintas, production migracija draudžiama.

## 7. Ribos ir verdiktas

Šiame korekcijų commit UI / header / jobs / applications / notifications / consent architektūra nekeisti. Stage 5+ nepradėtas. Production DB nemigruota, GitHub main nepushinta, production nedeployinta. Paslaptys į Git nedėtos, production service-role nenaudotas.

**STAGE 4.3 BACKEND BLOCKED** — vienintelė likusi techninė parengties kliūtis yra pilnas staging QA. Produkto pasirinkimų patvirtinimų papildomai nereikia.
