# Stage 5.3 employer backend — local implementation review

HANDOFF ID: VK-STAGE5-3-LOCAL-QA-BLOCKER-20261009
FROM: Backend Developer
TO: CEO CONSULT
STATUS: BLOCKED — Stage4 Storage anon read-guard compatibility approval required.

Authorization: VK-STAGE5-3-LOCAL-IMPLEMENTATION-QA-AUTHORIZATION-20261009.
Source of truth: approved canonical Stage5.2 architecture, VK-STAGE5-2-ARCHITECTURE-TYPE-LOCK-APPLIED-20261009, plus final Stage5.1 Product Lock.
Workspace: D:\VetKarjera-Staging\workspace\frontend-stage4-7.
Feature branch: codex/stage5-employer-backend.
Reviewed starting HEAD: c439b89b37001e7d7bc3dbecbc7dfb36be6dfe09.
This report is included in the local implementation checkpoint; its final SHA is provided in the accompanying CEO handoff. It is not a rollout-ready release.

## Implemented contract

- STEP1=20; STEP2=50 only when STEP1 is complete; required70 publishes ACTIVE regardless of verification. Optional description10/logo5/cover5/current type5/benefit5; max100. Website/contacts/social/employee size0. Missing required fields return draft/private; suspended/archived never auto-resume.
- Exactly14 primary types,26 attribute groups,143 options. Locked AND rules for clinic/farm/pharmacy, other with nonempty current text, remaining matrix and revision isolation. SQL catalog codes/labels match JSON. Original specialist catalog JSON remains unchanged.
- Multi-city draft/save/remove/reload, normalized duplicate prevention, standard/custom benefits (max10 custom), partial saves and server-derived capabilities/state/score.
- Private legal identity/current representative/verification evidence and audit. Identity verification permanently locks direct legal editing; revision-checked legal change requests. Approved review actor snapshots preserve provenance after deletion of a non-owning account. No public verification badge.
- Live-session membership ownership, deferred exactly-one-owner invariant, V1 one organization/account, atomic transfer/cancel/decline/expiry. New owner remains read-only until representation PASS. Current owning account cannot be deleted; pending target deletion cancels pending transfer. Admin review/fallback backend preparation only; no admin UI or production promotion.
- Stable UUID, Lithuanian slug generation/collision/history, old308 only for currently public organization. Public GET /darbdaviai/<slug> and /api/organizacijos/slug/<slug> return backend JSON; no employer page UI/directory was implemented. Empty optional sections and private PII are omitted from public DTO.
- Private organization-profile-media bucket, versioned immutable logo/cover paths, current-key RLS, no direct client writes. Server validates/compresses single-frame JPEG/PNG/WebP; bounded input/output; no-store reads; successful PUT returns new authoritative src/version; exact-path failure compensation and obsolete-object cleanup. Existing server-only Storage key mechanism reused, no new credentials.
- Narrow NOLOGIN/NOSUPERUSER/NOCREATEROLE/NOCREATEDB/NOREPLICATION/NOBYPASSRLS/NOINHERIT writer/reader roles; final postgres membership has no SET/INHERIT; API roles are not members; private CREATE removed. All new tables RLS, explicit grants, private qualified helpers, public invoker wrappers. Jobs FK/workflows and all previous migration files remain unchanged.

## Changed files

Created migration: supabase/migrations/20261009134719_stage5_employer_foundation.sql.
Raw local file SHA-256: 171469a9c92213a14f6b9ee62df9cc90b91b5627823911b7250f4247e60d9913 (Git checkout newline normalization can change byte hashes; executor must compare the actual execution artifact).
One atomic migration, lock_timeout5s, empty reviewed organizations/memberships baseline required; no fabricated organization backfill.

Created: lib/organizations/{catalogs.json,contracts.ts,server.ts,media.ts}; app/api/organizacijos/[id]/media/[kind]/route.ts; app/api/organizacijos/slug/[slug]/route.ts; app/darbdaviai/[slug]/route.ts.
Created QA: scripts/{organization-cases.cjs,organization-concurrency.cjs,organization-native-db.cjs,test-organizations-db.cjs,test-organization-media.cjs}.
Modified: scripts/{profile-test-db.cjs,generate-profile-types.cjs,audit-profile-db.cjs}, types/database.ts, package.json.
Generated types:50 public tables/42 public RPCs, including invoker projection view and default-null optional arguments.
QA fixture now applies original Stage4 Storage policies instead of skipping them; anonymous RPC audit allows only3 reviewed public-read RPCs. New test:organizations/* scripts expose Stage5 tests separately; existing npm test is Stage4 regression suite, not a substitute for Stage5 media QA.

## Final local QA

| Check | Result |
|---|---|
| Native PostgreSQL17.11 clean8-migration chain | PASS,229 assertions |
| Native7→8 upgrade, synthetic16 Auth/profiles,13 specialist/3 employer | PASS,234 assertions; full original row/ID snapshots unchanged |
| Two actual DB connections, concurrent edit stale40001 | PASS |
| Cutover lock timeout55P03 | PASS, whole transaction/history/new-role rollback; local test releases lock then applies normally |
| PGlite organization behavior/catalogs | PASS,205 assertions (embedded PG18.3; native17 tests are compatibility evidence) |
| All14 positive/negative type rules, legal/ownership/security/invariants | PASS within native/embedded suites |
| Actual Next media handlers+sharp+SQL RLS |122 assertions; BLOCKED for anon public read; owner replacement/delete/validation/compensation pass |
| Candidate Stage4 role split | PASS only in rolled-back synthetic transaction; NOT in migration |
| Stage4 Auth/actions/errors/replacement/profiles/alignment regression | PASS,35/33/17/32/168/280 assertions respectively |
| lint/typecheck/Next15.5.24 build | PASS |
| Generated types consistency/SQL security audit | PASS |
| Supabase CLI2.117.0 local DB advisors | ERROR0/WARN0;49 INFO (48 unused-index + existing private.account_admins RLS/no-policy) |
| Production/manual/browser QA | NOT RUN; not authorized |

Advisor initially identified one new auth_rls_initplan WARN in org_shell_bootstrap. Changed only new policy to user_id=(select auth.uid()); both final native suites assert exit0 AND no ERROR/WARN. Prior incorrect interim claim of no WARN was corrected.
Local implementation failures found during testing (trigger branching, LT case normalization, optional generated argument types, FK-null approved-history preservation) were corrected before these final runs. The remaining anon Storage failure is intentionally retained as a failing gate, not treated as an expected full PASS.

Test limitations: native PostgreSQL17.11 is real SQL/RLS/concurrency, but Auth/Storage schemas are explicit synthetic SQL fixtures. Next route/Sharp tests run actual handlers with a Storage byte-transport fixture and forbidden external fetch. No live GoTrue/PostgREST/Storage HTTP stack was started, no new Docker/WSL recovery attempt. Immediate refresh is proven by newly returned immutable URL and its current bytes; no employer UI exists to claim browser repaint E2E. Historical production PG17.6 is not an exact-minor native test.

Evidence: ignored .staging-results/stage5-{native,native-clean,pglite,media}.json. Protected native data/logs remain under D:\VetKarjera-Staging\qa-private\stage5-native-1791557290019 (upgrade) and stage5-native-1791557271329 (clean), loopback-only, random synthetic SCRAM credentials, current-user DACL, servers stopped. Existing recovery artifacts/tooling preserved.

## Blocker and smallest safe proposal — NOT applied

Stage4 specialist_photo_read_guard is restrictive SELECT TO anon,authenticated and invokes private.can_read_specialist_photo(name). That invoker helper has EXECUTE only for authenticated. PostgreSQL privilege validation therefore rejects anon SELECT on organization-profile-media too, even when bucket condition would logically bypass the specialist helper. Public organization logo/cover GET returns503; expected200. Public profile JSON itself works.

Architecture section17 forbids rewriting existing Stage4 RLS. Stop only this compatibility part. No helper EXECUTE/private-schema grant expansion, public bucket, signed URL or service-role read workaround.

Proposed CEO-approved amendment in the NEW, UNAPPLIED Stage5 migration (do not edit historical SQL):

```sql
ALTER POLICY specialist_photo_read_guard ON storage.objects TO authenticated;
CREATE POLICY specialist_photo_anon_read_guard ON storage.objects
AS RESTRICTIVE FOR SELECT TO anon
USING (bucket_id <> 'specialist-profile-photos');
```

Original authenticated predicate remains identical. Anon specialist access is denied without invoking the private helper; active current organization-media read is still constrained by new Stage5 policies. Candidate tested in rolled-back LOCAL transaction: anon logo/cover read200, anon specialist rows invisible. No product/production change applied. Scope: two policy statements in new migration + affected anon/owner/foreign/admin media and Stage4 photo regression checks; estimate1–2h, no new infrastructure. This is a real existing-RLS compatibility amendment, requiring CEO decision; not a new product rule.

## Proposed production sequence — authorization still required

1. CEO decides compatibility amendment; implement locally only if approved; rerun affected media/privacy/SQL/advisor/upgrade checks and issue updated release SHA/hash with no blocked test.
2. Separate production preflight authorization: refresh target pirezwaggwlfhwmdzisu, actual Git/deployment SHA, current PG version/executor privileges, expected7 history, Auth/profiles/capabilities/counts/IDs, organizations/memberships/jobs baseline, roles/default ACL/RLS/functions/triggers, bucket/runtime/current objects. Historical2026-10-08 baseline was16/16,13+3, organizations/memberships/jobs/admin0; it is NOT fresh. Unexpected existing organizations/memberships abort migration and require mapping review; do not silently invent backfill.
3. Separately authorized simplified safety gate: fresh read-only DB backup + private Storage bytes/metadata/path/version/hash inventory and manifest; validate nonempty archive/integrity. Apply approved photo quiescence operational rules if capturing existing photos. Full DR rehearsal remains DEFERRED, not claimed PASS.
4. Separately authorized APPLY: only reviewed20261009134719_stage5_employer_foundation.sql in existing checked postgres executor model; record eighth history entry atomically. On failure rollback and STOP. No SQL workaround.
5. Read-only DB post-verification: data/IDs, catalogs, state/score/ownership constraints, RLS/grants/roles/functions/triggers, private fields/current-media policies and advisors. No production synthetic org/user/admin creation.
6. Only with separate main-push/deploy approval: push reviewed Stage5 commits, deploy existing paulius1/vetkarjera project. No new infrastructure/project. Technical smoke Auth/session/existing specialist/employer shell, expectedRPC/schema/permission/logs; public/read/write organization scenarios require authorized test data/user flows.
7. Paulius manual production QA after rollout/frontend integration: required20/50→70 activation, optional100, type rules/Other, multicity, privacy, legal locks/transfers/read-only successor, logo/cover immediate replacement/reload/delete/reupload, public slug308, mobile/desktop, Stage4 photo/notice_period/session. Blockers fixed before closure; no automatic scope growth.

Rollback: migration SQL failure is transaction rollback+STOP. Deployment failure keeps/reverts last verified Stage4 release while assessing additive DB compatibility. Postdeploy critical FAIL stops rollout and proposes verified prior app release; no automatic destructive down. New Stage5 durable data must be preserved. DB or Storage restore only under separate incident authorization with point-in-time loss bounds and complete bytes+metadata; backups are not a reason for automatic restore. Never repeat historical migrations or modify Jobs FK.

## Decision and next step

BLOCKED — Stage4 Storage anon read-guard compatibility approval required.
CEO CONSULT must approve or reject only the described role-scoped policy amendment. After approval Backend Developer applies it locally, updates failed media assertions to expected200, reruns affected privacy/regression/advisor/upgrade QA, and submits a new rollout-ready handoff. No Stage7 UI/Stage8 Jobs/Applications added. No unrelated feature.

Production unchanged. No production connection or production credentials used in this work. No freeze/backup/production migration/main push/deploy. Full recovery rehearsal remains deferred.
