# Stage 4.3 — izoliuotos Supabase aplinkos planas

2026-09-16. **Būsena: paruoštas planas ir vietinis config; pilna aplinka dar nepaleista, testai iš šios matricos neatlikti.**

## Rekomenduojamas sprendimas

Šiame Windows kompiuteryje paruošti **Podman Desktop su WSL2**, o jame paleisti repozitorijoje prisegtą **Supabase CLI 2.117.0**. Projektas `vetkarjera-stage4-3-isolated`: PostgreSQL 17, GoTrue, PostgREST, Studio ir vietinis Mailpit. Atskiro mokamo Supabase cloud projekto ar subscription pakeitimo nereikia. Production projekto duomenys nekopijuojami.

Supabase dokumentacija nurodo Podman kaip Docker suderinamą alternatyvą. Suderinamumą su konkrečia šio kompiuterio Windows ir CLI versija dar būtina patikrinti paleidžiant aplinką. Tai rekomendacija, ne garantija, kad dabartinėje aplinkoje stack jau veikia. Šaltinis: [Supabase local development](https://supabase.com/docs/guides/local-development/cli/getting-started).

Podman Windows aplinkai reikia veikiančios WSL2 arba Hyper-V virtualios mašinos. WSL paruošimas gali pareikalauti administratoriaus teisių ir perkrovimo. Skirti bent 6 GB RAM konteinerių mašinai ir prieš atsisiuntimus patikrinti laisvą diską. Šaltinis: [Podman Desktop Windows diegimas](https://podman-desktop.io/docs/installation/windows-install).

Dabartinė patikra: Docker Desktop, Podman ir native PostgreSQL nerasti. `wsl.exe` yra, bet veikianti WSL2 aplinka / distribucija nepatvirtinta. Per Supabase connectorį rastas tik production projektas, testinių šakų nėra. Todėl naujo hosted projekto savo nuožiūra nekuriame.

## Pauliaus sprendimas

Patvirtinti vietinės konteinerių aplinkos paruošimą šiame kompiuteryje. Patvirtinimo reikia prieš diegiant Podman / keičiant WSL2 kompiuterio nustatymus; jis nesuteikia leidimo production migracijai, push ar mokamiems resursams. Jei reikia perkrovimo, jo laiką suderinti su Pauliumi; automatiškai neperkrauti.

Galimas patvirtinimo tekstas: „Patvirtinu vietinės Stage 4.3 Supabase testavimo aplinkos paruošimą su Podman Desktop ir WSL2. Mokamų cloud resursų nekurti, production neliesti. Jei reikės perkrauti kompiuterį, prieš tai informuoti.“

## Paruošimo seka

1. Patikrinti Windows / WSL2 palaikymą, virtualizaciją, RAM, laisvą diską ir neužimtus 54320–54324 prievadus. Esamų kitų projektų ar duomenų nenaikinti.
2. Iš oficialaus šaltinio įdiegti Podman Desktop ir paruošti atskirą konteinerių mašiną. Docker suderinamą API patikrinti prieš paleidžiant Supabase. Jei suderinamumas nepavyksta, pateikti konkretų trūkumą ir alternatyvą; nekurti mokamo cloud pakaitalo automatiškai.
3. Naudoti šį review checkout ir `supabase/config.toml`. Config sukurtas oficialiu CLI, nustatyta PostgreSQL 17, email confirmation, vietinis pašto surinkimas ir išjungtas neegzistuojantis seed failas. TOML sintaksė patikrinta; stack konfigūracijos veikimas dar nepatvirtintas.
4. Nenaudoti `supabase link`, `--linked`, production DB URL ar production `.env`. Prieš bet kokį reset patikrinti vietinį projekto ID, host ir port. Testavimo komandos turi aiškiai naudoti `--local`.
5. Paleisti vietinį stack. CLI gali išvesti vietinius raktus: jų neskelbti pokalbyje ar ataskaitoje. Testo raktus laikyti tik proceso atmintyje arba Git ignoruojamame `.env.staging.local`; iš logų pašalinti JWT, slaptažodžius ir licencijų numerius.
6. Patikrinti faktinį portų susiejimą ir Windows ugniasienės prieigą. Vietinė API / DB negali būti atverta internetui; nenaudoti viešų tunelių. Pašto siuntimas tik į vietinį Mailpit, be Resend / SMTP kredencialų.
7. Užfiksuoti faktines PostgreSQL, GoTrue, PostgREST ir CLI versijas bei health patikrų rezultatus. `SHOW server_version` turi rodyti PostgreSQL 17. Patikrinti, kad `private` nėra API eksponuojama schema.

## Migracijų patikros

Komandos vykdomos tik patikrinus dedikuotą vietinį projektą. CLI kvietimas šiame repo: `node node_modules/supabase/dist/supabase.js`. Telemetrijai išjungti: `SUPABASE_TELEMETRY_DISABLED=1`.

1. **Clean install:** `db reset --local --no-seed`. Turi praeiti Stage 2 → Stage 3 → pradinė Stage 4.3 → product-contract fixes grandinė. Užfiksuoti migracijų istoriją, schemas, roles, grants ir RLS.
2. **Upgrade:** tame pačiame atskirame testiniame projekte `db reset --local --version 20260908142249 --no-seed`. Per realų GoTrue sukurti sintetines legacy specialist / employer paskyras, patvirtinti vietinius laiškus, prisijungti. Pridėti tik testines DB fixtures admin / organizacijos ryšiams. Saugiai užfiksuoti UUID, sesijų ir profilių invariantus.
3. Paleisti `migration up --local`. Patikrinti abiejų Stage 4.3 migracijų istoriją, backfill, Auth UUID / sesijų išlaikymą, nedubliuojamus profilius ir neišgalvotus profesijos / organizacijos duomenis. Slaptažodžių hash palyginti tik testų atmintyje, į ataskaitą dėti boolean rezultatą.
4. Matuoti migracijos užraktą ir patikrinti registracijos operaciją cutover metu. Konflikto atveju patikrinti 5 s lock timeout ir atšaukimą. Antros migracijos klaida negali būti laikoma automatiškai atšaukiančia pirmą jau commitintą migraciją.

## Privaloma realių servisų testų matrica

| Scenarijus | Tikrinimas ir PASS sąlyga |
| --- | --- |
| Signup / login / session | GoTrue sukuria tikrą paskyrą, nepatvirtinta paskyra negauna profilio rašymo teisių; patvirtinus vietinį laišką login ir refresh veikia; logout / atšaukta sesija uždaro RPC prieigą |
| V2 specialist ir employer | Abu V2 registracijos kontraktai perduodami tikram GoTrue; trigeris sukuria teisingą pradinį profilį; suklastotos admin / roles reikšmės teisių nesuteikia |
| Abu profiliai | Specialist → employer ir employer → specialist; UUID lieka vienas; pakartojimas nekeičia pirmo išsaugojimo; jokios savavališkos narystės |
| Capabilities | API grąžinami flags atitinka DB eilučių buvimą; legacy role ar user metadata negali pakelti teisių |
| STEP 2 | Minimalus validus payload duoda 50 %; missing / empty animal_groups ir activity_areas atmetami; nepilnos senos eilutės neduoda 50 %; optional interests nereikalingi; klaida atominiu būdu atšaukia pakeitimus |
| STEP 3 | Nauji katalogai ir profesijų ribos veikia per API; studentui / pharmacy / commerce autonomy atmetama; other competencies 0–5 duoda 0/10/20/30/30/30 %, šeštas įrašas atmetamas |
| Profesijos istorija | Pakeitus profesiją ankstesni education / competencies / development / license duomenys išlieka; netinkamas profesijos kontekstas procento nedidina |
| Licencija | Savininko ir trusted admin RPC veikia; svetimas, anon ir employer numerio / statuso nemato; naujas numeris padidina revision ir nustato pending; stale revision ir self-review atmetami |
| RLS per PostgREST | Anon, savininkas, kitas authenticated naudotojas, employer ir trusted admin; tiesioginis select/insert/update/delete, RPC, filters, count ir embedded relations nesuteikia draustos prieigos |
| Tikros dvi DB jungtys | Du atskiri PostgreSQL backend PID ir dvi atviros transakcijos su sinchronizavimo barjeru; vienu metu kuriamas tas pats antras profilis — tik viena eilutė ir deterministinis rezultatas; license review prieš numerio pakeitimą nepatvirtina naujos revision pagal seną peržiūrą |
| Oficialūs advisors | `db advisors --local --type all --fail-on error`; užfiksuoti visas security/performance išvadas, išspręsti klaidas, įvertinti kiekvieną warning. Repo 7 kategorijų SQL auditas šio punkto nepakeičia |

Pirmiausia realizuoti testų vykdyklę su localhost / projekto ID apsauga ir švariu rezultatų reportu. Dabartiniai `npm test` scenarijai naudoja PGlite ir mock transportą; jie automatiškai netampa šios matricos testais. V2 serverio veiksmams integracijos teste pateikti vietinio Supabase klientą; tikro API atsako nemockinti. Jei tikrinamas visas Next HTTP kelias, vietiniam Supabase naudoti TLS ir patikimą vietinį sertifikatą, nešvelninti production HTTPS tikrinimo. Joks testinis verification redirect neturi būti atidaromas production domene.

Fixture prisijungimai ir JWT gaunami per vietinį GoTrue. Vartotojo API patikrose naudoti anon/public raktą ir tikrus vartotojų JWT, ne service-role. Tiesioginę administracinę vietinės DB prieigą naudoti tik setup, kontroliniams invariantams ir apribotų rolių concurrency testams. Production service-role nenaudoti.

## Užbaigimas

Išsaugoti komandų exit codes, versijas, migracijų istoriją, testų scenarijų PASS/FAIL ir advisors santrauką be paslapčių. Tik jei visa matrica PASS, galima keisti verdictą į **STAGE 4.3 BACKEND READY FOR PRODUCTION MIGRATION REVIEW**. Tai vis tiek nėra leidimas migruoti production. Po vėlesnio patvirtinto deploy manual production QA atliks Paulius.
