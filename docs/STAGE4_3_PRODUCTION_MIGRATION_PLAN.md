# Stage 4.3 production migracijos planas

2026-09-17. Šis failas yra peržiūros instrukcija, ne leidimas taikyti migraciją. Vietinis PostgreSQL 17 staging QA baigtas; rezultatai: [STAGE4_3_STAGING_REPORT.md](STAGE4_3_STAGING_REPORT.md).

## Prieš leidimą

1. CEO / Paulius peržiūri pataisytus produktinius kontraktus ir techninių patikrų rezultatus. Production migracija dar draudžiama.
2. STEP 3 pasirinkimai, kitos specialybės +10/+20/+30 % ir STEP 2 privalomos grupės / sritys jau patvirtinti ir implementuoti atskiroje korekcijų migracijoje. Produkto sprendimų blockerio nebeliko.
3. Užfiksuojamas konkretus peržiūrėtas commit. Bazė: `eb2d12baf72ba3a986782eb6d44725da63433ce2`.
4. Pilno Supabase staging aplinkoje pakartojami Auth signup V2 ir PostgREST RPC testai, tikrų atskirų DB jungčių konkurencija, Supabase advisor ir migracija su production naudojamos PostgreSQL pagrindinės versijos bei teisių modeliu. Šio darbo PGlite testai naudojo PostgreSQL 18.3 ir minimalias Auth SQL fixtures, ne GoTrue / PostgREST servisus.
5. Esamas frontend dar naudoja Stage 3 registracijos formą ir jos suderinamą veiksmą. Griežtas V2 backend veiksmas paruoštas frontend integracijai. Formos laukų ir header pakeitimai šiame darbe neįjungti. Aptarti integracijos seką prieš skelbiant naują produktinį STEP 1.

## Patvirtintos migracijos vykdymo seka

1. Dar kartą patikrinti GitHub main, Vercel production commit ir tikslų Supabase projektą `pirezwaggwlfhwmdzisu`. Šiame darbe production schema nebuvo keičiama.
2. Patikrinti pritaikytą istoriją: `20260905075153_stage2_backend_foundation`, `20260908142249_stage3_auth_accounts`. Repo pridėtas pirmosios migracijos failas yra istorinio SQL kopija. **Jo negalima vykdyti antrą kartą production.** Jei istorija nesutampa, sustoti ir išspręsti drift; neperrašyti istorijos spėjant.
3. Patikrinti faktinius skaičius ir invariantus: `profiles`, specialist/employer profiliai, admin rolės, organizacijos, memberships (jei jau yra), jobs. Išsisaugoti tik agreguotus patikros rezultatus. Šešios architektūros peržiūros paskyros nėra garantuotas skaičius būsimo deploy metu.
4. Patikrinti `vetkarjera_profile_writer` rolės nebuvimą. Jei ji jau egzistuoja, migracija turi sustoti, o ne paveldėti nežinomas jos teises.
5. Turėti saugią, patikrintą atsarginę kopiją ir žinomą atkūrimo kelią. Auth credentials ir naudotojų duomenų nekelti į Git ar ataskaitą. Netvirtinti backup prieinamumo nepatikrinus konkretaus Supabase plano.
6. Suderinti trumpą pakeitimo langą. Migracija vienoje transakcijoje paima `auth.users` SHARE ROW EXCLUSIVE užraktą ir keičia public lenteles. `lock_timeout = 5s` neleidžia neribotai laukti; konfliktuojančių prisijungimo / registracijos duomenų rašymai trumpam gali laukti. Jei užrakto nepavyksta gauti, visa migracija atšaukiama ir analizuojama priežastis.
7. Taikyti abi peržiūrėtas migracijas šia tvarka: `20260915162557_stage4_3_profiles.sql`, tada `20260915210103_stage4_3_product_contract_fixes.sql` per patikimą Supabase migracijų procesą, kuris įrašo migracijos istoriją. Tai atskiras, dar neautorizuotas production veiksmas. Nė vienas npm test/build skriptas nedaro `db push` ar production DB pakeitimų.
8. Patikrinti backfill: kiekviena legacy specialist paskyra turi specialist eilutę, kiekviena employer – employer eilutę. Nežinoma profesija ir organizacijos duomenys lieka NULL. Esamos eilutės neperrašomos. Admin rinkinio perkėlimas tik iš DB saugoto legacy role; iš metaduomenų admin nesuteikiamas.
9. Patikrinti esamų organization ryšių perkėlimą į memberships ir jobs FK. Organizacijų bei jobs UUID ir eilučių kiekiai turi išlikti. Atšaukta narystė teisių nesuteikia, nors istorinis FK lieka.
10. Patikrinti grants / RLS ir paleisti Supabase security bei performance advisors. Svetimų CV ir privačių licencijų prieiga turi likti uždaryta. `private` schema neturi būti įtraukta į eksponuojamas API schemas.
11. Tik po DB patikros diegti atitinkamą backend commit į esamą Vercel projektą `paulius1/vetkarjera`. Naujas session kontraktas remiasi `account_capabilities()` RPC; jo negalima deployinti į production anksčiau už migraciją. Iki to laiko nereikia merge į main su automatiniu Vercel deploy.
12. Paulius atlieka sutartą manual production QA: esamų paskyrų prisijungimas / logout, sesijos tęstinumas, profilio santrauka ir vėliau prijungtos formos. Developeris tikrina technines klaidas bei logų santrauką be tokenų ir licencijų numerių.
13. Etapo uždarymas: techninis QA PASS, sutartas Pauliaus manual QA PASS, visi blockeriai išspręsti. CEO WORK auditas – suplanuotame checkpoint.

## Grįžimas po klaidos

- Kiekviena iš dviejų migracijų turi atskirą transakciją. Klaida iki jos commit atšaukia tik tą migraciją. Jei pirmoji pritaikyta, o korekcijų migracija nepavyksta, backend nedeployinti; pašalinti priežastį ir taikyti korekcijų migraciją. Negalima teigti, kad abiejų failų seka automatiškai atšaukiama kaip viena transakcija.
- Po commit nepaleisti destruktyvios down migracijos: išsaugoti naujus profilius, education / competencies istoriją ir licencijas.
- Jei naujas backend neveikia, stabdyti jo įjungimą ir taikyti forward fix. Seno session / role kodo grąžinimas po dual-profile naudojimo negali atkurti senų authorization taisyklių.
- Legacy `profiles.role` ir `employer_profiles.organization_id` šiame etape nešalinami. Jų contract migracija yra atskiras vėlesnis sprendimas.

## Privalomas izoliuotas staging

Pilnos aplinkos paruošimas, testų matrica ir priėmimo kriterijai: [STAGE4_3_STAGING_SETUP_PLAN.md](STAGE4_3_STAGING_SETUP_PLAN.md). 2026-09-17 clean ir Stage 3 upgrade patikros atliktos su PostgreSQL 17.6 / GoTrue / PostgREST: PASS. Prieš leidimą būtina peržiūrėti naują staging pataisų commit, o ne naudoti ankstesnius 0530acc SQL failus. Paruoštas config yra skirtas tik vietinei aplinkai; jo negalima sinchronizuoti į production.

## Testų pakartojimas

`npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.

`npm test` kuria tik izoliuotas atmintines PostgreSQL DB su sintetiniais duomenimis. Jis neskaito `.env`, neturi production URL ir nesijungia prie production. Build patikrai naudotos sintetinės public Supabase reikšmės; realaus projekto secretų nereikia.

`npm run types:generate` regeneruoja public lentelių ir RPC TypeScript tipus iš izoliuotos migracijų schemos. `npm run types:check` tikrina jų sutapimą. Tai repozitorijos generatorius, ne teiginys, kad buvo vykdytas `supabase gen types` prieš production.

## Staging nustatytos būtinos migracijų korekcijos

Abi Stage 4.3 migracijos dar nebuvo taikytos production, todėl pataisyti jų review failai prieš pirmą taikymą. Stage 2 ir Stage 3 istoriniai failai nepakeisti. Naujas atskiras po jų einantis failas negalėtų ištaisyti pirmoje Stage 4.3 migracijoje įvykstančio ownership transfer sustojimo.

- Tik migracijos transakcijos metu vykdytojui suteikiamos writer SET / INHERIT teisės, writer rolei — CREATE privačioje schemoje funkcijų nuosavybei perduoti. Prieš commit jos panaikinamos. Antroji migracija laikinai įjungia INHERIT esamoms funkcijoms atnaujinti ir vėl išjungia.
- Nereikalaujamas GRANT platformos valdomoje auth schemoje. `private.require_active()` lieka SECURITY INVOKER, paima tokį pat patikimo PostgREST JWT subject kaip `auth.uid()` ir privalomai tikrina esamą `private.has_active_session()`.
- Runtime writer lieka NOLOGIN / NOBYPASSRLS / NOSUPERUSER; API rolėms writer narystė nesuteikiama. Šios sąlygos patikrintos tikrame PostgreSQL po abiejų migracijos kelių.
- Ši seka išbandyta su Supabase vietiniu `postgres` naudotoju, kuris nėra superuser. Būsimo production vykdytojo teises ir tikrą migration history vis tiek būtina patikrinti atskirai prieš autorizuotą vykdymą.
- Oficialūs advisor: 0 ERROR, 0 WARN. INFO apie tuščios staging aplinkos nenaudotus indeksus ir tyčinį `private.account_admins` default-deny dokumentuoti ataskaitoje; tai nėra leidimas trinti indeksus ar pridėti prieigos policy.

Production vykdymo seka išlieka galiojanti su šiais pataisytais failais. CEO CONSULT peržiūra ir atskiras Pauliaus production leidimas lieka privalomi. Stage 4.3 produkto etapo uždarymas po būsimo deploy taip pat reikalauja Pauliaus sutarto manual QA.