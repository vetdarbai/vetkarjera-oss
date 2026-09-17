# Stage 4.3 — izoliuotos Supabase aplinkos planas

2026-09-17. **Patvirtinta alternatyva: Ubuntu WSL2 + Docker Engine. Faktiniai QA rezultatai pateikiami atskiroje staging ataskaitoje; šis dokumentas aprašo procedūrą.**

## Patvirtinta aplinka ir ribos

Paulius patvirtino Ubuntu WSL2 + Docker Engine vietoje Podman, visą QA vykdant Linux viduje. Podman Windows localhost ryšio bandymai buvo nesėkmingi; jo duomenys paliekami nepakeisti.

- WSL distribucija `VetKarjera-Stage43`, Ubuntu 24.04 LTS. Oficialus `wsl --install --location` virtualų diską sukūrė `D:\VetKarjera-Staging\ubuntu\ext4.vhdx`.
- Docker Engine įdiegtas iš oficialaus pasirašyto Docker Ubuntu apt šaltinio. `/var/lib/docker`, `/var/lib/containerd` ir volumes fiziškai yra D: VHDX.
- Linux testų kopija `/opt/vetkarjera-stage43`. Nekopijuoti `.env`, produkcijos raktų, Windows `node_modules` ar `.next`.
- Supabase CLI 2.117.0 prisegtas package-lock. `SUPABASE_TELEMETRY_DISABLED=1`; projekto ID `vetkarjera-stage4-3-isolated`. Nenaudoti `supabase link`, `--linked`, production DB ar debesijos projekto.
- Dedikuotas Docker bridge `vetkarjera-stage43-local` turi `com.docker.network.bridge.host_binding_ipv4=127.0.0.1`; CLI start naudoja `--network-id vetkarjera-stage43-local`. Patikrinti faktines visų konteinerių portų sąsajas.
- Jokio Windows restart automatiškai. Jei būtinas Windows restart ar rizikingas sistemos pakeitimas, sustoti ir informuoti Paulių. Jokio main push, production migracijos, UI ar Stage 5+ darbo.

## Paruošimo seka

1. Patikrinti WSL2 versiją, distro vietą D:, laisvą fizinę D: vietą (Linux virtualaus disko talpa nėra reali laisva host vieta) ir `systemd` / Docker būseną.
2. Patikrinti `docker version`, `docker info` ir tik Ubuntu viduje pasiekiamą HTTP konteinerį su localhost binding. Nekeisti Windows port forwarding ar DNS.
3. Linux kopijoje `npm ci`; be production `.env`. `node node_modules/supabase/dist/supabase.js --version` ir komandų `--help`.
4. Paleisti `start --network-id vetkarjera-stage43-local --exclude realtime,storage-api,imgproxy,edge-runtime,logflare,vector,supavisor`. Reikalingi PostgreSQL, GoTrue, PostgREST, Kong, Mailpit ir advisor pagalbiniai servisai. Startup / status išvestis gali turėti tik vietinių raktų — neskelbti jos ir necommitinti `.staging-results/`.
5. Prieš backend QA iš tos pačios Ubuntu patikrinti SQL `SHOW server_version` (17.x), API 54321, DB 54322 ir Mailpit 54324. Privatūs schema duomenys neeksponuojami per REST.
6. Visi laiškai surenkami vietiniame Mailpit, be Resend. Testų skriptas blokuoja ne localhost HTTP užklausas ir atsisako veikti susietame projekte.

Šaltiniai: [WSL oficialios komandos](https://learn.microsoft.com/en-us/windows/wsl/basic-commands), [Docker Ubuntu diegimas](https://docs.docker.com/engine/install/ubuntu/), [Docker bridge binding](https://docs.docker.com/engine/network/drivers/bridge/), [Supabase local development](https://supabase.com/docs/guides/local-development/cli/getting-started).

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
