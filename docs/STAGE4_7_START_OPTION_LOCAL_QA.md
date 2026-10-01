# READY TO COPY TO CEO CONSULT
# Stage 4.7 start option — local implementation and QA

Data: 2026-10-01. Verdict: **STAGE 4.7 START OPTION LOCAL QA PASS**.

## Catalog change

One new row, created in a new CLI-generated migration:
`supabase/migrations/20261001091441_stage4_7_start_option_notice_period.sql`.

**`notice_period` → „Po įspėjimo termino (20 kalendorinių dienų)“**

- Existing convention: English snake_case (immediately, two_weeks, one_month, two_three_months, specific_date). No new naming system.
- New row: sort_order=6, is_active=true. Appended after the existing five rows; their codes, labels, sort_order and active flags are unchanged.
- SQL is one INSERT inside BEGIN/COMMIT. No schema, function, policy, grant or trigger changes. Existing migration files unchanged.
- Question remains exactly „Kada galėtumėte pradėti?“.
- Stage 4.7 already reads active public.start_options ordered by sort_order. No component/app logic or frontend alias change was needed for this addition.

## JSON / types / permission impact

- lib/profiles/catalogs.json: one [code, label] entry added; start_options has six entries instead of five. Other catalogs unchanged.
- Generated types unchanged: start_option_code and catalog code are existing text/string fields, not enums. Generated types check PASS (39 public tables, 11 RPCs).
- Existing start_option_code FK remains in force. Invalid code still raises SQL 23503; no orphan references after migration or RPC saves.
- Upgrade compared function definitions/owners/ACLs, RLS flags/policies, relation grants, default ACLs, triggers, constraints and role memberships before/after. Exact equivalence PASS.
- RPC semantics and signatures, RLS, grants, writer role and catalog access model unchanged. Existing active-catalog RPC validation accepts the new code without a code change.

## Environment / clean and upgrade QA

Only the already approved, unlinked local Supabase stack was used:
- WSL VetKarjera-Stage43, physical storage on D:.
- QA copy /opt/vetkarjera-stage47-start-option; existing dependencies reused.
- config project_id vetkarjera-stage4-3-isolated; no .temp/project-ref and no hosted DB URL/production secrets.
- PostgreSQL **17.6**, Supabase CLI **2.117.0**, Next **15.5.24**. No version upgrades/installations.
- Existing bridge vetkarjera-stage43-local retained. DB/API bound to 127.0.0.1:54322/54321; frontend/proxy 127.0.0.1:4345/4355.
- Only synthetic example.test QA accounts; no production account/profile/photo data.

Clean migration: PASS, seven-file chain from zero; 17 targeted real PostgreSQL assertions.

Upgrade: PASS, reset to the six reviewed production migrations through 20260930060437, populate existing profiles using all five old choices, then apply only the new migration. 20 targeted assertions; existing profile rows and security/function metadata unchanged.

Expected local final migration history:
1. 20260905075153_stage2_backend_foundation
2. 20260908142249_stage3_auth_accounts
3. 20260915162557_stage4_3_profiles
4. 20260915210103_stage4_3_product_contract_fixes
5. 20260930060436_stage4_draft_readiness_alignment
6. 20260930060437_stage4_specialist_photo_access
7. 20261001091441_stage4_7_start_option_notice_period

Local QA note: the initial reset omitted the pre-existing documented network flag and recreated the DB on the CLI default network, causing a local Storage startup/DNS failure. Retried the documented reset with --network-id vetkarjera-stage43-local and kept an Ubuntu terminal open as required by the existing QA procedure. Final clean and upgrade succeeded. No new network workaround, package/Windows setting or infrastructure design was introduced. Private startup/reset diagnostics are excluded from Git/public evidence.

## Required behavior / regression

- Catalog has six distinct codes and sort positions; exact LT label active: PASS.
- All five previous catalog rows byte-for-value unchanged: PASS.
- Anonymous catalog SELECT through real PostgREST: PASS under existing policy.
- Existing authenticated RPC saves all five old codes, notice_period and null; independent DB connection reads the committed choice: PASS.
- Real optimized Next frontend + HTTP cookies/Auth/PostgREST + headless Chrome: select notice_period → save → DB reference notice_period → reload retains selection → overview renders exact LT label: PASS.
- Existing one_month workflow still succeeds in the same UI matrix. Question unchanged.
- Local screenshot proof: .staging-results/start-option-selected-desktop.png and start-option-overview-desktop.png; visually inspected overview contains the exact label.
- Full relevant Stage 4.7 UI regression: **197 assertions PASS**, including responsive 390/768/1440, partial saves, error/retry, license, photo and auth/session scenarios.

## Technical QA

| Check | Result |
| --- | --- |
| Clean PG17 chain / catalog | PASS — 17 assertions |
| Six-migration baseline → new catalog migration | PASS — 20 assertions |
| Catalog uniqueness / FK integrity / old values | PASS |
| lint | PASS — no lint violations |
| typecheck | PASS |
| npm test | PASS — 35 Auth, 33 profile actions/session, 166 DB/PGlite, 280 alignment/PGlite |
| Generated types check | PASS — unchanged, 39 tables / 11 RPCs |
| DB security audit | PASS — all seven rules |
| Real local Auth/PostgREST/RLS/Storage regression | PASS — 379 assertions |
| Profile view/PATCH tests | PASS — 49 assertions |
| Photo SDK/error/DELETE regression | PASS — 17 assertions |
| Optimized build | PASS |
| Client bundle/security boundary audit | PASS — 68 assertions / 51 assets; local privileged key absent |
| Browser select/save/reload/overview + regression | PASS — 197 assertions |
| Source copy comparison | PASS — 119 source/test/migration files, normalized line endings |

Only nonfatal existing-style tool notices: next lint deprecation and webpack large-cache-string performance messages. No new dependency/security-policy remediation.

## Changed files in this catalog commit

1. supabase/migrations/20261001091441_stage4_7_start_option_notice_period.sql
2. lib/profiles/catalogs.json
3. scripts/test-start-option-local.cjs
4. scripts/test-profile-ui.cjs
5. scripts/test-profiles-db.cjs
6. scripts/test-alignment-local.cjs
7. docs/STAGE4_7_START_OPTION_LOCAL_QA.md

Stage 4.3 DB regression deliberately retains its original RPC semantics, so it applies only this later data-only row before comparing the current catalog fixture. The real full-chain clean/upgrade runs separately verify the current schema.

The preceding frontend/manual-QA commit ee8b60fbaf876c821868765e2f124a11600c2aac is unchanged; the new local catalog commit is its descendant on codex/stage4-7-manual-qa. The final catalog commit SHA is recorded in the outside-Git CEO copy and final handoff (a committed document cannot include its own Git hash).

Public QA evidence: ignored .staging-results/start-option/ (clean/upgrade/core/build/test results), profile-ui.json and the two screenshots. Env files, TLS private keys, session files, local keys and private CLI reset logs are not committed or included in the CEO copy.

## Reproduction

Run only in the existing unlinked synthetic local stack, with an Ubuntu terminal open:

```bash
node node_modules/supabase/dist/supabase.js db reset --local --no-seed --network-id vetkarjera-stage43-local
node scripts/test-start-option-local.cjs clean
node node_modules/supabase/dist/supabase.js db reset --local --version 20260930060437 --no-seed --network-id vetkarjera-stage43-local
node scripts/test-start-option-local.cjs upgrade
node scripts/test-alignment-local.cjs clean
npm run lint
npm run typecheck
npm test
node scripts/run-profile-local.cjs build
node scripts/audit-profile-ui.cjs
```

The existing UI harness runs against that local optimized app using the documented launcher, its local CA and a separate headless Chrome context. No hosted target or real user browser state is used.

CLI migration creation follows [official Supabase CLI documentation](https://supabase.com/docs/reference/cli/supabase-migration-new); the installed CLI --help was checked. Existing pinned CLI/dependency versions retained.

## Exact next step

CEO CONSULT reviews this minimal migration, catalog diff, local commit and QA. Request a separate explicit authorization for the production catalog migration and any main push/deployment of the Stage 4.7 candidate. None is authorized by this local PASS. After an approved future deployment Paulius performs manual production QA; this report does not claim production behavior verification or final manual-QA sign-off. No implementation beyond the single catalog row is needed or proposed here.

STAGE 4.7 START OPTION LOCAL QA PASS

Production unchanged.
No production migration executed.
No main push.
No production deploy.
Stage 5 NOT started.
