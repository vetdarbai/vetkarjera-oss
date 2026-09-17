# Stage 4.3 — Ubuntu WSL2 staging QA ataskaita

2026-09-17. **STAGE 4.3 BACKEND READY FOR PRODUCTION MIGRATION REVIEW**

Tai techninio staging pasirengimo verdictas. Production migracija, main push ir deploy neatlikti ir neautorizuoti. CEO CONSULT turi peržiūrėti šio report commit ir migracijų pataisas. Produkto etapas production aplinkoje dar neuždaromas.

## 1. Storage ir Windows pakeitimai

Pasirinktas D: diskas. Prieš Ubuntu diegimą buvo 241 846 194 176 baitų (~241,85 GB / 225,24 GiB) laisvos vietos; po QA — 230 923 075 584 baitai (~230,92 GB / 215,06 GiB).

| Turinys | Vieta |
| --- | --- |
| Ubuntu WSL2 distribucija | `VetKarjera-Stage43` |
| Fizinis Ubuntu diskas | `D:\VetKarjera-Staging\ubuntu\ext4.vhdx` |
| Docker duomenys | `/var/lib/docker` tame pačiame VHDX |
| Docker containerd images / snapshots | `/var/lib/containerd` tame pačiame VHDX |
| Supabase PostgreSQL ir kiti volumes | `/var/lib/docker/volumes/` tame pačiame VHDX; tikslūs mount keliai — runtime-evidence.json |
| Linux repo/test kopija | `/opt/vetkarjera-stage43` tame pačiame VHDX |
| Windows review checkout | `D:\VetKarjera-Staging\workspace\backend` |
| Aplinkos paruošimo failai | `D:\VetKarjera-Staging\setup` |

Ubuntu įdiegta oficialiu `wsl --install -d Ubuntu-24.04 --name VetKarjera-Stage43 --location D:\VetKarjera-Staging\ubuntu --no-launch --web-download` būdu. Jokio distro perkėlimo hack, registry redagavimo, disko formatavimo ar partition pakeitimo. Windows WSL sistemos komponentai lieka C:, dideli Docker / Supabase duomenys yra D:.

Anksčiau įjungtos WSL ir VirtualMachinePlatform funkcijos bei vartotojo atliktas restart panaudoti; naujo Windows restart nereikėjo. Ubuntu systemd buvo įjungtas pagal distribucijos nustatymus. Docker Engine įdiegtas iš oficialaus pasirašyto apt šaltinio. Podman duomenys nepanaikinti, jo staging mašina sustabdyta.

## 2. Faktinės versijos ir ryšys

| Komponentas | Versija |
| --- | --- |
| WSL | 2.7.13.0 |
| WSL Linux kernel | 6.18.33.2-microsoft-standard-WSL2 |
| Ubuntu | 24.04.5 LTS, Noble |
| Docker Engine / CLI | 29.8.1 |
| containerd | 2.3.5 |
| Node.js | 22.23.2; oficialus archyvas patikrintas SHA-256 |
| Supabase CLI | 2.117.0, repo prisegta priklausomybė |
| PostgreSQL | SQL `server_version = 17.6`; image 17.6.1.167 |
| GoTrue | v2.196.0, health ir runtime version |
| PostgREST | 16.2, runtime version |
| Mailpit | 1.30.2 |
| Ankstesnis Podman | 5.8.3, šiam QA nenaudotas |

Docker version/info, hello-world ir HTTP konteinerio prieiga iš Ubuntu: PASS. Tiesioginis PostgreSQL TCP, GoTrue health, PostgREST ir Mailpit iš tos pačios Ubuntu: PASS.

Dedikuotas bridge `vetkarjera-stage43-local` nustatytas į localhost. Faktinės paskelbtos DB/API/Studio/Mailpit sąsajos visos `127.0.0.1` (54322/54321/54323/54324). Kitų servisų prievadai tik konteinerių tinkle. Viešo tunelio ar Windows port forwarding nėra.

**Ankstesnė Windows → Podman localhost kliūtis naujame Linux QA kelyje pašalinta.** Tai ne teiginys, kad pataisytas pats Podman. Ubuntu tarp neaktyvių komandų WSL gali sustabdyti, todėl QA metu laikyta atvira WSL sesija; pakartotiniam testavimui palikti atvirą Ubuntu terminalą.

## 3. Visa staging matrica

Žemiau galutiniai rezultatai po pataisų. Clean vykdyklėje 15 scenarijų grupių, upgrade vykdyklėje 18; abi baigėsi be FAIL. Detalūs mašininiu būdu gauti rezultatai — `docs/qa/stage4_3/staging-clean.json` ir `staging-upgrade.json`.

| Reikalavimas | Rezultatas / įrodymas |
| --- | --- |
| PostgreSQL 17 | PASS — faktinis SQL 17.6 |
| Clean migration chain | PASS — visos keturios migracijos ir jų istorija |
| Stage 3 → Stage 4.3 | PASS — šešios legacy specialist/employer paskyros ir papildomas trusted admin; credentials, UUID, esamos sesijos, organization membership ir job išlieka |
| GoTrue signup/login/session | PASS — realūs signup, Mailpit patvirtinimas, login, refresh, tikras serverio session helper |
| V2 specialist signup | PASS — tikras backend veiksmas → GoTrue → trigger → teisingos capabilities |
| V2 employer signup | PASS — tas pats realus kelias employer kontraktui |
| Specialist → employer | PASS — vienas account UUID, papildomas profilis, idempotence, neperrašomi pradiniai duomenys |
| Employer → specialist | PASS — abu capabilities, naujos Auth paskyros nekuriamos |
| account_capabilities | PASS — DB būseną atitinkantys flags, metadata admin escalation atmetama |
| Real PostgREST RLS | PASS — owner, foreign, anon, trusted admin, filters/count ir FK embedding; private schema neeksponuojama |
| Anon/authenticated access | PASS — svetimų CV ir visų specialist child lentelių eilučių negrąžina; tiesioginiai neleistini write neveikia |
| License privacy/revision | PASS — owner/admin, foreign/anon deny, identiškas numeris nekeičia review, naujas revision pending, stale/self-review deny |
| STEP 2 | PASS — required animal/activity groups, missing/empty deny, atomika ir 50 % / bendras 70 % |
| STEP 3/completeness | PASS — profesijų katalogai, autonomy apribojimai, other 0–5 → 0/10/20/30/30/30 %, šeštas deny, role history išlieka |
| Revoked/expired session | PASS — tikras GoTrue global logout ir DB session not_after expiry uždaro RPC bei row reads; senas access token nesuteikia prieigos |
| Two-connection concurrency | PASS — skirtingi pg_backend_pid, realus Lock wait; konkuruojant antram profiliui laimi pirmas įrašas; pasenęs license review grąžina 40001 |
| Migration cutover/lock | PASS — 5 s 55P03 ir pilnas rollback; tikras GoTrue signup laukia už migracijos, po jos gauna teisingą profilį |
| Security advisor | PASS — 0 ERROR / WARN; 1 paaiškintas INFO |
| Performance advisor | PASS — 0 ERROR / WARN; tik unused_index INFO |
| Laikinos migracijos teisės | PASS — po commit writer neturi schema CREATE, migrator neturi writer SET/INHERIT, API rolės nėra writer nariai |

Galiojimo pabaigos scenarijus naudoja tikrą `auth.sessions.not_after`, o ne valandos laukimą iki JWT exp. Tai tikrina sutartą aktyvios sesijos DB kontrolę. Visi account duomenys ir laiškai sintetiniai; jokio production SMTP ar naudotojo paskyros.

## 4. Rastos klaidos ir skirtumai nuo PGlite

**Pradinė PostgreSQL 17 grandinė be korekcijų NEPRAĖJO.** Rastos ir ištaisytos dvi realaus Supabase teisių modelio problemos:

1. `ALTER FUNCTION ... OWNER` negalėjo perduoti nuosavybės writer rolei: tikras Supabase `postgres` nėra superuser. Pridėtos tik transakcijos metu reikalingos SET/INHERIT ir private CREATE teisės; prieš commit panaikinamos. Antroje migracijoje laikinai įjungiama INHERIT funkcijų perrašymui.
2. `postgres` negali suteikti writer rolei USAGE platformos `auth` schemoje. Šis grant pašalintas. `private.require_active()` lieka SECURITY INVOKER, pasiima tą patį patikimą request JWT subject kaip realus `auth.uid()` ir privalomai tikrina `private.has_active_session()`; naujų security-definer privilegijų ar BYPASSRLS nepridėta.

Ankstesni PGlite testai veikė su superuser ir supaprastinta Auth schema, todėl šių platformos leidimų skirtumų neaptiko. PGlite `auth.uid()` fixture sulyginta su tikra Supabase funkcija. Produkto duomenų kontraktai, UI ir profilių taisyklės nepakeisti.

Taip pat patikslintas naujo STEP 3 staging testo paruošimas: pilnas autonomy-only save teisėtai išvalo to paties vaidmens development selections, todėl istorijos fixture reikia išsaugoti po šių operacijų. Tipų generatoriuje CRLF/LF skirtumas nebevertinamas kaip schemos drift.

Pataisyti tik dar production NETAIKYTI abu Stage 4.3 review migracijų failai. Nauja vėlesnė migracija negalėtų ištaisyti ankstesnio failo sustojimo. Stage 2 / Stage 3 istorijos failai nepakeisti. Ankstesnis 0530acc paketas turi būti pakeistas šio report commit review paketu.

## 5. Oficialūs advisors

CLI `db advisors --local --type all --level info --fail-on error` paleistas po clean ir po upgrade.

- Security: 0 ERROR, 0 WARN. Vienas INFO `rls_enabled_no_policy` dėl `private.account_admins`: tyčinis default-deny. API neturi table grants; trusted admin tikrina privati ribota funkcija. Savo nuožiūra public policy nepridėta.
- Performance: 0 ERROR, 0 WARN. Clean 31, upgrade 30 `unused_index` INFO. Šviežios mažos testinės DB statistika nėra pagrindas trinti FK / filtravimo indeksus. Ateities production darbo krūvio greitaveika šiuo testu negarantuojama.
- Papildomas repo SQL auditas: visos 7 kategorijos PASS (RLS, public definer, anon execute, search_path, private grants, private fields, FK indeksai).

## 6. Kodo QA ir saugumas

- Lint: PASS.
- TypeScript: PASS.
- Next.js build: PASS, tik su sintetinėmis public Supabase reikšmėmis.
- 35 auth + 25 profile action/session/registration + 166 PGlite assertions: PASS.
- Po SQL ir fixture pataisų pakartotinai 166 DB assertions, tipų patikra (39 lentelės / 11 RPC) ir 7 audito kategorijos: PASS.
- Realus staging: 15 clean + 18 upgrade grupių PASS.
- Stage 4.3 runtime testai naudoja anon/publishable raktą ir tikrus user JWT, o privilegijuotoms sintetinėms fixtures — tik vietinį postgres. Production raktų ir service_role nenaudota.
- Testų HTTP transportas blokuoja viską, išskyrus localhost 54321/54324; vykdyklė atsisako linked projekto. `.env` neskaitoma. `.staging-results` ignoruojama Git; į review perkelti tik sanitizuoti rezultatai, be raktų, tokenų, laiškų ar paskyrų duomenų.

## 7. Production planas ir likę veiksmai

Migracijos vykdymo seka galioja su pataisytais SQL failais ir atnaujintu `STAGE4_3_PRODUCTION_MIGRATION_PLAN.md`. Lieka CEO CONSULT peržiūra, tikro production vykdytojo teisių / istorijos / atsarginės kopijos preflight bei atskiras Pauliaus leidimas. Tai nėra neatlikti staging testai ar leidimas vykdyti production.

Šiame darbe nieko nepushinta į main, production DB neliesta, mokami resursai nekurti, UI nekeista, Stage 5+ nepradėtas. Būsimo production deploy manual QA pagal nuolatinę proceso taisyklę atlieka Paulius.

**STAGE 4.3 BACKEND READY FOR PRODUCTION MIGRATION REVIEW**